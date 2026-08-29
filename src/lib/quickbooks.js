import { supabase } from './supabase'

/**
 * QuickBooks helpers — browser-side thin wrapper over the qbo-* Edge Functions.
 *
 * Three calls:
 *   startOAuthFlow()   — kicks off the Intuit consent dance. Browser redirects
 *                        to Intuit; Intuit redirects to our callback; callback
 *                        redirects back to /settings?qbo=connected.
 *   syncQuickBooks()   — pulls fresh P&L + Balance Sheet for a period and
 *                        writes to financial_snapshots. Called by the Settings
 *                        page and the CFO Dashboard.
 *   fetchIntegration() — reads the current connection status + last_synced_at.
 *                        Uses the anon client + RLS — safe for the browser.
 *   fetchLatestSnapshots() — recent snapshots for the company. Used by the
 *                            CFO form to show "using live data from …".
 *
 * We DON'T expose anything that reads tokens. Those live in
 * integration_secrets, which has no RLS policies — only the service-role
 * Edge Functions can touch them.
 */

// -------- OAuth kickoff --------

/**
 * Call qbo-oauth-start, then send the owner to Intuit's authorise URL.
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.newTab=false]  open Intuit in a new tab instead of
 *                                       navigating this one away.
 *
 * ⭐ WHY newTab EXISTS (28 Aug). Daniel hit this during onboarding: the
 * QuickBooks button navigated the whole tab to Intuit, and coming back left him
 * having lost his place. His question — "this should just open in its own page
 * right?" — is the right instinct. From Settings, leaving the tab is fine and
 * the callback returning to /settings?qbo=connected is exactly what you want.
 * From inside a wizard it is not.
 *
 * ⚠️ THE POPUP-BLOCKER TRAP. `window.open()` is only allowed while the browser
 * still considers itself inside a user gesture. This function `await`s the edge
 * function first, and by the time that resolves the gesture is over — so
 * opening there is silently blocked and the button does nothing at all, which
 * is worse than navigating away. The tab is therefore opened SYNCHRONOUSLY,
 * before any await, and only pointed at Intuit once we have the URL.
 */
export async function startOAuthFlow({ newTab = false } = {}) {
  // Opened before the await, while the click is still "live".
  const tab = newTab ? window.open('', '_blank', 'noopener') : null

  try {
    const { data, error } = await supabase.functions.invoke('qbo-oauth-start', {
      method: 'POST',
    })
    if (error) throw new Error(error.message || 'Could not start QuickBooks connection')
    if (!data?.authorize_url) throw new Error('Missing authorize_url from server')

    if (tab && !tab.closed) {
      tab.location.href = data.authorize_url
    } else {
      // Either we were not asked for a tab, or the browser blocked it. Falling
      // back to a same-tab navigation keeps the button working — the owner
      // gets to QuickBooks either way, which matters more than where it opens.
      window.location.href = data.authorize_url
    }
  } catch (err) {
    // Never strand a blank tab in front of the owner.
    if (tab && !tab.closed) tab.close()
    throw err
  }
}

// -------- Sync --------

/**
 * Pull fresh reports for a period. If no period is passed, the function
 * defaults to "last calendar month" server-side.
 *
 * Returns the sync summary: { success, synced_at, period_label, snapshots, warnings? }
 */
export async function syncQuickBooks(opts = {}) {
  const body = {}
  if (opts.period_start) body.period_start = opts.period_start
  if (opts.period_end)   body.period_end   = opts.period_end
  if (opts.period_label) body.period_label = opts.period_label

  const { data, error } = await supabase.functions.invoke('qbo-sync', {
    method: 'POST',
    body,
  })
  if (error) throw new Error(error.message || 'Sync failed')
  if (data?.error) throw new Error(data.error)
  return data
}

// -------- Read-only status --------

/**
 * Current integration row for the signed-in company, or null if not
 * connected. Readable via RLS — no service-role needed.
 */
export async function fetchIntegration(companyId, provider = 'quickbooks') {
  if (!companyId) return null
  const { data, error } = await supabase
    .from('integrations')
    .select('id, provider, status, realm_id, connected_at, last_synced_at, last_sync_error')
    .eq('company_id', companyId)
    .eq('provider',   provider)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Latest snapshots for the company, newest first, capped. Used by UI to show
 * "Using QuickBooks data from March 2026 (synced 12 min ago)" style affordances.
 */
export async function fetchLatestSnapshots(companyId, { limit = 4 } = {}) {
  if (!companyId) return []
  const { data, error } = await supabase
    .from('financial_snapshots')
    .select('id, source, report_type, period_label, period_end, synced_at')
    .eq('company_id', companyId)
    .order('synced_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * "Disconnect" is a client-side operation that flips the status on the
 * integration row. We don't actually revoke the token with Intuit (the user
 * can do that in their QBO account if they want). Flipping status means
 * qbo-sync refuses to run until they reconnect.
 *
 * Tokens are NOT deleted — kept so reconnect-and-re-sync can be a no-op for
 * the operator if they realise they disconnected in error. If they fully
 * reconnect via OAuth the secret row gets overwritten anyway.
 */
export async function disconnectQuickBooks(companyId) {
  if (!companyId) throw new Error('Missing companyId')
  const { error } = await supabase
    .from('integrations')
    .update({ status: 'disconnected' })
    .eq('company_id', companyId)
    .eq('provider', 'quickbooks')
  if (error) throw new Error(error.message)
}

// -------- Display helpers --------

/** Relative time in minutes/hours/days. Compact, for status chips. */
export function formatRelative(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const m = Math.floor(ms / 60_000)
  if (m < 1)     return 'just now'
  if (m < 60)    return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)    return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)    return `${d}d ago`
  const mo = Math.floor(d / 30)
  return `${mo}mo ago`
}
