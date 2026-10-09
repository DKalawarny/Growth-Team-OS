/**
 * demo-login — mints a session for the shared, read-only demo account so a
 * public visitor can tour the real app with no signup and no credential in the
 * browser. Deployed with --no-verify-jwt (public).
 *
 * The session is created server-side with the service role via an admin magic
 * link that is verified immediately, so there is no password anywhere. The demo
 * company's data is isolated by RLS and re-seedable, and the claude function
 * refuses AI calls from it, so a minted demo session cannot cost anything or
 * reach any real customer's data.
 */
import { preflight, json } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const DEMO_EMAIL = 'demo@eliv8os.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST')    return json({ error: 'method_not_allowed' }, 405)

  try {
    const admin = serviceClient()
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: DEMO_EMAIL })
    const tokenHash = data?.properties?.hashed_token
    if (error || !tokenHash) return json({ error: 'demo_unavailable' }, 500)

    const url     = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })

    // verifyOtp's email-link type name differs across supabase-js versions; try both.
    let res = await anon.auth.verifyOtp({ type: 'email', token_hash: tokenHash })
    if (res.error) res = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })

    const session = res.data?.session
    if (res.error || !session) return json({ error: 'demo_verify_failed' }, 500)

    return json({ access_token: session.access_token, refresh_token: session.refresh_token })
  } catch (_e) {
    return json({ error: 'demo_error' }, 500)
  }
})
