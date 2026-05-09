import { Link } from 'react-router-dom'

/**
 * RoadmapStrip — the compressed roadmap at the bottom of the dashboard.
 * Progress bar (gold fill = money/achievement), next 3 live milestones.
 * Status dot: gold = in-progress (you're on it), gray = ready (up next),
 * amber = blocked (needs attention).
 */
export default function RoadmapStrip({ milestones, statusById, weightedPct }) {
  if (!milestones || milestones.length === 0) return null

  const upcoming = pickUpcoming(milestones, statusById).slice(0, 3)

  return (
    <section className="mb-2">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-ink-900">Your roadmap</h2>
          <p className="text-xs text-ink-500 mt-0.5">Live milestones · weighted by impact</p>
        </div>
        <Link
          to="/roadmap"
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          View full roadmap →
        </Link>
      </header>

      {/* Gold progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
            Overall progress
          </span>
          <span className="text-xs font-bold text-ink-900">
            {weightedPct}%
          </span>
        </div>
        <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-700"
            style={{ width: `${weightedPct}%` }}
          />
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-sm text-ink-500 bg-white border border-ink-100 rounded-xl px-5 py-4">
          Nothing queued up — every live milestone is parked or complete. Open the roadmap to unblock or regenerate.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {upcoming.map(m => (
            <MilestonePreview
              key={m.id}
              milestone={m}
              status={statusById.get(m.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

// ----------------------------------------------------------------------------

function MilestonePreview({ milestone, status }) {
  const dot =
    status === 'in-progress' ? 'bg-brand-500 ring-2 ring-brand-200'
    : status === 'ready'     ? 'bg-ink-300'
    : status === 'blocked'   ? 'bg-amber-400'
                             : 'bg-ink-200'

  const badge =
    status === 'in-progress'
      ? <span className="text-[10.5px] font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full flex-shrink-0">In progress</span>
      : status === 'ready'
      ? <span className="text-[10.5px] font-semibold text-ink-500 bg-ink-100 px-2 py-0.5 rounded-full flex-shrink-0">Up next</span>
      : status === 'blocked'
      ? <span className="text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">Blocked</span>
      : null

  return (
    <li className="flex items-center gap-3 bg-white border border-ink-100 rounded-xl px-5 py-3.5 hover:border-brand-200 transition-colors">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
      <span className="flex-1 text-sm font-medium text-ink-800 truncate">
        {milestone.title}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge}
        {milestone.timeframe && (
          <span className="text-[10.5px] text-ink-400">
            {milestone.timeframe}
          </span>
        )}
      </div>
    </li>
  )
}

// ----------------------------------------------------------------------------

function pickUpcoming(milestones, statusById) {
  const inProgress = milestones.filter(m => statusById.get(m.id) === 'in-progress')
  const ready      = milestones.filter(m => statusById.get(m.id) === 'ready')
  const fallback   = milestones.filter(m =>
    !m.completed &&
    statusById.get(m.id) !== 'in-progress' &&
    statusById.get(m.id) !== 'ready' &&
    statusById.get(m.id) !== 'blocked',
  )
  return [...inProgress, ...ready, ...fallback]
}
