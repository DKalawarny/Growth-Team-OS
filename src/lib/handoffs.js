import { supabase } from './supabase'

/**
 * ⭐⭐ THE SHARED SUMMARY BETWEEN UNSTUCK MAP AND ELIV8 OS (6 Oct 2026).
 * Daniel asked for "a summary they can produce to give the other platform to
 * help round it out". Agreed shape:
 *   - only a few narrow facts cross, never the plan or the profile;
 *   - the person sees and edits every word before it is shared;
 *   - nothing is shared automatically, and each share is private to them
 *     (personal_handoffs, migration 078: user scoped, never company scoped).
 */

export async function latestHandoff(from) {
  const { data: s } = await supabase.auth.getSession()
  const uid = s?.session?.user?.id
  if (!uid) return null
  const { data } = await supabase.from('personal_handoffs')
    .select('body, created_at').eq('user_id', uid).eq('from_product', from)
    .order('created_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

export async function saveHandoff(from, body) {
  const { data: s } = await supabase.auth.getSession()
  const uid = s?.session?.user?.id
  if (!uid) throw new Error('Sign in first.')
  const text = String(body ?? '').trim()
  if (text.length < 3) throw new Error('Write a line or two first.')
  const { error } = await supabase.from('personal_handoffs').insert({ user_id: uid, from_product: from, body: text.slice(0, 1200) })
  if (error) throw new Error(error.message)
}

/** Does this person also run a business on Eliv8 OS (owner or runs it)? */
export async function hasEliv8Business() {
  const { data: s } = await supabase.auth.getSession()
  const uid = s?.session?.user?.id
  if (!uid) return false
  const { data } = await supabase.from('profiles').select('role, companies(is_personal)').eq('id', uid).maybeSingle()
  const personal = Array.isArray(data?.companies) ? data.companies[0]?.is_personal : data?.companies?.is_personal
  return !!data && personal === false && (data.role === 'owner' || data.role === 'admin')
}

/** Does this person have a plan on Unstuck Map? */
export async function hasUnstuckPlan() {
  const { data: s } = await supabase.auth.getSession()
  const uid = s?.session?.user?.id
  if (!uid) return false
  const { data } = await supabase.from('wayout_sessions').select('id').eq('user_id', uid).not('map', 'is', null).limit(1)
  return (data ?? []).length > 0
}

const HORIZON = { '6m': 'about 6 months', '1y': 'about a year', '3y': 'about 3 years', '5y': '5 years or more' }

/** A first draft from their own Unstuck answers, for them to edit. Their figures only. */
export function draftFromUnstuck(answers = {}, symbol = '$') {
  const money = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : `${symbol}${Number(v).toLocaleString()}`)
  const lines = []
  const must = money(answers.mustPay)
  const aim = money(answers.enough)
  if (must) lines.push(`My household needs about ${must} a month to cover what has to go out.`)
  if (aim) lines.push(`I would like the business to bring in about ${aim} a month for me.`)
  if (HORIZON[answers.horizon]) lines.push(`I am aiming to get there in ${HORIZON[answers.horizon]}.`)
  return lines.join(' ')
}

export const DRAFT_FROM_ELIV8 =
  'The business can reliably pay me about ___ a month. My income from it is steady / seasonal. It does / does not run without me yet.'
