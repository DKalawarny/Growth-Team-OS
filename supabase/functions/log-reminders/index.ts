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

  // ISO weekday: getUTCDay() gives 0=Sun, we want 1=Mon..7=Sun.
  const now      = new Date()
  const isoDay   = now.getUTCDay() === 0 ? 7 : now.getUTCDay()
  const todayYmd = now.toISOString().slice(0, 10)

  const { data: staff, error: staffErr } = await admin
    .from('staff_members')
    .select('id, name, email, company_id, log_days, log_enabled')
    .eq('log_enabled', true)
    .not('email', 'is', null)
  if (staffErr) return json({ error: staffErr.message }, 500)

  const due = (staff ?? []).filter(s =>
    Array.isArray((s as { log_days?: number[] }).log_days) &&
    (s as { log_days: number[] }).log_days.includes(isoDay))

  if (!due.length) return json({ ok: true, sent: 0, reason: 'nobody scheduled today' })

  // ⚠️ Skip anyone who already wrote today. One query for the whole day rather
  // than one per person — this runs against every company at once.
  const { data: written } = await admin
    .from('daily_logs')
    .select('staff_member_id')
    .eq('log_date', todayYmd)
  const alreadyWrote = new Set((written ?? []).map(r => (r as { staff_member_id: string }).staff_member_id))

  const toSend = due.filter(s => !alreadyWrote.has((s as { id: string }).id))

  const site = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://eliv8os.com'
  let sent = 0
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
          subject: 'Two minutes on today',
          text:
            `Hi ${first},\n\n` +
            `When you get a minute, jot down how today went — what got done, ` +
            `anything that slowed you up, who was on site.\n\n${link}\n\n` +
            `Same link every day, so you can save it. Nothing to log in to.\n`,
          html:
            `<p>Hi ${first},</p>` +
            `<p>When you get a minute, jot down how today went — what got done, ` +
            `anything that slowed you up, who was on site.</p>` +
            `<p><a href="${link}">Open today's log</a></p>` +
            `<p style="color:#667">Same link every day, so you can save it. Nothing to log in to.</p>`,
        }),
      })
      if (!res.ok) failures.push(`${s.name}: ${res.status}`)
      else sent++
    } catch (e) {
      failures.push(`${s.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Failures are reported, never thrown — one bad address must not stop the
  // rest of the crew being reminded.
  return json({ ok: true, sent, skipped: due.length - toSend.length, failures })
})
