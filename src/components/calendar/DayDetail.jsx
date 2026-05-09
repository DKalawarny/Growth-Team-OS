import { Link } from 'react-router-dom'
import { parseDate, toDateString } from '../../lib/milestoneDates'

/**
 * DayDetail — side panel for the selected calendar day.
 *
 * Sections:
 *   1. Today's focus CTA  — log check-in prompt (today only, when sessions exist)
 *   2. Work Plan          — sessions from the daily planner with inline actions
 *   3. Events             — milestone due dates, check-ins, billing landmarks
 *   4. Quick actions grid — persistent shortcuts into the rest of the platform
 */

export default function DayDetail({
  dateStr,
  events,
  sessions = [],
  hoursPerDay = 4,
  onMarkComplete,
}) {
  if (!dateStr) {
    return (
      <aside className="bg-white border border-ink-100 rounded-xl shadow-sm p-5">
        <p className="text-sm text-ink-500">Pick a day to see your work plan and events.</p>
      </aside>
    )
  }

  const date      = parseDate(dateStr)
  const todayStr  = toDateString(new Date())
  const isToday   = dateStr === todayStr
  const isWeekend = date && (date.getDay() === 0 || date.getDay() === 6)

  const label = date
    ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : dateStr

  return (
    <aside className="bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden flex flex-col">

      {/* Header */}
      <div className="bg-ink-900 px-5 py-3.5">
        <h2 className="text-sm font-bold text-white">{label}</h2>
        {isToday && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-brand-400 mt-0.5">
            Today
          </span>
        )}
        {sessions.length > 0 && (
          <p className="text-[11px] text-ink-400 mt-0.5">
            {hoursPerDay}h/task · {sessions.length * hoursPerDay}h total · {sessions.length} milestone{sessions.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">

        {/* ── Today's focus CTA ─────────────────────────────────────────── */}
        {isToday && sessions.length > 0 && (
          <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-3">
            <div className="text-xs font-bold text-brand-800 mb-1">📅 Today's focus</div>
            <p className="text-[11px] text-brand-600 mb-2.5">
              {sessions.length} milestone{sessions.length > 1 ? 's' : ''} in focus today — log how it went when you're done.
            </p>
            <Link
              to="/checkins"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              📝 Log today's check-in
            </Link>
          </div>
        )}

        {/* ── Work Plan ─────────────────────────────────────────────────── */}
        {isWeekend && sessions.length === 0 ? (
          <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-400">
            🛌 Weekend — no sessions planned. Toggle "Weekdays only" off in the header if you work weekends.
          </div>
        ) : sessions.length > 0 ? (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2">
              Work plan
            </div>
            <div className="space-y-2">
              {sessions.map(s => (
                <div
                  key={s.milestoneId}
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: s.color.bar + '55' }}
                >
                  {/* Card body */}
                  <div className="flex items-start gap-3 p-3" style={{ background: s.color.light }}>
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0"
                      style={{ background: s.color.bar }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink-900 leading-tight truncate">
                        {s.title}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: s.color.text }}>
                        {s.hours}h focused work
                      </div>
                    </div>
                    <span
                      className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: s.color.bar, color: '#fff' }}
                    >
                      {s.hours}h
                    </span>
                  </div>

                  {/* Action row */}
                  <div
                    className="flex divide-x text-[10px] font-semibold"
                    style={{ borderTop: `1px solid ${s.color.bar}33`, divideColor: s.color.bar + '33' }}
                  >
                    <Link
                      to="/roadmap"
                      className="flex-1 text-center py-1.5 transition-colors hover:opacity-75"
                      style={{ color: s.color.text, background: s.color.light }}
                    >
                      Open roadmap →
                    </Link>
                    <div style={{ width: 1, background: s.color.bar + '33' }} />
                    <button
                      type="button"
                      onClick={() => onMarkComplete?.(s.milestoneId)}
                      className="flex-1 text-center py-1.5 text-green-700 hover:bg-green-50 transition-colors"
                      style={{ background: s.color.light }}
                    >
                      ✓ Mark complete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total hours bar — equal blocks, one per milestone */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden flex gap-px">
                {sessions.map(s => (
                  <div
                    key={s.milestoneId}
                    className="h-full flex-1 rounded-full"
                    style={{ background: s.color.bar }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-ink-400 whitespace-nowrap">
                {sessions.length * hoursPerDay}h total
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-400">
            No work sessions planned — all active milestones are either complete or outside their window.
          </div>
        )}

        {/* ── Calendar events ───────────────────────────────────────────── */}
        {events.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2">
              Events
            </div>
            <ul className="space-y-2">
              {events.map(ev => <EventRow key={ev.id} event={ev} />)}
            </ul>
          </div>
        )}

        {sessions.length === 0 && events.length === 0 && !isWeekend && (
          <div className="text-sm text-ink-400">
            Nothing planned. Set your milestone dates on the roadmap to start building your daily plan.
          </div>
        )}

      </div>
    </aside>
  )
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event }) {
  const { label, tone, icon, subtitle } = describe(event)

  const toneClass = {
    brand: 'border-brand-200 bg-brand-50',
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    red:   'border-red-200   bg-red-50',
    blue:  'border-blue-200  bg-blue-50',
    gray:  'border-ink-100   bg-white',
  }[tone]

  const content = (
    <li className={`border rounded-lg px-3 py-2 ${toneClass}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm flex-shrink-0" aria-hidden>{icon}</span>
        <span className="text-[11px] uppercase tracking-wide text-ink-500 font-semibold">{label}</span>
      </div>
      <div className="text-sm text-ink-900 mt-1 leading-snug">{event.title}</div>
      {subtitle && <div className="text-xs text-ink-500 mt-0.5">{subtitle}</div>}
    </li>
  )

  return event.href
    ? <Link to={event.href} className="block hover:opacity-90">{content}</Link>
    : content
}

function describe(event) {
  switch (event.type) {
    case 'trial-end':
      return { label: 'Billing landmark',    tone: 'amber', icon: '⏳', subtitle: 'Tap to manage billing' }
    case 'subscription-canceled':
      return { label: 'Subscription ends',   tone: 'red',   icon: '✕',  subtitle: 'Access stops unless you restart' }
    case 'subscription-renewal':
      return { label: 'Subscription renews', tone: 'blue',  icon: '↻',  subtitle: event.meta?.plan ? `Plan: ${event.meta.plan}` : null }
    case 'milestone-end': {
      const status = event.meta?.status ?? 'open'
      return {
        label:    status === 'completed' ? 'Milestone complete' : status === 'overdue' ? 'Overdue milestone' : 'Milestone due',
        tone:     status === 'completed' ? 'green' : status === 'overdue' ? 'red' : 'brand',
        icon:     '🎯',
        subtitle: event.meta?.timeframe ?? null,
      }
    }
    case 'milestone-start':
      return { label: 'Milestone starts',    tone: 'gray',  icon: '▸',  subtitle: event.meta?.timeframe ?? null }
    case 'checkin':
      return { label: 'Check-in logged',     tone: 'gray',  icon: '📝', subtitle: null }
    case 'document':
      return { label: 'Document generated',  tone: 'gray',  icon: event.meta?.icon ?? '📄', subtitle: event.meta?.toolName ?? null }
    default:
      return { label: 'Event',               tone: 'gray',  icon: '•',  subtitle: null }
  }
}
