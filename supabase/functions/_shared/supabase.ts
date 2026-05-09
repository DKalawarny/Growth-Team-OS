/**
 * Supabase clients for Edge Functions.
 *
 * Two clients, two purposes:
 *
 *   serviceClient()  — uses SERVICE_ROLE_KEY. Bypasses RLS. Used for writing
 *                      to integration_secrets (no policies) and upserting
 *                      integrations / financial_snapshots on behalf of a
 *                      verified user. NEVER return this to the browser.
 *
 *   authedUser(req)  — reads the user's JWT from the Authorization header,
 *                      returns { user_id, company_id, role } by looking up
 *                      profiles. Throws if missing/invalid. Use this to
 *                      authenticate client-initiated calls.
 */

// deno-lint-ignore-file no-external-import
// @deno-types="https://esm.sh/@supabase/supabase-js@2.45.0/dist/module/index.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface AuthedUser {
  userId:    string
  companyId: string
  role:      string | null
}

/**
 * Pull the caller's identity from the Authorization: Bearer <jwt> header,
 * then look up their company_id from profiles.
 *
 * This is the standard pattern for Edge Functions invoked from the browser —
 * the Supabase JS client puts the user's JWT on the Authorization header
 * automatically for functions.invoke() calls.
 */
export async function authedUser(req: Request): Promise<AuthedUser> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) throw new Error('auth: missing bearer token')

  const admin = serviceClient()

  const { data: userRes, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userRes?.user) {
    throw new Error(`auth: invalid token (${userErr?.message ?? 'no user'})`)
  }

  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('company_id, role')
    .eq('id', userRes.user.id)
    .maybeSingle()
  if (pErr)    throw new Error(`auth: profile lookup failed (${pErr.message})`)
  if (!profile) throw new Error('auth: no profile for user')

  return {
    userId:    userRes.user.id,
    companyId: profile.company_id as string,
    role:      (profile.role as string) ?? null,
  }
}
