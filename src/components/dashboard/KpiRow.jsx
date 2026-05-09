import { Link } from 'react-router-dom'

/**
 * KpiRow — four tiles that float up into the dark hero zone. Each tile now
 * carries a small visual element alongside the number: a circular arc for
 * plan progress, pulsing dots for active focuses, a 7-day dot streak for
 * check-ins, a trend mark for cash. Numbers alone are cold; a visual turns
 * a tile into a reward surface.
 */
export default function KpiRow({
  planProgressPct,
  activeFocusCount,
  daysSinceLastCheckin,
  latestPnl,
  qboStatus,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <ProgressTile pct={planProgressPct} />
      <FocusTile count={activeFocusCount} />
      <CheckinTile daysSince={daysSinceLastCheckin} />
      <CashTile latestPnl={latestPnl} qboStatus={qboStatus} />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Tile shell — every tile shares this outer chrome
// ----------------------------------------------------------------------------

function TileShell({ to, children, tone = 'default' }) {
  const accent = tone === 'warn'  ? 'bg-amber-400'
               : tone === 'muted' ? 'bg-brand-200'
                                  : 'bg-brand-500'

  const inner = (
    <div className="flex items-stretch min-h-[104px]">
      <div className={`w-1 rounded-l-xl flex-shrink-0 ${accent}`} />
      <div className="flex-1 px-5 py-4">{children}</div>
    </div>
  )

  const shell = 'bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5'

  return to ? (
    <Link to={to} className={`${shell} block`}>{inner}</Link>
  ) : (
    <div className={shell}>{inner}</div>
  )
}

function TileLabel({ children }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-500 mb-1.5">
      {children}
    </p>
  )
}

// ----------------------------------------------------------------------------
// Plan progress — circular arc + percentage
// ----------------------------------------------------------------------------

function ProgressTile({ pct }) {
  return (
    <TileShell to="/roadmap">
      <TileLabel>Plan progress</TileLabel>
      <div className="flex items-center gap-3">
        <ProgressArc pct={pct} />
        <div>
          <p className="text-xs text-ink-400">Weighted by</p>
          <p className="text-xs text-ink-500 font-medium">impact</p>
        </div>
      </div>
    </TileShell>
  )
}

function ProgressArc({ pct, size = 56 }) {
  const stroke = 5
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="#e8edf4"  /* ink-100 */
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-ink-900 tabular-nums">{pct}%</span>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Active focuses — big number + pulsing gold dots (one per focus, max 5)
// ----------------------------------------------------------------------------

function FocusTile({ count }) {
  const dots = Math.min(count, 5)
  return (
    <TileShell to="/roadmap">
      <TileLabel>Active focuses</TileLabel>
      <p className="text-3xl font-bold tracking-tight text-ink-900">{count}</p>
      {count > 0 ? (
        <div className="flex items-center gap-1 mt-2">
          {Array.from({ length: dots }).map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
          {count > 5 && (
            <span className="text-[10px] text-ink-400 ml-1">+{count - 5}</span>
          )}
          <span className="text-xs text-ink-400 ml-2">in motion</span>
        </div>
      ) : (
        <p className="text-xs text-ink-400 mt-1">Nothing in motion</p>
      )}
    </TileShell>
  )
}

// ----------------------------------------------------------------------------
// Last check-in — value + 7-dot streak (solid = had a check-in that day)
// ----------------------------------------------------------------------------

function CheckinTile({ daysSince }) {
  if (daysSince === null || daysSince === undefined) {
    return (
      <TileShell to="/checkins" tone="muted">
        <TileLabel>Check-ins</TileLabel>
        <p className="text-lg font-bold text-ink-900">Log your first</p>
        <p className="text-xs text-ink-400 mt-1">Keep the week on rails</p>
      </TileShell>
    )
  }
  const stale = daysSince > 7
  return (
    <TileShell to="/checkins" tone={stale ? 'warn' : 'default'}>
      <TileLabel>Last check-in</TileLabel>
      <p className={`text-3xl font-bold tracking-tight ${stale ? 'text-amber-600' : 'text-ink-900'}`}>
        {daysSince === 0 ? 'Today' : `${daysSince}d`}
      </p>
      <div className="flex items-center gap-1 mt-2">
        <StreakDots daysSince={daysSince} />
        <span className="text-xs text-ink-400 ml-1">
          {stale ? 'been a while' : daysSince <= 1 ? 'on rhythm' : 'keep it up'}
        </span>
      </div>
    </TileShell>
  )
}

/**
 * 7-dot streak — each dot = one day of the past week. Solid gold for the
 * day the check-in happened, muted for days without. The most recent day
 * is on the right.
 */
function StreakDots({ daysSince }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 7 }).map((_, i) => {
        const dayOffset = 6 - i  // 6 = 6 days ago, 0 = today
        const hit = daysSince === dayOffset
        return (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${hit ? 'bg-brand-500' : 'bg-ink-200'}`}
          />
        )
      })}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Cash — connected: latest period + sync freshness; not connected: CTA
// ----------------------------------------------------------------------------

function CashTile({ latestPnl, qboStatus }) {
  if (qboStatus !== 'connected' || !latestPnl) {
    return (
      <TileShell to="/settings" tone="muted">
        <TileLabel>Cash &amp; books</TileLabel>
        <p className="text-sm font-bold text-ink-900 leading-tight">
          Connect QuickBooks
        </p>
        <p className="text-xs text-brand-600 mt-1 font-medium">
          Sync your P&amp;L automatically →
        </p>
      </TileShell>
    )
  }
  return (
    <TileShell to="/tools/cfo">
      <TileLabel>Latest books</TileLabel>
      <p className="text-xl font-bold text-ink-900 leading-tight truncate">
        {latestPnl.period_label}
      </p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
        <span className="text-xs text-ink-400">
          Synced {formatRelative(latestPnl.synced_at)}
        </span>
      </div>
    </TileShell>
  )
}

// ----------------------------------------------------------------------------

function formatRelative(iso) {
  if (!iso) return 'recently'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}
