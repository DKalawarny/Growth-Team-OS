/**
 * Quarter keys for "this quarter's priorities". A key sorts as text in date
 * order ('2026-Q3' < '2026-Q4' < '2027-Q1'), which is what lets the history be
 * a plain sort.
 */
export function quarterKey(d = new Date()) {
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
}

const SPANS = { 1: 'Jan to Mar', 2: 'Apr to Jun', 3: 'Jul to Sep', 4: 'Oct to Dec' }

/** '2026-Q4' -> 'Q4 2026 (Oct to Dec)' */
export function quarterLabel(key) {
  const m = /^(\d{4})-Q([1-4])$/.exec(key ?? '')
  return m ? `Q${m[2]} ${m[1]} (${SPANS[m[2]]})` : (key ?? '')
}

/** Steps ticked, counted against the steps that still exist on the milestone. */
export function stepsDone(m) {
  const actions = Array.isArray(m?.actions) ? m.actions : []
  const done = new Set(Array.isArray(m?.actions_done) ? m.actions_done : [])
  return { total: actions.length, done: actions.filter(a => done.has(a)).length }
}

/**
 * Finished out of set, per quarter, oldest first. This is the metric: how many
 * of the priorities a quarter started with were actually finished.
 */
export function quarterHistory(milestones) {
  const by = new Map()
  for (const m of milestones ?? []) {
    if (!m.rock_quarter) continue
    const q = by.get(m.rock_quarter) ?? { quarter: m.rock_quarter, set: 0, finished: 0 }
    q.set += 1
    if (m.completed) q.finished += 1
    by.set(m.rock_quarter, q)
  }
  return [...by.values()].sort((a, b) => a.quarter.localeCompare(b.quarter))
}
