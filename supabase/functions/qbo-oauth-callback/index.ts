/**
 * qbo-oauth-callback
 *
 * Intuit redirects the owner here after they authorise. We're handling a
 * public GET with query params — no Supabase JWT — so identity comes from
 * the signed `state` token we minted in qbo-oauth-start.
 *
 * Query params (from Intuit):
 *   code       single-use auth code
 *   state      our signed token — contains uid + cid
 *   realmId    the QBO company id (required for every future API call)
 *
 * Flow:
 *   1. Verify state signature + expiry
 *   2. Exchange code for access_token + refresh_token
 *   3. UPSERT integration row (connected, realm_id, last_synced_at null)
 *   4. UPSERT integration_secrets row (tokens)
 *   5. Redirect the browser back to ${APP_URL}/settings?qbo=connected
 *
 * On any failure we still redirect to the app — with ?qbo=error&reason=...
 * The alternative (returning a JSON error) would leave the owner stuck on a
 * Supabase Function URL with no obvious way back.
 */

import { serviceClient } from '../_shared/supabase.ts'
import { exchangeCodeForTokens } from '../_shared/qbo.ts'
import { verifyState } from '../_shared/state.ts'

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Always redirect SOMEWHERE — either success or a user-visible error page.
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  // Intuit also sends `error` / `error_description` when the owner cancels.
  const errorParam = url.searchParams.get('error')
  if (errorParam) {
    return redirectToApp(appUrl, { qbo: 'error', reason: errorParam })
  }

  const code    = url.searchParams.get('code')
  const state   = url.searchParams.get('state')
  const realmId = url.searchParams.get('realmId')

  if (!code || !state || !realmId) {
    return redirectToApp(appUrl, { qbo: 'error', reason: 'missing_params' })
  }

  try {
    // 1. Recover user context from the signed state token.
    const { uid, cid } = await verifyState(state)

    // 2. Exchange the code for tokens. Intuit returns access_token (1h),
    //    refresh_token (rotates every use, valid ~100 days).
    const tokens = await exchangeCodeForTokens(code)

    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()

    // 3. UPSERT via service_role — bypasses RLS. We key on (company_id,
    //    provider) so re-connecting after a disconnect reuses the row rather
    //    than leaving stale ones behind.
    const admin = serviceClient()

    const { data: integration, error: intErr } = await admin
      .from('integrations')
      .upsert(
        {
          company_id:      cid,
          provider:        'quickbooks',
          realm_id:        realmId,
          status:          'connected',
          connected_at:    new Date().toISOString(),
          last_sync_error: null,
        },
        { onConflict: 'company_id,provider' },
      )
      .select('id')
      .single()
    if (intErr) throw new Error(`integrations upsert: ${intErr.message}`)

    // 4. UPSERT tokens. integration_secrets.integration_id is the PK, so
    //    conflict resolution is straightforward.
    const { error: secErr } = await admin
      .from('integration_secrets')
      .upsert({
        integration_id: integration.id,
        access_token:   tokens.access_token,
        refresh_token:  tokens.refresh_token,
        expires_at:     expiresAt,
        updated_at:     new Date().toISOString(),
      })
    if (secErr) throw new Error(`secrets upsert: ${secErr.message}`)

    // Optional nice-to-have: audit log that this user connected QBO.
    console.log(`[qbo-oauth-callback] connected company=${cid} user=${uid} realm=${realmId}`)

    return redirectToApp(appUrl, { qbo: 'connected' })
  } catch (err) {
    console.error('[qbo-oauth-callback]', err)
    const message = err instanceof Error ? err.message : String(err)
    return redirectToApp(appUrl, { qbo: 'error', reason: encodeURIComponent(message) })
  }
})

// ----------------------------------------------------------------------------
function redirectToApp(appUrl: string, params: Record<string, string>): Response {
  // After OAuth, drop the user on the Integrations tab — that's where
  // they kicked off the connect flow and where they'll see the new
  // QuickBooks status row.
  const dest = new URL('/settings/integrations', appUrl)
  for (const [k, v] of Object.entries(params)) dest.searchParams.set(k, v)
  return Response.redirect(dest.toString(), 302)
}
