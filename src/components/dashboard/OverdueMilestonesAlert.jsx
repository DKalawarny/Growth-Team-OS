import { Link } from 'react-router-dom'
import { todayYmd } from '../../lib/milestoneProgress'

/**
 * OverdueMilestonesAlert — dashboard banner that surfaces any roadmap
 * milestones past their end_date.
 *
 * Renders nothing when there's nothing overdue, so it stays out of the way
 * for owners who are on track. When it does render it's a single banner
 * (orange/red depending on how late) with the top 3 items inline and a
 * "View roadmap" link to act on the rest.
 *
 * Props:
 *   milestones  — full milestones array from Dashboard
 *   statusById  — Map<id, status> — pre-computed by Dashboard via classifyAll
 */
export default function OverdueMilestonesAlert({ milestones = [], statusById }) {
  if (!statusById) return null

  const today = todayYmd()
  const overdue = milestones
    .filter(m => statusById.get(m.id) === 'overdue')
    .map(m => ({ ...m, daysLate: daysBetween(m.end_date, today) }))
    .sort((a, b) => b.daysLate - a.daysLate)

  if (overdue.length === 0) return null

  const worst = overdue[0]?.daysLate ?? 0
  // 30+ days late = red. Otherwise orange.
  const tone = worst >= 30
    ? { bg: 'bg-red-50',     border: 'border-red-200',     title: 'text-red-900',    accent: 'text-red-700',    pill: 'bg-red-100 text-red-700' }
    : { bg: 'bg-orange-50',  border: 'border-orange-200',  title: 'text-orange-900', accent: 'text-orange-700', pill: 'bg-orange-100 text-orange-700' }

  return (
    <div className={`${tone.bg} ${tone.border} border rounded-xl px-5 py-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 leading-none mt-0.5">⏰</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className={`text-sm font-bold ${tone.title}`}>
              {overdue.length} milestone{overdue.length > 1 ? 's' : ''} past due
            </p>
            <Link
              to="/roadmap"
              className={`text-[11px] font-bold ${tone.accent} hover:underline whitespace-nowrap`}
            >
              View roadmap →
            </Link>
          </div>
          <ul className="space-y-1.5">
            {overdue.slice(0, 3).map(m => (
              <li key={m.id} className="flex items-center gap-2 text-xs">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${tone.pill}`}>
                  {m.daysLate === 1 ? '1 day late' : `${m.daysLate} days late`}
                </span>
                <Link
                  to="/roadmap"
                  className={`${tone.title} truncate hover:underline`}
                  title={m.title}
                >
                  {m.title}
                </Link>
              </li>
            ))}
            {overdue.length > 3 && (
              <li className={`text-[11px] ${tone.accent} opacity-70`}>
                +{overdue.length - 3} more
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysBetween(isoEnd, todayStr) {
  if (!isoEnd) return 0
  const end   = new Date(`${isoEnd}T23:59:59`).getTime()
  const today = new Date(`${todayStr}T00:00:00`).getTime()
  if (!Number.isFinite(end) || !Number.isFinite(today)) return 0
  return Math.max(0, Math.floor((today - end) / (1000 * 60 * 60 * 24)))
}
