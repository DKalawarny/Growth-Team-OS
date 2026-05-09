import { parseDate, toDateString } from './milestoneDates'
import { getToolById } from './tools'

/**
 * Calendar event shaping + month-grid math.
 *
 * The calendar page is the honest "when" view of GrowthOS. It mixes four
 * things into one stream:
 *
 *   - Milestones      — a muted chip on start_date, a prominent status-
 *                       colored chip on end_date (the "due" date).
 *   - Check-ins       — a small dot on the day the owner logged one.
 *   - Documents       — a small dot on the day a tool generated output.
 *   - Landmarks       — trial_ends_at and subscription renewal/cancel dates
 *                       surface as single, visually distinct chips so the
 *                       owner can see them coming.
 *
 * Why this shape (vs. a spanning Gantt bar for milestones):
 *   The roadmap already owns the Gantt view. A month calendar with
 *   overlapping multi-day bars is hard to read and hard to build. Chips on
 *   start + end give the user the two dates they actually care about —
 *   "when should this start?" and "when is this due?" — in a form the eye
 *   can scan.
 *
 * Deliberately NOT on the calendar (v1):
 *   - Goal target dates. `business_profiles.timeline` is a text bucket
 *     ("12 months") with no concrete anchor. Showing it would require
 *     inventing a date, which the rest of the app refuses to do.
 *   - Books sync timestamps. `financial_snapshots.synced_at` is high
 *     frequency and doesn't represent owner work — the Cash KPI on the
 *     dashboard is the right surface for "is QBO fresh?".
 */

// ---------------------------------------------------------------------------
// Month-grid math
// ---------------------------------------------------------------------------

/**
 * First day (local midnight) of the month that contains `date`.
 */
export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Last day (local midnight) of the month that contains `date`.
 * Day 0 of next month === last day of this month.
 */
export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/**
 * Shift a month-anchor date by N months. Always returns the 1st so callers
 * can chain safely (addMonthsStart(today, 1) then pass into getMonthGrid).
 */
export function addMonthsStart(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

/**
 * Build the 6-row × 7-col grid for a given month. We always return 42 cells
 * so the grid height is stable as the user pages back/forward — nothing
 * worse than the whole UI shifting because Feb needs 5 rows and Mar needs 6.
 *
 * Leading cells come from the previous month, trailing from the next. Cells
 * are marked `inMonth` so the view can mute the out-of-month ones.
 *
 * Week starts Sunday — matches US convention for the home-services owner
 * target audience. Easy to change to Monday later by shifting the modulo.
 */
export function getMonthGrid(anchor) {
  const first = startOfMonth(anchor)
  const firstDow = first.getDay() // 0 = Sun ... 6 = Sat
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - firstDow)

  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    cells.push({
      date:      d,
      dateStr:   toDateString(d),
      inMonth:   d.getMonth() === first.getMonth(),
      isToday:   isSameDay(d, new Date()),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    })
  }
  return cells
}

/**
 * Human month label for the calendar header, e.g. "April 2026".
 */
export function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate()
}

// ---------------------------------------------------------------------------
// Event shaping
// ---------------------------------------------------------------------------

/**
 * Produce a Map<dateStr, Event[]> for the given inputs. The map is indexed
 * by YYYY-MM-DD so rendering a day cell is a single .get() lookup — no
 * per-day scan across the full event list.
 *
 * Event shape:
 *   {
 *     id:      string   stable per event, safe as React key
 *     type:    'milestone-start' | 'milestone-end'
 *              | 'checkin' | 'document'
 *              | 'trial-end' | 'subscription-renewal' | 'subscription-canceled'
 *     title:   string   human-readable label
 *     date:    Date     local-midnight
 *     href:    string?  click-through target when you click a day+event
 *     meta:    object?  status/icon/tool name for the renderer
 *   }
 *
 * Inputs are all optional — passing {} returns an empty map. This matters
 * because the calendar page should still render cleanly for a brand-new
 * account with no milestones, no check-ins, no sub.
 */
export function buildCalendarEvents({
  milestones  = [],
  checkins    = [],
  documents   = [],
  trialEndsAt = null,
  subscription = null,
} = {}) {
  const map = new Map()

  const push = (ev) => {
    if (!ev || !ev.date) return
    const key = toDateString(ev.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(ev)
  }

  // -- Milestones: start chip (muted) + end chip (prominent) -----------------
  for (const m of milestones) {
    const status = milestoneStatus(m)

    const start = parseDate(m.start_date)
    if (start) {
      push({
        id:    `ms-start-${m.id}`,
        type:  'milestone-start',
        title: m.title,
        date:  start,
        href:  '/roadmap',
        meta:  { status, milestoneId: m.id, timeframe: m.timeframe ?? null },
      })
    }

    const end = parseDate(m.end_date)
    if (end) {
      push({
        id:    `ms-end-${m.id}`,
        type:  'milestone-end',
        title: m.title,
        date:  end,
        href:  '/roadmap',
        meta:  { status, milestoneId: m.id, timeframe: m.timeframe ?? null },
      })
    }
  }

  // -- Check-ins: one event per logged check-in ------------------------------
  for (const c of checkins) {
    const d = parseEventDate(c.created_at)
    if (!d) continue
    push({
      id:    `ci-${c.id}`,
      type:  'checkin',
      // Prefer the "win" text so the day preview reads like content, not a
      // row count. Fallback walks revenue_update → generic label.
      title: firstLine(c.win) || firstLine(c.revenue_update) || 'Check-in logged',
      date:  d,
      href:  '/checkins',
      meta:  { icon: '📝' },
    })
  }

  // -- Documents generated ---------------------------------------------------
  for (const doc of documents) {
    const d = parseEventDate(doc.created_at)
    if (!d) continue
    const tool = doc.tool_id ? getToolById(doc.tool_id) : null
    push({
      id:    `doc-${doc.id}`,
      type:  'document',
      title: doc.title || tool?.name || 'Document generated',
      date:  d,
      href:  doc.tool_id ? `/documents?tool=${encodeURIComponent(doc.tool_id)}` : '/documents',
      meta:  { icon: tool?.icon ?? '📄', toolName: tool?.name ?? doc.tool_id ?? null },
    })
  }

  // -- Trial end -------------------------------------------------------------
  // Only render the trial-end landmark if the trial hasn't already lapsed;
  // once it's in the past it's just noise (the dashboard paywall tells
  // that story). A future trial-end is the nudge we want — it shows up in
  // the month it will land and the owner sees it coming.
  {
    const d = parseEventDate(trialEndsAt)
    if (d && d.getTime() > Date.now()) {
      push({
        id:    'trial-end',
        type:  'trial-end',
        title: 'Free trial ends',
        date:  d,
        href:  '/settings',
        meta:  {},
      })
    }
  }

  // -- Subscription renewal / scheduled cancel -------------------------------
  if (subscription?.current_period_end) {
    const d = parseEventDate(subscription.current_period_end)
    if (d) {
      // If the sub is flagged cancel_at_period_end, the "renewal" date is
      // actually the end date — label it accordingly. Owners need to know
      // "this is when my access stops", not "this is when it renews."
      const canceling = !!subscription.cancel_at_period_end
      push({
        id:    'sub-cycle',
        type:  canceling ? 'subscription-canceled' : 'subscription-renewal',
        title: canceling ? 'Subscription ends' : 'Subscription renews',
        date:  d,
        href:  '/settings',
        meta:  { plan: subscription.plan ?? null },
      })
    }
  }

  // Sort each day's events in a stable, opinionated order: landmarks first
  // (they're what the owner needs to see), then milestone ends (the due
  // dates), then starts, then activity (checkins, docs). Sorting once here
  // keeps the day-cell renderer dumb.
  for (const arr of map.values()) {
    arr.sort((a, b) => rankEvent(a) - rankEvent(b))
  }

  return map
}

/**
 * Count of events on a given day — convenience for the grid cell renderer
 * when it wants to show a "+3 more" overflow indicator.
 */
export function eventCountFor(map, dateStr) {
  return map.get(dateStr)?.length ?? 0
}

// ---------------------------------------------------------------------------
// Daily work-session planner
// ---------------------------------------------------------------------------

/**
 * Six distinct, non-purple colours cycling through active milestones.
 * Each entry has everything the UI needs to render a session chip/bar.
 */
export const SESSION_COLORS = [
  { bar: '#F59E0B', light: '#FEF3C7', text: '#92400e', label: 'amber' },   // brand gold
  { bar: '#0D9488', light: '#CCFBF1', text: '#134e4a', label: 'teal'  },
  { bar: '#3B82F6', light: '#DBEAFE', text: '#1e40af', label: 'blue'  },
  { bar: '#22C55E', light: '#DCFCE7', text: '#14532d', label: 'green' },
  { bar: '#F43F5E', light: '#FFE4E6', text: '#881337', label: 'rose'  },
  { bar: '#0EA5E9', light: '#E0F2FE', text: '#0c4a6e', label: 'sky'   },
]

/**
 * Build a Map<dateStr, WorkSession[]> covering the next `horizonDays` days.
 *
 * For each calendar day we look at which milestones are "in window"
 * (start_date ≤ day ≤ end_date, not completed). We cap at 2 concurrent
 * milestones per day — more than that and nothing gets proper focus.
 * The daily hours budget is split evenly across the capped set.
 *
 * WorkSession shape:
 *   { milestoneId, title, hours, color: SESSION_COLORS[n] }
 *
 * @param {object[]} milestones      full milestone rows (need id, title, start_date, end_date, completed)
 * @param {object}   [opts]
 * @param {number}   [opts.hoursPerDay=4]    total focused hours available per day
 * @param {boolean}  [opts.skipWeekends=true] exclude Sat/Sun from the plan
 * @param {number}   [opts.maxConcurrent=2]  max milestones to schedule per day
 * @param {number}   [opts.horizonDays=365]  how far forward to build the plan
 */
export function buildDailyPlan(milestones, {
  hoursPerDay   = 4,
  skipWeekends  = true,
  maxConcurrent = 2,
  horizonDays   = 365,
} = {}) {
  const plan  = new Map()
  const today = toDateString(new Date())

  // Active milestones that start from today onward (or already in progress)
  const active = milestones
    .filter(m => !m.completed && m.start_date && m.end_date && m.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  if (!active.length) return plan

  // Stable colour assignment — each milestone keeps its colour across all days
  const colorOf = new Map(active.map((m, i) => [m.id, SESSION_COLORS[i % SESSION_COLORS.length]]))

  for (let i = 0; i < horizonDays; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const dow     = d.getDay()
    const dateStr = toDateString(d)

    if (skipWeekends && (dow === 0 || dow === 6)) continue

    // Milestones whose window covers this day
    const inWindow = active.filter(m => m.start_date <= dateStr && m.end_date >= dateStr)
    if (!inWindow.length) continue

    // Cap at maxConcurrent — prefer milestones ending soonest first
    const sessions = inWindow
      .sort((a, b) => a.end_date.localeCompare(b.end_date))
      .slice(0, maxConcurrent)

    // Each milestone gets the full hoursPerDay — it's hours-per-item, not a shared budget
    plan.set(dateStr, sessions.map(m => ({
      milestoneId: m.id,
      title:       m.title,
      hours:       hoursPerDay,
      color:       colorOf.get(m.id),
    })))
  }

  return plan
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Normalize a created_at timestamp (ISO string OR Postgres `timestamptz`) to
 * a local-midnight Date, so the calendar groups by calendar day regardless
 * of time-of-day. Returns null for unparseable input.
 */
function parseEventDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Lightweight status classifier — the calendar doesn't have the milestone-
 * progress data the roadmap computes, and doesn't need it. All we want for
 * color is: completed / overdue / open. That's a pure function of the row.
 */
function milestoneStatus(m) {
  if (m.completed) return 'completed'
  const end = parseDate(m.end_date)
  if (end) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (end.getTime() < today.getTime()) return 'overdue'
  }
  return 'open'
}

function firstLine(s) {
  if (!s) return null
  const str = String(s).trim()
  if (!str) return null
  const line = str.split('\n')[0]
  return line.length > 60 ? line.slice(0, 59) + '…' : line
}

const RANK = {
  'trial-end':             0,
  'subscription-canceled': 1,
  'subscription-renewal':  1,
  'milestone-end':         2,
  'milestone-start':       3,
  'checkin':               4,
  'document':              5,
}
function rankEvent(ev) {
  return RANK[ev.type] ?? 99
}
