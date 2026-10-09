/**
 * auth-email — Supabase's "Send Email" auth hook. Every auth email (password
 * reset, magic link, confirm, invite, email change) comes through here and goes
 * out through Resend, under the sender of the product it belongs to.
 *
 * 🔴 WHY: the built in mailer signs everything "Supabase Auth", is limited to a
 * few an hour, and lands in spam. One project serves Eliv8 OS and Unstuck, so it
 * was also one sender for both. See brand.ts for how the product is chosen.
 *
 * 🔴🔴 ONCE THE HOOK IS ON, THIS IS THE ONLY WAY AUTH EMAIL LEAVES. If it errors,
 * nobody gets a reset link and Supabase does not fall back. So it fails loudly
 * (non 2xx, with the provider's own words) rather than pretending it sent.
 *
 * Secrets: SEND_EMAIL_HOOK_SECRET (from the hook config, "v1,whsec_..."),
 * RESEND_API_KEY, RESEND_FROM (Eliv8), WAYOUT_EMAIL_FROM (Unstuck).
 * Deploy with --no-verify-jwt: Supabase Auth calls it with a signature, not a JWT.
 */

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { brandFor } from './brand.ts'
import { compose, render } from './copy.ts'

interface HookPayload {
  user: { email: string; new_email?: string }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

function fail(status: number, message: string): Response {
  console.error('[auth-email]', message)
  return new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}

async function send(from: string, to: string, subject: string, text: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  })
  // ⚠️ The provider's words, not just the status.
  if (!res.ok) throw new Error(`resend ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'POST only')

  const secret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').replace('v1,whsec_', '')
  if (!secret) return fail(500, 'SEND_EMAIL_HOOK_SECRET is not set')

  const raw = await req.text()
  let payload: HookPayload
  try {
    payload = new Webhook(secret).verify(raw, Object.fromEntries(req.headers)) as HookPayload
  } catch {
    return fail(401, 'bad signature')
  }

  const { user, email_data: d } = payload
  const brand = brandFor(d.redirect_to || d.site_url)
  // 🔴 Each product has its own sender and neither borrows the other's. A
  // missing one is a configuration fault, reported, not papered over.
  const from = brand === 'unstuck' ? Deno.env.get('WAYOUT_EMAIL_FROM') : Deno.env.get('RESEND_FROM')
  if (!from) return fail(500, `${brand === 'unstuck' ? 'WAYOUT_EMAIL_FROM' : 'RESEND_FROM'} is not set`)

  const base = Deno.env.get('SUPABASE_URL') ?? ''
  const verify = (hash: string) =>
    `${base}/auth/v1/verify?token=${encodeURIComponent(hash)}`
    + `&type=${encodeURIComponent(d.email_action_type)}`
    + `&redirect_to=${encodeURIComponent(d.redirect_to || d.site_url)}`

  const c = compose(d.email_action_type, brand)

  // ⚠️ Each send is { to, link, code }. Only email_change can have two.
  const sends: Array<{ to: string; link: string | null; code: string | null }> = []
  if (d.email_action_type === 'reauthentication') {
    sends.push({ to: user.email, link: null, code: d.token })
  } else if (d.email_action_type === 'email_change') {
    // ⚠️ Supabase's naming is crossed on purpose: token_hash_new goes to the
    // CURRENT address, token_hash to the NEW one (secure email change).
    if (d.token_hash_new) sends.push({ to: user.email, link: verify(d.token_hash_new), code: null })
    if (user.new_email && d.token_hash) sends.push({ to: user.new_email, link: verify(d.token_hash), code: null })
  } else {
    sends.push({ to: user.email, link: verify(d.token_hash), code: null })
  }

  try {
    for (const s of sends) {
      const { text, html } = render(c, s.link, s.code)
      await send(from, s.to, c.subject, text, html)
    }
  } catch (e) {
    return fail(500, e instanceof Error ? e.message : String(e))
  }

  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
})
