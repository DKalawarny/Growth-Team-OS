/**
 * support-notify  —  deployed with --no-verify-jwt
 *
 * Called by a Postgres trigger (via pg_net) when a row lands in
 * support_requests: a question from the Help page that Solomon could not
 * answer, or a problem somebody reported. Emails Daniel's real inbox with the
 * sender as reply-to, so answering is hitting reply.
 *
 * Why this exists: the Help page and "Report a problem" both pointed at
 * support@eliv8os.com, and that domain has no MX record, so every message sent
 * there went nowhere. This path does not depend on the product having an inbox.
 *
 * Same trust model as gbp-audit-notify: an internal server-to-server call; the
 * worst a direct hit can do is send one notification email.
 */
// deno-lint-ignore-file no-external-import
import { json, preflight } from '../_shared/cors.ts'

const NOTIFY_TO = 'dkalawarny@hotmail.com'
const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from   = Deno.env.get('RESEND_FROM')
  if (!apiKey || !from) return json({ error: 'RESEND_API_KEY / RESEND_FROM not set' }, 500)

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* still notify */ }

  const email    = clip(body.email, 200)
  const name     = clip(body.name, 120) || '(no name)'
  const company  = clip(body.company, 160) || '(no company name)'
  const kind     = body.kind === 'problem' ? 'Problem reported' : 'Help question'
  const question = clip(body.question, 4000)
  const answer   = clip(body.solomon_answer, 3000)

  const text = [
    `${kind} from ${name} at ${company}`,
    email ? `Reply to: ${email}` : 'No email on the account.',
    body.page ? `Page they were on: ${clip(body.page, 300)}` : '',
    '',
    'What they wrote:',
    question || '(empty)',
    '',
    answer ? `What Solomon told them first:\n${answer}` : 'Solomon had not answered this.',
  ].filter(l => l !== '').join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to:       [NOTIFY_TO],
      subject:  `Eliv8 OS: ${kind.toLowerCase()} from ${name}`,
      text,
      ...(email.includes('@') ? { reply_to: email } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error('[support-notify] Resend error:', err)
    return json({ error: 'Resend failed', detail: err }, 500)
  }
  return json({ ok: true })
})
