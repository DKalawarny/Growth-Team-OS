import { supabase } from './supabase'

/**
 * Usage tracking + per-tool monthly cap enforcement.
 *
 * Every tool's generate + refine call goes through this layer. Pattern:
 *
 *   await assertWithinToolCap(companyId, 'gbp-optimizer')  // throws if over
 *   const raw = await callClaude({ ... })                   // make the call
 *   await trackClaudeUsage({ ... })                         // log it
 *
 * Or, easier, use `runToolCall()` in anthropic.js which bundles all three.
 *
 * Default cap: 10 Claude calls / tool / company / calendar month.
 * Stored on `companies.monthly_tool_cap`. Raise per-tenant via SQL:
 *
 *   UPDATE companies SET monthly_tool_cap = 100 WHERE id = '<uuid>';
 *
 * Design notes:
 *   - Calendar month reset (not rolling 30d) — easier to explain to owners
 *     ("resets on the 1st") and cheaper to query than a rolling window.
 *   - Refines count the same as generates. Both cost real money. A stingier
 *     scheme (unlimited refines) invites runaway spend on a single audit.
 *   - CapExceededError carries enough context for the UI to render a good
 *     message without extra queries — count, cap, tool label, reset date.
 */

// ---- Pricing constants -----------------------------------------------------
// Verified against Anthropic pricing page and Google Cloud pricing as of
// April 2026. Update here when prices move; usage_events stores the computed
// cost so historical rows aren't retroactively mis-valued.

const CLAUDE_INPUT_PER_M  = 3.00    // Sonnet 4.6 input
const CLAUDE_OUTPUT_PER_M = 15.00   // Sonnet 4.6 output

export const PLACES_SEARCH_COST  = 0.005   // Essentials field mask
export const PLACES_DETAILS_COST = 0.020   // Enterprise mask (incl reviews + photos)

/**
 * Compute Claude API cost from token counts. Returns USD, rounded to 5dp to
 * fit the numeric(10,5) column.
 */
export function computeClaudeCost(tokensIn, tokensOut) {
  const inCost  = (tokensIn  || 0) / 1_000_000 * CLAUDE_INPUT_PER_M
  const outCost = (tokensOut || 0) / 1_000_000 * CLAUDE_OUTPUT_PER_M
  return Number((inCost + outCost).toFixed(5))
}

/**
 * Compute Places API cost for one call of a given kind. Used from the Edge
 * Function side — re-exported here so the browser dashboard can show consistent
 * numbers without duplicating the table.
 */
export function computePlacesCost(kind) {
  if (kind === 'places_search')  return PLACES_SEARCH_COST
  if (kind === 'places_details') return PLACES_DETAILS_COST
  return 0
}

// ---- Error class -----------------------------------------------------------

/**
 * Thrown by assertWithinToolCap when a call would exceed the monthly cap.
 * Carries context the UI can render without an extra query: current usage,
 * configured cap, tool id (for labelling), and the reset date (first of next
 * month at 00:00 UTC — close enough for owner messaging).
 */
export class CapExceededError extends Error {
  constructor({ toolId, used, cap }) {
    super(`Monthly cap reached for ${toolId || 'this tool'}: ${used}/${cap}`)
    this.name  = 'CapExceededError'
    this.code  = 'cap_exceeded'
    this.toolId = toolId
    this.used   = used
    this.cap    = cap
    this.resetDate = firstOfNextMonth()
  }
}

/**
 * Narrow type-guard for UI catch blocks. Every tool's error handler uses:
 *   if (isCapExceeded(err)) { ...show modal... } else { ...generic... }
 */
export function isCapExceeded(err) {
  return !!err && (err.code === 'cap_exceeded' || err.name === 'CapExceededError')
}

// ---- Monthly spend cap ($10 hard stop) -------------------------------------

/**
 * Hard dollar ceiling per company per calendar month. Set to $10 so a single
 * company can never cost more than that in one month, regardless of how many
 * tools or Advisor messages they run.
 *
 * Raise per-tenant via SQL if needed:
 *   UPDATE companies SET monthly_spend_cap = 25.00 WHERE id = '<uuid>';
 *
 * Falls back to this constant if the column doesn't exist on the row yet.
 */
export const DEFAULT_SPEND_CAP_USD = 10.00

/**
 * Thrown when a Claude call would push a company past their monthly $ ceiling.
 */
export class SpendCapExceededError extends Error {
  constructor({ used, cap }) {
    super(`Monthly spend cap of $${cap.toFixed(2)} reached ($${used.toFixed(2)} used)`)
    this.name      = 'SpendCapExceededError'
    this.code      = 'spend_cap_exceeded'
    this.used      = used
    this.cap       = cap
    this.resetDate = firstOfNextMonth()
  }
}

export function isSpendCapExceeded(err) {
  return !!err && (err.code === 'spend_cap_exceeded' || err.name === 'SpendCapExceededError')
}

/**
 * Sum all cost_usd events for this company in the current calendar month.
 * Includes every provider (Claude + Places) so the cap reflects real money out.
 */
export async function getMonthlySpend(companyId) {
  if (!companyId) return 0
  const since = firstOfThisMonth()
  const { data, error } = await supabase
    .from('usage_events')
    .select('cost_usd')
    .eq('company_id', companyId)
    .gte('created_at', since.toISOString())
  if (error) {
    console.warn('[usage] getMonthlySpend failed', error)
    return 0  // fail open — same policy as other cap reads
  }
  return (data || []).reduce((s, r) => s + Number(r.cost_usd || 0), 0)
}

/**
 * Throw SpendCapExceededError if this company has hit their monthly $ ceiling.
 * Call BEFORE any paid API call (Claude or Places).
 */
export async function assertWithinSpendCap(companyId) {
  const [spend, capRow] = await Promise.all([
    getMonthlySpend(companyId),
    supabase.from('companies').select('monthly_spend_cap').eq('id', companyId).maybeSingle(),
  ])
  const cap = capRow?.data?.monthly_spend_cap ?? DEFAULT_SPEND_CAP_USD
  if (spend >= cap) {
    throw new SpendCapExceededError({ used: spend, cap })
  }
}

// ---- Cap queries -----------------------------------------------------------

/**
 * Count Anthropic events for this company + tool in the current calendar
 * month. This is THE hot path on every tool run — keep it a single indexed
 * query, no joins.
 */
export async function getMonthlyToolCount(companyId, toolId) {
  if (!companyId || !toolId) return 0
  const since = firstOfThisMonth()
  const { count, error } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('tool_id',    toolId)
    .eq('provider',   'anthropic')
    .gte('created_at', since.toISOString())
  if (error) {
    // Fail open — don't let a flaky read block the user. Cost risk is tiny
    // relative to UX cost of lockouts from transient DB errors.
    console.warn('[usage] getMonthlyToolCount failed', error)
    return 0
  }
  return count || 0
}

/**
 * Read the cap configured on this company. Default 10 comes from the DB
 * column default, so the fallback here only fires if the row can't be read
 * (e.g. transient network) — in which case we use the same default rather
 * than locking the user out.
 */
export async function getCap(companyId) {
  if (!companyId) return 10
  const { data, error } = await supabase
    .from('companies')
    .select('monthly_tool_cap')
    .eq('id', companyId)
    .maybeSingle()
  if (error || !data) {
    console.warn('[usage] getCap failed, defaulting to 10', error)
    return 10
  }
  return data.monthly_tool_cap ?? 10
}

/**
 * Throw CapExceededError if this company has hit the monthly cap for this
 * tool. Call this BEFORE any paid Claude call.
 *
 * Race: two concurrent tabs could both pass the check and each make one call
 * past the cap. Acceptable at v0 scale — real caps enforce at the pre-call
 * gate, and being 1 over on a $5 budget isn't a safety issue. If tightening
 * is needed, move to a server-side Postgres function with row-locking.
 */
export async function assertWithinToolCap(companyId, toolId) {
  const [used, cap] = await Promise.all([
    getMonthlyToolCount(companyId, toolId),
    getCap(companyId),
  ])
  if (used >= cap) {
    throw new CapExceededError({ toolId, used, cap })
  }
}

// ---- Writes ----------------------------------------------------------------

/**
 * Log a Claude call (generate or refine) against usage_events. Non-blocking
 * in spirit — callers await for simplicity, but failures are swallowed to
 * avoid blocking the user from seeing their generated content just because
 * the usage log hiccuped.
 */
export async function trackClaudeUsage({
  companyId, userId = null, toolId, kind, tokensIn = 0, tokensOut = 0,
}) {
  if (!companyId) return null
  const cost = computeClaudeCost(tokensIn, tokensOut)
  const row  = {
    company_id: companyId,
    user_id:    userId,
    tool_id:    toolId,
    provider:   'anthropic',
    kind:       kind || 'generate',
    tokens_in:  tokensIn,
    tokens_out: tokensOut,
    units:      1,
    cost_usd:   cost,
  }
  const { error } = await supabase.from('usage_events').insert(row)
  if (error) {
    console.warn('[usage] trackClaudeUsage insert failed', error)
    return null
  }
  return row
}

// ---- Aggregations used by the Settings dashboard --------------------------

/**
 * Fetch per-tool counts for this company for the current calendar month plus
 * the aggregate cost. Used by the Settings usage card.
 *
 * Returns:
 *   {
 *     cap:         10,
 *     totalCost:   1.23,
 *     totalEvents: 18,
 *     byTool:      [{ tool_id: 'gbp-optimizer', count: 3, cost: 0.24 }, ...]
 *   }
 */
export async function getMonthlyUsageSummary(companyId) {
  if (!companyId) {
    return { cap: 10, totalCost: 0, totalEvents: 0, byTool: [] }
  }
  const since = firstOfThisMonth()
  const [cap, { data: rows, error }] = await Promise.all([
    getCap(companyId),
    supabase
      .from('usage_events')
      .select('tool_id, provider, kind, cost_usd')
      .eq('company_id', companyId)
      .gte('created_at', since.toISOString()),
  ])
  if (error) {
    console.warn('[usage] getMonthlyUsageSummary failed', error)
    return { cap, totalCost: 0, totalEvents: 0, byTool: [] }
  }

  const events = rows || []
  const totalCost = events.reduce((s, r) => s + Number(r.cost_usd || 0), 0)

  // Only count Anthropic calls against the per-tool cap. Places is logged
  // for cost visibility but doesn't deplete a cap.
  const claudeEvents = events.filter(r => r.provider === 'anthropic')
  const byToolMap = new Map()
  for (const r of claudeEvents) {
    const tid = r.tool_id || '(untagged)'
    if (!byToolMap.has(tid)) byToolMap.set(tid, { tool_id: tid, count: 0, cost: 0 })
    const bucket = byToolMap.get(tid)
    bucket.count += 1
    bucket.cost  += Number(r.cost_usd || 0)
  }
  const byTool = [...byToolMap.values()].sort((a, b) => b.count - a.count)

  return {
    cap,
    totalCost:   Number(totalCost.toFixed(4)),
    totalEvents: events.length,
    byTool,
  }
}

/**
 * Fetch per-month usage for the last N months (default 6).
 * Returns an array ordered oldest → newest:
 *   [{ month: '2026-01', calls: 12, cost: 0.84 }, ...]
 */
export async function getUsageHistory(companyId, { months = 6 } = {}) {
  if (!companyId) return []
  const since = new Date()
  since.setUTCMonth(since.getUTCMonth() - (months - 1))
  since.setUTCDate(1)
  since.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('usage_events')
    .select('created_at, cost_usd, provider')
    .eq('company_id', companyId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) { console.warn('[usage] getUsageHistory failed', error); return [] }

  // Group into calendar months
  const buckets = new Map()
  for (let i = 0; i < months; i++) {
    const d = new Date()
    d.setUTCMonth(d.getUTCMonth() - (months - 1 - i))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    buckets.set(key, { month: key, calls: 0, cost: 0 })
  }

  for (const row of (data || [])) {
    const d   = new Date(row.created_at)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (buckets.has(key)) {
      buckets.get(key).calls += 1
      buckets.get(key).cost  += Number(row.cost_usd || 0)
    }
  }

  return [...buckets.values()].map(b => ({ ...b, cost: Number(b.cost.toFixed(4)) }))
}

// ---- Date helpers ----------------------------------------------------------

function firstOfThisMonth() {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0))
}

function firstOfNextMonth() {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0))
}
