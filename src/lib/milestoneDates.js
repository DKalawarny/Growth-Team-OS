/**
 * Date math for milestones in the Gantt view.
 *
 * Two places call this:
 *   - Onboarding + Settings (regenerate) compute start_date/end_date for each
 *     new milestone before inserting.
 *   - Roadmap (Gantt) computes pixel positions from those dates.
 *
 * Design:
 *   - Anchor every generated roadmap on "today" so the bars line up against
 *     the today-line naturally. We don't let Claude invent absolute dates —
 *     it returns a timeframe bucket and we derive the span.
 *   - Within a bucket, multiple milestones stagger evenly so they don't all
 *     start on day 1. Three items in "0-3 months" → [0-1mo], [1-2mo], [2-3mo].
 *   - Bucket boundaries match the timeframe enum used everywhere else
 *     (ROADMAP_SYSTEM_PROMPT, TIMEFRAME_ORDER in Roadmap.jsx).
 */

export const BUCKET_MONTHS = {
  '0-3 months':   [0, 3],
  '3-6 months':   [3, 6],
  '6-12 months':  [6, 12],
  '12-18 months': [12, 18],
  '18-24 months': [18, 24],
}

const FALLBACK_BUCKET = [0, 3]

/**
 * Add `months` months to a Date, returning a new Date.
 * Month arithmetic with fractional months uses ~30.44 day average.
 */
export function addMonths(date, months) {
  const d = new Date(date.getTime())
  const whole = Math.floor(months)
  const frac  = months - whole
  d.setMonth(d.getMonth() + whole)
  if (frac !== 0) {
    d.setDate(d.getDate() + Math.round(frac * 30.44))
  }
  return d
}

/**
 * YYYY-MM-DD for a Date (local time, which is what Postgres `date` expects).
 */
export function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Parse a 'YYYY-MM-DD' date string into a local-midnight Date.
 * (new Date('2026-04-17') parses as UTC and can shift by a day in negative TZs.)
 */
export function parseDate(str) {
  if (!str) return null
  if (str instanceof Date) return str
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Given a list of AI-generated milestones, compute start_date + end_date for
 * each one. Mutates and returns a new array; does not touch the originals.
 *
 * Stagger math: within a bucket we split the bucket span into N equal slices,
 * where N = count of milestones in that bucket. Slice order follows the order
 * they appear in `milestones` (which comes straight from Claude).
 *
 * @param {Array} milestones  AI response array, each row has at least `timeframe`
 * @param {Date}  anchor      the "now" point the roadmap hangs off. Default: today.
 * @returns {Array} same rows with start_date/end_date appended (YYYY-MM-DD strings)
 */
export function assignMilestoneDates(milestones, anchor = new Date()) {
  // Group indexes by bucket so we know N per bucket for the stagger split.
  const byBucket = new Map()
  milestones.forEach((m, i) => {
    const key = BUCKET_MONTHS[m.timeframe] ? m.timeframe : null
    if (!byBucket.has(key)) byBucket.set(key, [])
    byBucket.get(key).push(i)
  })

  const result = milestones.map(m => ({ ...m }))

  for (const [bucketKey, indexes] of byBucket.entries()) {
    const [startMo, endMo] = BUCKET_MONTHS[bucketKey] ?? FALLBACK_BUCKET
    const sliceSize = (endMo - startMo) / indexes.length

    indexes.forEach((idx, slot) => {
      const sMo = startMo + slot * sliceSize
      const eMo = startMo + (slot + 1) * sliceSize
      result[idx].start_date = toDateString(addMonths(anchor, sMo))
      result[idx].end_date   = toDateString(addMonths(anchor, eMo))
    })
  }

  return result
}

/**
 * Map Claude's `depends_on_indexes` (array-position references) to actual
 * UUIDs after the rows have been inserted.
 *
 * @param {Array} aiMilestones  original Claude payload (has depends_on_indexes)
 * @param {Array} insertedRows  rows returned from Supabase insert() in same order
 * @returns {Array<{id: string, depends_on: string[]}>} one entry per row needing an UPDATE
 */
export function buildDependencyUpdates(aiMilestones, insertedRows) {
  const indexToId = insertedRows.map(r => r.id)
  const updates = []

  aiMilestones.forEach((m, i) => {
    const deps = Array.isArray(m.depends_on_indexes) ? m.depends_on_indexes : []
    if (deps.length === 0) return

    const uuids = deps
      .map(d => {
        const n = Number(d)
        if (!Number.isInteger(n) || n < 0 || n >= indexToId.length) return null
        if (n === i) return null            // self-reference → drop
        return indexToId[n]
      })
      .filter(Boolean)

    if (uuids.length > 0) {
      updates.push({ id: indexToId[i], depends_on: uuids })
    }
  })

  return updates
}

/**
 * Earliest start_date and latest end_date across a set of milestones.
 * Used by the Gantt header to size the timeline. Returns null if no dated rows.
 */
export function getDateRange(milestones) {
  let min = null
  let max = null
  for (const m of milestones) {
    const s = parseDate(m.start_date)
    const e = parseDate(m.end_date)
    if (s && (!min || s < min)) min = s
    if (e && (!max || e > max)) max = e
  }
  return (min && max) ? { start: min, end: max } : null
}

/**
 * Bottleneck detection: a milestone is a bottleneck if it's overdue
 * (end_date in the past AND not completed) AND at least one other milestone
 * depends on it.
 *
 * @returns {Map<string, number>} id → count of blocked dependents
 */
export function detectBottlenecks(milestones, today = new Date()) {
  const todayStr = toDateString(today)
  const dependentsOf = new Map()

  for (const m of milestones) {
    for (const depId of (m.depends_on ?? [])) {
      dependentsOf.set(depId, (dependentsOf.get(depId) ?? 0) + 1)
    }
  }

  const bottlenecks = new Map()
  for (const m of milestones) {
    const overdue = m.end_date && m.end_date < todayStr && !m.completed
    const blocking = dependentsOf.get(m.id) ?? 0
    if (overdue && blocking > 0) {
      bottlenecks.set(m.id, blocking)
    }
  }
  return bottlenecks
}
