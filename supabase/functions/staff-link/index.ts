/**
 * staff-link — hands a signed-in office user the link to one crew member's page.
 *
 * Why it exists: a crew member's page opens only from a signed link, and until
 * now the only place a link was ever minted was inside an email. So an owner
 * could not see what the crew sees, a crew member with no email on file could
 * never be given a link at all, and nobody touring the demo could try the crew
 * side. (Daniel, 10 Oct: "I can't function test this page.")
 *
 * This grants nothing new: the same caller can already have this exact link
 * emailed to any address they type on the crew member's row. The checks:
 *   1. a valid session (authedUser),
 *   2. the crew member belongs to the caller's own company.
 * The token is the ordinary crew token, so "rotate links" revokes it like any
 * other.
 */
import { preflight, json } from '../_shared/cors.ts'
import { serviceClient, authedUser } from '../_shared/supabase.ts'
import { signStaffToken } from '../_shared/staff_token.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let user
  try {
    user = await authedUser(req)
  } catch (_e) {
    return json({ error: 'unauthorized' }, 401)
  }

  const body = await req.json().catch(() => ({})) as { staffId?: string }
  const staffId = String(body.staffId ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(staffId)) return json({ error: 'staffId required' }, 400)

  const { data: staff, error } = await serviceClient()
    .from('staff_members')
    .select('id, company_id')
    .eq('id', staffId)
    .maybeSingle()
  if (error) return json({ error: 'lookup_failed' }, 500)
  // Same answer for "does not exist" and "not yours", so ids cannot be probed.
  if (!staff || staff.company_id !== user.companyId) return json({ error: 'not_found' }, 404)

  const token = await signStaffToken(staff.id, user.companyId)
  return json({ token })
})
