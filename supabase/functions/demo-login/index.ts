/**
 * demo-login — gives each visitor their OWN private demo.
 *
 * On every call it creates a throwaway auth user, clones the read-only template
 * company (demo@eliv8os.com, de900000-…-001) into a fresh private company via
 * clone_demo_instance(), and mints a session for that user. So 50 people can be
 * in the demo at once and never see each other's typing — each has a private,
 * disposable copy. A scheduled cleanup wipes idle copies (see demo-cleanup).
 *
 * No password or credential is ever sent to the browser: the session is created
 * server-side with the service role via an admin magic link verified in place.
 * Every clone carries companies.is_demo = true, so the claude function refuses
 * AI for it and the demo banner shows — a minted demo session cannot cost
 * anything or reach a real customer's data. Deployed with --no-verify-jwt.
 */
import { preflight, json } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST')    return json({ error: 'method_not_allowed' }, 405)

  const admin = serviceClient()
  let userId: string | null = null

  try {
    const email = `demo+${crypto.randomUUID()}@eliv8os.com`
    const password = crypto.randomUUID() + 'Aa1!'

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (cErr || !created?.user) return json({ error: 'demo_unavailable' }, 500)
    userId = created.user.id

    // Clone the template demo into a private company owned by this user.
    const { error: clErr } = await admin.rpc('clone_demo_instance', { p_user: userId, p_email: email })
    if (clErr) {
      await admin.auth.admin.deleteUser(userId).catch(() => {})
      return json({ error: 'demo_clone_failed' }, 500)
    }

    // Mint a session for the new user with no password in the browser.
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    const tokenHash = data?.properties?.hashed_token
    if (error || !tokenHash) throw new Error('link')

    const url     = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })

    // verifyOtp's email-link type name differs across supabase-js versions; try both.
    let res = await anon.auth.verifyOtp({ type: 'email', token_hash: tokenHash })
    if (res.error) res = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })

    const session = res.data?.session
    if (res.error || !session) throw new Error('verify')

    return json({ access_token: session.access_token, refresh_token: session.refresh_token })
  } catch (_e) {
    if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {})
    return json({ error: 'demo_error' }, 500)
  }
})
