import { Link } from 'react-router-dom'

/**
 * NextFocusCard — the largest surface on the dashboard. The dark header strip
 * matches the card language used across the app: ink-900 header, white body,
 * subtle shadow.
 */
export default function NextFocusCard({ milestone, sharePct, totalMilestones }) {
  if (!milestone) return <EmptyOrComplete totalCount={totalMilestones} />

  return (
    <div className="bg-white rounded-xl shadow-sm border border-ink-100 overflow-hidden h-full flex flex-col">

      {/* Dark header strip */}
      <div className="bg-ink-900 px-6 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400" />
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400">
            Your next focus
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {typeof sharePct === 'number' && sharePct > 0 && (
            <span className="text-[10px] font-semibold text-brand-300 bg-brand-500/20 border border-brand-500/30 px-2.5 py-0.5 rounded-full">
              Worth {sharePct}% of plan
            </span>
          )}
          {milestone.timeframe && (
            <span className="text-[10px] text-ink-400 bg-ink-800 px-2.5 py-0.5 rounded-full">
              {milestone.timeframe}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex flex-col flex-1">
        <h2 className="text-2xl font-bold text-ink-900 leading-tight mb-2">
          {milestone.title}
        </h2>

        {milestone.description && (
          <p className="text-sm text-ink-500 mb-5 leading-relaxed">
            {milestone.description}
          </p>
        )}

        {Array.isArray(milestone.actions) && milestone.actions.length > 0 && (
          <ul className="space-y-2.5 mb-6">
            {milestone.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink-700">
                <span className="text-brand-500 font-bold mt-0.5 flex-shrink-0">→</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <div className="mt-auto">
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800 transition-colors glow-gold-sm"
          >
            Open in roadmap
            <span className="text-brand-400">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------

function EmptyOrComplete({ totalCount }) {
  if (!totalCount || totalCount === 0) {
    return (
      <div className="bg-white border border-dashed border-ink-200 rounded-xl overflow-hidden h-full flex flex-col">
        <div className="bg-ink-900 px-6 py-3.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400">Your next focus</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-ink-500 text-sm">Your roadmap hasn't been built yet.</p>
          <Link to="/onboarding" className="text-brand-600 text-sm font-semibold mt-2 hover:text-brand-700">
            Finish onboarding →
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div className="bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="bg-ink-900 px-6 py-3.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400">Plan complete</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-3">🏆</div>
        <h2 className="text-xl font-bold text-ink-900">Every milestone complete</h2>
        <p className="text-sm text-ink-500 mt-2 max-w-sm leading-relaxed">
          Time to set the next 24 months. Regenerate your roadmap and keep the momentum.
        </p>
        <Link
          to="/settings"
          className="mt-5 inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800 transition-colors"
        >
          Regenerate roadmap →
        </Link>
      </div>
    </div>
  )
}
