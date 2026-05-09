/**
 * Shared progress + status math for milestones.
 *
 * Extracted from Roadmap.jsx so Dashboard, Advisor context, and any future
 * surface (emails, nudges, exports) all agree on the same numbers. One bug,
 * one place to fix.
 *
 * Two concerns live here:
 *   1. Weighted progress — what fraction of the plan is done, taking each
 *      milestone's business impact (weight 1–10) into account.
 *   2. Status classification — "done" / "overdue" / "blocked" / "in-progress"
 *      / "ready" — drives UI tone, ordering, and the hero picker.
 */

/**
 * Weighted progress math.
 *
 * Returns:
 *   weightedPct   — overall progress of the plan, 0–100 (integer).
 *   sharePctById  — Map<id, integer percent> — each milestone's share of
 *                   the plan (rounded). These are shown on rows so the owner
 *                   understands the weighting ("finishing this moves the bar
 *                   by ~12%").
 *
 * Edge cases:
 *   - Empty plan → { weightedPct: 0, sharePctById: new Map() }
 *   - Missing weights → fall back to 5 (the DB default) per milestone
 *   - All weights zero (shouldn't happen; CHECK constraint 1–10) → 0
 *
 * Rounding: share_i is rounded for display. `weightedPct` is computed from
 * raw (unrounded) shares so the sum of chip numbers can drift from 100 by
 * ±1 without the bar being wrong.
 */
export function computeWeightedProgress(milestones) {
  const sharePctById = new Map()
  if (!milestones?.length) return { weightedPct: 0, sharePctById }

  const totalWeight = milestones.reduce((sum, m) => sum + (Number(m.weight) || 5), 0)
  if (totalWeight === 0) return { weightedPct: 0, sharePctById }

  let filled = 0
  for (const m of milestones) {
    const w   = Number(m.weight) || 5
    const raw = (w / totalWeight) * 100
    // `completed` flips progress_percent to 100 via DB trigger, but be defensive
    // in case the caller passed a stale row.
    const prgRaw = m.completed ? 100 : Number(m.progress_percent ?? 0)
    const prg    = Math.max(0, Math.min(100, prgRaw))
    filled += raw * (prg / 100)
    sharePctById.set(m.id, Math.round(raw))
  }

  return {
    weightedPct: Math.round(filled),
    sharePctById,
  }
}

/**
 * Status classifier — one of: 'done' | 'overdue' | 'blocked' | 'in-progress' | 'ready'.
 *
 * Precedence matters:
 *   completed  → 'done'
 *   has unmet dependency → 'blocked' (even if overdue; blocked is the root cause)
 *   past end_date → 'overdue'
 *   progress_percent > 0 → 'in-progress'
 *   otherwise → 'ready'
 *
 * @param m             The milestone row (needs completed, depends_on, end_date,
 *                      progress_percent).
 * @param completedIds  Set<uuid> of milestone ids that are completed, used to
 *                      resolve depends_on_uuids against.
 * @param todayStr      YYYY-MM-DD string for "today" — passed in so callers can
 *                      control the clock (tests, timezone normalization).
 */
export function classifyMilestone(m, completedIds, todayStr) {
  if (m.completed) return 'done'
  const unmetDeps = (m.depends_on ?? []).filter(id => !completedIds.has(id))
  if (unmetDeps.length > 0) return 'blocked'
  if (m.end_date && m.end_date < todayStr) return 'overdue'
  if ((m.progress_percent ?? 0) > 0) return 'in-progress'
  return 'ready'
}

/**
 * Convenience: classify every milestone in one pass.
 * Returns Map<id, status>.
 */
export function classifyAll(milestones, todayStr) {
  const completedIds = new Set(milestones.filter(m => m.completed).map(m => m.id))
  const out = new Map()
  for (const m of milestones) {
    out.set(m.id, classifyMilestone(m, completedIds, todayStr))
  }
  return out
}

/** YYYY-MM-DD for "today" in local time. Safe for classifyMilestone. */
export function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
