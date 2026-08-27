/**
 * gbp-audit-notify  —  deployed with --no-verify-jwt
 *
 * Called by a Postgres trigger (via pg_net) every time a row is inserted
 * into gbp_audit_requests. Sends a plain notification email to Daniel so
 * he can run the audit manually and reply to the prospect.
 *
 * No user auth needed — this is an internal server-to-server call from
 * the DB trigger. The blast radius if someone hits the URL directly is just
 * a spam notification email, so we skip a HMAC secret for now.
 *
 * Required env vars (same Supabase secrets):
 *   RESEND_API_KEY
 *   RESEND_FROM     e.g. "Eliv8 OS <hello@eliv8os.com>"
 */

// deno-lint-ignore-file no-external-import
import { corsHeaders, json, preflight } from '../_shared/cors.ts'

const NOTIFY_TO = 'dkalawarny@hotmail.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from   = Deno.env.get('RESEND_FROM')
  if (!apiKey || !from) {
    return json({ error: 'RESEND_API_KEY / RESEND_FROM not set' }, 500)
  }

  let body: Record<string, string | null> = {}
  try { body = await req.json() } catch { /* ignore — still notify */ }

  const business = body.business_name ?? '(unknown)'
  const email    = body.email         ?? '(unknown)'
  const city     = body.city          ?? ''
  const website  = body.website       ?? ''

  const subject = `New GBP audit request — ${business}`
  const text = [
    `New free GBP audit request:`,
    ``,
    `Business: ${business}`,
    `Email:    ${email}`,
    `City:     ${city || '—'}`,
    `Website:  ${website || '—'}`,
    ``,
    `Run the GBP audit in the app, then reply to ${email} with the report.`,
    `https://eliv8os.com/dashboard`,
  ].join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to:      [NOTIFY_TO],
      subject,
      text,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error('[gbp-audit-notify] Resend error:', err)
    return json({ error: 'Resend failed', detail: err }, 500)
  }

  return json({ ok: true })
})
