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

/**
 * How far along a milestone is, COUNTED from its steps and tasks.
 *
 * ⚠️ 11 Oct 2026, Daniel, looking at the hand-dragged "Your progress" slider:
 * "this gauge isn't correct, it should almost lock in what the overall % is of
 * all tasks completed overall or partly done, to show how close to completion."
 * A slider is an opinion; he could set 45% with half the steps ticked and a
 * task under way. This is the arithmetic instead, and the screens lock to it.
 *
 * The units are the milestone's steps, plus any task linked to the milestone
 * that is not one of its steps. Each unit counts:
 *   1     the step is ticked, or its task is Done
 *   0.75  its task is in Review
 *   0.5   its task is In progress
 *   0     nothing has started
 *
 * Returns null when there is nothing to count (no steps and no tasks). Only
 * then is a hand-set number still the best there is.
 */
const TASK_WEIGHT = { done: 1, review: 0.75, in_progress: 0.5 }

export function stepProgress(milestone, tasks = []) {
  const steps  = Array.isArray(milestone?.actions) ? milestone.actions : []
  const ticked = new Set(Array.isArray(milestone?.actions_done) ? milestone.actions_done : [])
  const mine   = (tasks ?? []).filter(t => t.milestone_id === milestone?.id)

  // The furthest-along task for each title (a step can have been reassigned).
  const byTitle = new Map()
  for (const t of mine) byTitle.set(t.title, Math.max(byTitle.get(t.title) ?? 0, TASK_WEIGHT[t.status] ?? 0))

  const units = [
    ...steps.map(text => ({ text, weight: ticked.has(text) ? 1 : (byTitle.get(text) ?? 0), isStep: true })),
    ...[...byTitle.entries()].filter(([title]) => !steps.includes(title)).map(([text, weight]) => ({ text, weight, isStep: false })),
  ]
  if (units.length === 0) return null

  const sum = units.reduce((a, u) => a + u.weight, 0)
  return {
    pct:     Math.round((sum / units.length) * 100),
    done:    units.filter(u => u.weight === 1).length,
    partial: units.filter(u => u.weight > 0 && u.weight < 1).length,
    total:   units.length,
    steps:   steps.length,
    otherTasks: units.length - steps.length,
    weightOf: text => units.find(u => u.text === text)?.weight ?? 0,
  }
}

/** The number to STORE for an unfinished milestone: never 100, because finished is the owner's call. */
export function storedProgress(counted) {
  return counted ? Math.min(95, counted.pct) : null
}
