/**
 * terms — the pilot agreement's version, operator, and acceptance plumbing.
 *
 * ⭐ THE TWO CONSTANTS THAT MATTER ARE AT THE TOP AND THEY MOVE TOGETHER.
 *
 * GrowthOS is running a private pilot BEFORE the company exists. That is a
 * deliberate, informed choice, but it has one consequence that has to be
 * handled honestly rather than papered over: an agreement is between two
 * parties, and right now the second party is a person, not a company.
 *
 * So OPERATOR_LEGAL_NAME is Daniel personally. The day the BC company is
 * incorporated, BOTH of these change in the same commit:
 *
 *   1. OPERATOR_LEGAL_NAME  → the company's registered name
 *   2. TERMS_VERSION        → bumped
 *
 * Bumping the version is not bookkeeping. It forces every existing pilot user
 * back through the gate to accept under the new entity. Quietly swapping the
 * operator name without a re-accept would mean claiming people had agreed to
 * something they never saw — which is the exact failure this whole file exists
 * to fix, and it would be a worse one, because it would be deliberate.
 *
 * The old acceptance rows stay untouched. They are the truthful record of what
 * those users actually agreed to at that time.
 */

import { supabase } from './supabase'

/** Bump on any material change. Forces re-acceptance through TermsGate. */
export const TERMS_VERSION = '2026-08-pilot-1'

/**
 * ⚠️ Pre-incorporation. See the note above — this and TERMS_VERSION change
 * together, never separately.
 */
export const OPERATOR_LEGAL_NAME = 'Daniel Kalawarny'

/** Where notices and questions go. */
export const OPERATOR_CONTACT = 'support@leadeos.com'

/** Province whose law governs, and whose courts hear disputes. */
export const GOVERNING_PROVINCE = 'British Columbia'

/**
 * Liability cap. Deliberately expressed as a real number rather than "fees
 * paid", because during a free pilot "fees paid" is zero — a cap of nothing
 * reads as bad faith and a court is more likely to strike the whole clause
 * than to enforce it. A modest, genuine cap is more defensible than a
 * theatrical one.
 */
export const LIABILITY_CAP_CAD = 100

/**
 * Where signup parks acceptance when there is no session yet.
 *
 * ⚠️ Supabase email confirmation means auth.signUp() returns a user with NO
 * session, so the checkbox cannot write its own row — the insert would fail
 * RLS because auth.uid() is null. Acceptance is therefore parked here and
 * flushed by TermsGate on the first authenticated load.
 *
 * The gate is the real guarantee. This key only preserves the more accurate
 * 'signup' provenance and the moment they actually ticked the box.
 */
const PENDING_KEY = 'growthos:terms-pending'

export function parkPendingAcceptance() {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({
      version:  TERMS_VERSION,
      at:       new Date().toISOString(),
    }))
  } catch { /* private mode — the gate still catches them */ }
}

function readPendingAcceptance() {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Only honour a park for the version currently in force.
    return parsed?.version === TERMS_VERSION ? parsed : null
  } catch {
    return null
  }
}

function clearPendingAcceptance() {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* ignore */ }
}

/**
 * Has this user accepted the version currently in force?
 *
 * Returns null on error rather than false. The caller must NOT lock someone
 * out of the product because a network request failed — a transient blip is
 * not a refusal to accept.
 *
 * @param   {string} userId
 * @returns {Promise<boolean|null>}
 */
export async function hasAcceptedCurrentTerms(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('terms_acceptances')
    .select('id')
    .eq('user_id', userId)
    .eq('version', TERMS_VERSION)
    .maybeSingle()

  if (error) return null
  return Boolean(data)
}

/**
 * Record acceptance. Idempotent — the unique index on (user_id, version)
 * means a duplicate is a no-op rather than a second row, so a double-click or
 * a gate racing the signup park cannot produce two records.
 *
 * @param {object}  opts
 * @param {string}  opts.userId
 * @param {string} [opts.companyId]  null before onboarding; that is expected
 * @param {string} [opts.source]     'signup' | 'gate' | 'import'
 */
export async function recordAcceptance({ userId, companyId = null, source = 'gate' }) {
  if (!userId) return { error: new Error('no user') }

  // If they ticked the box at signup, keep that provenance and timestamp —
  // it is the moment they actually agreed, and better evidence than the
  // moment the gate happened to run.
  const pending = readPendingAcceptance()
  const row = {
    user_id:    userId,
    company_id: companyId,
    version:    TERMS_VERSION,
    source:     pending ? 'signup' : source,
    ...(pending?.at ? { accepted_at: pending.at } : {}),
  }

  const { error } = await supabase
    .from('terms_acceptances')
    .upsert(row, { onConflict: 'user_id,version', ignoreDuplicates: true })

  if (!error) clearPendingAcceptance()
  return { error }
}
