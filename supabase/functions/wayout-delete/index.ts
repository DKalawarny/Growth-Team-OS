/**
 * ⭐⭐ wayout-delete — "Delete my account" for Unstuck Map, safely.
 *
 * 3 Oct 2026: the menu's delete was a mailto to a mailbox that does not exist.
 * delete-account (Eliv8's) cannot be reused as-is: Unstuck Map and Eliv8 share
 * ONE login, and that function deletes the whole account — an Unstuck Map user
 * who also runs an Eliv8 business (Daniel, for one) would lose the business.
 *
 * So, for the CALLER only (resolved from their own token, never the body):
 *   1. Every Unstuck Map row: sessions (→ playbooks, worth cascade). Their free
 *      check rows are kept but unlinked from them.
 *   2. The login itself ONLY if it has no Eliv8 footprint: no business_profiles
 *      row for its company, and nobody else in that company. Then the company
 *      first, the auth user second — the order delete-account documents.
 *   3. Otherwise the login and the Eliv8 business stay exactly as they were.
 */
import { json, preflight } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const admin = serviceClient()
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return json({ error: 'Not signed in.' }, 401)
    const { data: userRes, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userRes?.user) return json({ error: 'Not signed in.' }, 401)
    const userId = userRes.user.id

    const { error: sErr } = await admin.from('wayout_sessions').delete().eq('user_id', userId)
    if (sErr) throw new Error(`plan delete failed: ${sErr.message}`)
    await admin.from('wayout_diagnostics').update({ user_id: null }).eq('user_id', userId)

    const { data: prof } = await admin.from('profiles').select('company_id').eq('id', userId).maybeSingle()
    const companyId = (prof as { company_id: string } | null)?.company_id ?? null
    let hasEliv8 = false
    if (companyId) {
      const [{ count: biz }, { count: others }] = await Promise.all([
        admin.from('business_profiles').select('company_id', { count: 'exact', head: true }).eq('company_id', companyId),
        admin.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', companyId).neq('id', userId),
      ])
      hasEliv8 = (biz ?? 0) > 0 || (others ?? 0) > 0
    }
    if (hasEliv8) return json({ ok: true, deleted: 'unstuck-data', keptLogin: true })

    if (companyId) {
      const { error: cErr } = await admin.from('companies').delete().eq('id', companyId)
      if (cErr) throw new Error(`company delete failed: ${cErr.message}`)
    }
    const { error: aErr } = await admin.auth.admin.deleteUser(userId)
    if (aErr) return json({ error: `Your plans were deleted but the login could not be removed (${aErr.message}). Contact us and we will finish it.` }, 500)
    return json({ ok: true, deleted: 'account', keptLogin: false })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
