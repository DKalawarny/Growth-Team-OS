/**
 * delete-account — actually deletes an account.
 *
 * ⚠️ WHY THIS EXISTS. The Settings → Danger "Delete workspace" button told the
 * owner "Permanently delete this workspace and all data — milestones,
 * documents, financial records, and advisor memory. This cannot be undone",
 * made them type DELETE, said "Deleting your workspace…" — and then ran
 * `supabase.auth.signOut()`. Nothing was ever deleted. Someone who had trusted
 * us with their books was told those books were gone while they sat untouched
 * in the database. On this product, of all products.
 *
 * The browser cannot do this: deleting an auth user needs the service role, and
 * a service-role key can never be shipped to a client. Hence an Edge Function.
 *
 * ── What gets deleted, and what deliberately does not ──────────────────────
 *
 * SOLE OWNER (no other profile on the company):
 *   the company row is deleted, and 22 tables cascade off companies(id) — the
 *   roadmap, documents, check-ins, knowledge files, advisor memory, work
 *   orders, usage. Then the auth user, which cascades profiles(id).
 *
 * NOT THE ONLY MEMBER:
 *   only this person is removed. The company and its data belong to the people
 *   still in it, and one member leaving must never delete their colleagues'
 *   business records. work_orders.created_by / assigned_to go null rather than
 *   taking the job history with them (migration 033).
 *
 * ⚠️ THE ORDER MATTERS. Company first, auth user second. Doing it the other way
 * cascades the profile away, and the company lookup that decides sole-ownership
 * no longer has a profile to find — you would orphan the company and every row
 * hanging off it, silently, with the account gone and nobody able to reach it.
 *
 * ⚠️ NO ADMIN PATH. This deletes the CALLER, resolved from their own JWT. There
 * is deliberately no "delete user X" parameter: a body-supplied id would make
 * this an account-deletion weapon behind one forged request.
 */

import { json, preflight } from '../_shared/cors.ts'
import { serviceClient, authedUser } from '../_shared/supabase.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()

  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405)
  }

  try {
    // Resolves from the caller's own bearer token. Never from the body.
    const { userId, companyId } = await authedUser(req)
    const admin = serviceClient()

    // Is anyone else on this company? Deleting shared data is not ours to do.
    let deletedCompany = false
    if (companyId) {
      const { count, error: cErr } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .neq('id', userId)

      if (cErr) throw new Error(`member count failed: ${cErr.message}`)

      if ((count ?? 0) === 0) {
        const { error: delErr } = await admin
          .from('companies')
          .delete()
          .eq('id', companyId)
        if (delErr) throw new Error(`company delete failed: ${delErr.message}`)
        deletedCompany = true
      }
    }

    // The auth user last — this cascades profiles(id) and ends the session for
    // good. If it fails after the company went, say so plainly rather than
    // reporting success: the caller needs to know to come back to us.
    const { error: authErr } = await admin.auth.admin.deleteUser(userId)
    if (authErr) {
      return json({
        error: `Your workspace was deleted but the login could not be removed (${authErr.message}). Email support@eliv8os.com and we will finish it.`,
        deletedCompany,
      }, 500)
    }

    return json({ ok: true, deletedCompany })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.startsWith('auth:')) return json({ error: 'Not signed in.' }, 401)
    return json({ error: msg }, 500)
  }
})
