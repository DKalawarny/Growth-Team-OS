/**
 * qbo-oauth-start
 *
 * Browser calls this to begin the QBO OAuth flow. We:
 *   1. Verify the caller's Supabase JWT (must be an authed user)
 *   2. Mint a signed state token carrying their user_id + company_id
 *   3. Return the Intuit authorize URL with that state
 *
 * The browser then navigates (window.location.href = authorize_url) to send
 * the owner to Intuit's consent page.
 *
 * Why the state is signed here and not in the callback: we won't have a user
 * JWT in the callback (Intuit redirects publicly), so the state is the only
 * way to recover user context. Signing happens here because this is the only
 * function that both knows WHO the user is AND has the state secret.
 */

import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser } from '../_shared/supabase.ts'
import { buildAuthorizeUrl } from '../_shared/qbo.ts'
import { signState } from '../_shared/state.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  try {
    const user = await authedUser(req)

    // Only owners/admins/CFOs should be connecting a books provider. The tool
    // itself is role-gated; we add a belt to the router's suspenders here.
    const allowedRoles = ['owner', 'admin', 'cfo']
    if (!allowedRoles.includes(user.role ?? '')) {
      return json({ error: 'Forbidden: connecting QuickBooks requires owner/admin/cfo role' }, 403)
    }

    const state  = await signState(user.userId, user.companyId)
    const authorizeUrl = buildAuthorizeUrl(state)

    return json({ authorize_url: authorizeUrl })
  } catch (err) {
    console.error('[qbo-oauth-start]', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401 : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
