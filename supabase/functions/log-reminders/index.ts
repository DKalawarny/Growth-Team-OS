/**
 * log-reminders — nudge the crew to write their daily log, on the days they work.
 *
 * Called once a day by pg_cron (see migration 043). Not reachable from a
 * browser: it requires the shared secret held in internal_secrets, which has
 * RLS on and no policies, so anon and authenticated cannot read it at all.
 *
 * ⚠️ WHAT IT DOES NOT DO. It does not create anything, decide anything, or
 * write to daily_logs. It sends a link. If it fails silently for a week the
 * worst case is that nobody was reminded — the link still works, and the form
 * is still there. That is the right blast radius for something running
 * unattended on a schedule.
 *
 * ⚠️ It skips anyone who has already written today. Being reminded to do a
 * thing you have just done is how people learn to ignore reminders.
 */

import { json, preflight } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { signStaffToken } from '../_shared/staff_token.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const admin = serviceClient()

  // ── Auth: the shared secret, and nothing else ─────────────────────────────
  const given = req.headers.get('x-reminder-secret') ?? ''
  const { data: secretRow } = await admin
    .from('internal_secrets').select('value').eq('key', 'log_reminder').maybeSingle()
  const expected = (secretRow as { value: string } | null)?.value ?? ''
  if (!expected || given !== expected) return json({ error: 'no' }, 401)

  // The cron now runs HOURLY (migration 080). Each crew member has their own
  // local send hour (log_hour) and their company a timezone, so a night crew
  // can be nudged at a different time than the day crew. We send to someone
  // only in the hour that matches their chosen time in their company's zone.
  const now = new Date()
  const WD: Record<string, number> = { Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const localParts = (tz: string): { isoDay: number; hour: number; ymd: string } | null => {
    try {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' })
          .formatToParts(now).map(x => [x.type, x.value]),
      ) as Record<string, string>
      let hour = parseInt(parts.hour, 10); if (hour === 24) hour = 0
      return { isoDay: WD[parts.weekday] ?? 0, hour, ymd: `${parts.year}-${parts.month}-${parts.day}` }
    } catch { return null }
  }

  const { data: staff, error: staffErr } = await admin
    .from('staff_members')
    .select('id, name, email, company_id, log_days, log_hour, log_enabled')
    .eq('log_enabled', true)
    .not('email', 'is', null)
  if (staffErr) return json({ error: staffErr.message }, 500)

  // Timezone per company (default Mountain), to turn each log_hour into a moment.
  const tzCompanyIds = [...new Set((staff ?? []).map(s => (s as { company_id: string }).company_id))]
  const { data: cos } = await admin.from('companies').select('id, timezone').in('id', tzCompanyIds)
  const tzFor = (cid: string) => ((cos ?? []) as Array<{ id: string; timezone: string | null }>).find(c => c.id === cid)?.timezone || 'America/Edmonton' 

  /**
   * 🔴 5 Oct: six reminders a day were going to the demo crew
   * (`@bridgewatermech.example`) and bouncing. Resend watches the bounce rate
   * across the WHOLE account — kinwove's and Unstuck Map's mail included — and
   * pauses accounts that bounce too much. Reserved test domains can never
   * receive mail, so they are never sent to.
   */
  const undeliverable = (e: string) =>
    /@([^@]+\.)?(example|test|invalid|localhost)$/i.test(e.trim()) ||
    /@example\.(com|net|org)$/i.test(e.trim())

  // Due = scheduled for this local weekday AND this local hour is their send time.
  const due = (staff ?? []).filter(s => {
    const row = s as { email?: string; log_days?: number[]; log_hour?: number; company_id: string }
    if (undeliverable(String(row.email ?? ''))) return false
    if (!Array.isArray(row.log_days)) return false
    const lp = localParts(tzFor(row.company_id))
    if (!lp) return false
    return row.log_days.includes(lp.isoDay) && (row.log_hour ?? 16) === lp.hour
  })

  if (!due.length) return json({ ok: true, sent: 0, reason: 'nobody scheduled this hour' })

  // ⚠️ Skip anyone who already wrote on their own LOCAL date.
  const dueIds = (due as Array<{ id: string }>).map(s => s.id)
  const { data: written } = await admin
    .from('daily_logs')
    .select('staff_member_id, log_date')
    .in('staff_member_id', dueIds)
  const wroteKey = new Set((written ?? []).map(r => {
    const w = r as { staff_member_id: string; log_date: string }
    return `${w.staff_member_id}|${w.log_date}`
  }))
  const toSend = due.filter(s => {
    const row = s as { id: string; company_id: string }
    const lp = localParts(tzFor(row.company_id))
    return lp && !wroteKey.has(`${row.id}|${lp.ymd}`)
  })

  const site = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://eliv8os.com'

  // ⚠️ 2 Sep — these went out with NO reply-to, so a foreman hitting reply sent
  // to hello@eliv8os.com: OUR address, not his own boss's. In a multi-tenant
  // product that is plainly wrong — a crew reply belongs to the owner of THAT
  // business. Daniel spotted it: "shouldn't the email go to the PM or the
  // owner's email?"
  //
  // One query for every company involved rather than one per person. Falls back
  // to no reply-to rather than to ours: a reply that bounces tells the sender
  // something, and a reply that quietly lands in a stranger's inbox does not.
  const companyIds = [...new Set((due as Array<{ company_id: string }>).map(s => s.company_id))]
  const { data: owners } = await admin
    .from('profiles')
    .select('company_id, email, role')
    .in('company_id', companyIds)
    .not('email', 'is', null)
  const ownerEmailFor = (cid: string) => {
    const rows = (owners ?? []) as Array<{ company_id: string; email: string; role: string | null }>
    const forCo = rows.filter(r => r.company_id === cid)
    return (forCo.find(r => r.role === 'owner') ?? forCo[0])?.email ?? null
  }
  let sent = 0
  const sentIds: string[] = []
  const failures: string[] = []

  for (const s of toSend as Array<{ id: string; name: string; email: string; company_id: string }>) {
    try {
      const token = await signStaffToken(s.id, s.company_id)
      const link  = `${site}/staff/${token}`
      const first = (s.name ?? '').split(' ')[0] || 'there'

      // ⚠️ Posted straight to Resend rather than through send-email, which
      // requires a signed-in user's JWT — a cron job has no user. Same API key,
      // same sender, one less hop.
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    Deno.env.get('RESEND_FROM') ?? 'Eliv8 OS <onboarding@resend.dev>',
          to:      [s.email],
          ...(ownerEmailFor(s.company_id) ? { reply_to: ownerEmailFor(s.company_id) } : {}),
          subject: 'Two minutes on today',
          text:
            `Hi ${first},\n\n` +
            `When you get a minute, jot down how today went: what got done, ` +
            `anything that slowed you up, who was on site.\n\n${link}\n\n` +
            `Same link every day, so you can save it. Nothing to log in to.\n` +
            `Reply to this email if you need to reach the office.\n`,
          html:
            `<p>Hi ${first},</p>` +
            `<p>When you get a minute, jot down how today went: what got done, ` +
            `anything that slowed you up, who was on site.</p>` +
            `<p><a href="${link}">Open today's log</a></p>` +
            `<p style="color:#667">Same link every day, so you can save it. Nothing to log in to.</p>`,
        }),
      })
      // ⚠️ Report what the provider actually SAID, not just the status. A bare
      // "401" led me to conclude the API key was missing when it was set all
      // along — a status code is a symptom and the body is the diagnosis.
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        failures.push(`${s.name}: ${res.status} ${detail.slice(0, 200)}`)
      } else { sent++; sentIds.push(s.id) }
    } catch (e) {
      failures.push(`${s.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Mark who we actually sent to, so the owner sees "Sent today".
  if (sentIds.length) {
    await admin.from('staff_members').update({ last_link_sent_at: new Date().toISOString() }).in('id', sentIds)
  }

  // Failures are reported, never thrown — one bad address must not stop the
  // rest of the crew being reminded.
  return json({ ok: true, sent, skipped: due.length - toSend.length, failures })
})
