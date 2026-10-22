/**
 * qbo-disconnect
 *
 * The owner's "Disconnect" button. We:
 *   1. Verify caller JWT → company_id, role-gated like the other qbo-* fns
 *   2. Revoke the refresh token at Intuit, so our access actually ends
 *      (revoking the refresh token kills its access tokens too)
 *   3. Delete the stored tokens; they are useless once revoked
 *   4. Flip the integration row to 'disconnected'
 *
 * ⚠️ WHY THIS IS A FUNCTION (22 Oct). Disconnect used to be a browser-side
 * UPDATE on `integrations`, but that table only has a SELECT policy (writes
 * are server-owned, migration 008). The update matched zero rows, raised no
 * error, and the page said "Disconnected" while the tokens kept working.
 * Intuit's app review also expects a disconnect to revoke at their end.
 *
 * Snapshots already pulled are kept, as the button's confirm text promises.
 */

import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser, serviceClient } from '../_shared/supabase.ts'
import { revokeToken } from '../_shared/qbo.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const user = await authedUser(req)

    const allowedRoles = ['owner', 'admin', 'cfo']
    if (!allowedRoles.includes(user.role ?? '')) {
      return json({ error: 'Forbidden: owner/admin/cfo role required' }, 403)
    }

    const admin = serviceClient()

    const { data: integration, error: intErr } = await admin
      .from('integrations')
      .select('id')
      .eq('company_id', user.companyId)
      .eq('provider',   'quickbooks')
      .maybeSingle()
    if (intErr) throw new Error(`integration lookup: ${intErr.message}`)
    if (!integration) return json({ success: true, already: true })

    const { data: secret } = await admin
      .from('integration_secrets')
      .select('refresh_token')
      .eq('integration_id', integration.id)
      .maybeSingle()

    // A failed revoke (token already dead, Intuit down) must not leave the
    // owner unable to disconnect. We still drop our copy of the tokens, so
    // nothing here can use them again; we just report that Intuit's side
    // could not be confirmed.
    let revoked = false
    if (secret?.refresh_token) {
      try {
        await revokeToken(secret.refresh_token)
        revoked = true
      } catch (err) {
        console.error('[qbo-disconnect] revoke failed', err)
      }
    }

    const { error: delErr } = await admin
      .from('integration_secrets')
      .delete()
      .eq('integration_id', integration.id)
    if (delErr) throw new Error(`secrets delete: ${delErr.message}`)

    const { error: updErr } = await admin
      .from('integrations')
      .update({ status: 'disconnected', last_sync_error: null })
      .eq('id', integration.id)
    if (updErr) throw new Error(`integration update: ${updErr.message}`)

    console.log(`[qbo-disconnect] company=${user.companyId} user=${user.userId} revoked=${revoked}`)
    return json({ success: true, revoked })
  } catch (err) {
    console.error('[qbo-disconnect]', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401 : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
