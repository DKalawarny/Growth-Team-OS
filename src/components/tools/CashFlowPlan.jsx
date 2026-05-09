/**
 * CashFlowPlan — pure presentation component for the JSON produced by
 * CASH_FLOW_PROMPT.
 *
 * Used in two places:
 *   - /tools/cash-flow (right after Claude returns)
 *   - /documents       (when opening a saved plan)
 *
 * Field names here MUST match the JSON shape the prompt returns. Numbers
 * arrive as raw integers/decimals so we can sum, threshold, and chart
 * without parsing.
 *
 * Visual order (intentional):
 *   1. Headline band     starting balance + runway + lowest-point callout
 *   2. Summary prose     plain-English "what this means"
 *   3. SVG chart         13 weekly bars, comfort-threshold line overlay
 *   4. Weekly table      inflow/outflow/balance, red when below threshold
 *   5. Key events        dated timeline of notable in/outflows
 *   6. Risks + Actions   two parallel lists, red/brand tones
 *
 * Why hand-rolled SVG instead of a chart library:
 *   Recharts + deps would add 60–80KB gzipped for one chart. A 13-bar
 *   column chart is ~40 lines of SVG. The constraints here are simple —
 *   single series, known axis, small range — so a library buys us no
 *   flexibility we'd actually use.
 */

import ToolDisclaimer from './ToolDisclaimer'

export default function CashFlowPlan({ data }) {
  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-gray-500">No content saved.</p>
  }

  const {
    summary,
    runway_weeks,
    starting_balance,
    comfort_threshold = 0,
    weeks = [],
    lowest_point,
    key_events = [],
    risks = [],
    actions = [],
  } = data

  return (
    <div className="space-y-6">
      {/* Headline band */}
      <HeadlineBand
        startingBalance={starting_balance}
        runwayWeeks={runway_weeks}
        comfortThreshold={comfort_threshold}
        lowest={lowest_point}
      />

      {summary && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Assessment
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{summary}</p>
        </div>
      )}

      {weeks.length > 0 && (
        <Section title="13-week balance projection" hint="Bars show weekly ending cash balance. Dashed line is your comfort threshold.">
          <BalanceChart
            weeks={weeks}
            comfortThreshold={comfort_threshold}
            lowest={lowest_point}
          />
        </Section>
      )}

      {weeks.length > 0 && (
        <Section title="Weekly detail">
          <WeeksTable
            weeks={weeks}
            comfortThreshold={comfort_threshold}
            lowestWeek={lowest_point?.week}
          />
        </Section>
      )}

      {key_events.length > 0 && (
        <Section title="On the calendar" hint="The moving parts — big deposits, tax bills, big purchases.">
          <ul className="space-y-1.5">
            {key_events.map((e, i) => <EventRow key={i} event={e} />)}
          </ul>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {risks.length > 0 && (
          <ListCard tone="red" title="Risks" icon="!" items={risks} />
        )}
        {actions.length > 0 && (
          <ListCard tone="brand" title="Do this month" icon="→" items={actions} />
        )}
      </div>

      <ToolDisclaimer toolId="cash-flow" />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Headline band
// ----------------------------------------------------------------------------

function HeadlineBand({ startingBalance, runwayWeeks, comfortThreshold, lowest }) {
  const runwayTone = runwayTag(runwayWeeks)
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Starting balance"
          value={formatCurrency(startingBalance)}
        />
        <Stat
          label="Runway"
          value={runwayWeeks == null ? '—' : `${runwayWeeks} wk${runwayWeeks === 1 ? '' : 's'}`}
          hint={runwayTone.hint}
          tone={runwayTone.tone}
        />
        <Stat
          label={lowest ? `Lowest point (wk ${lowest.week})` : 'Lowest point'}
          value={lowest ? formatCurrency(lowest.balance) : '—'}
          tone={lowest && lowest.balance < comfortThreshold ? 'red' : 'neutral'}
          hint={lowest?.note}
        />
      </div>
    </div>
  )
}

function Stat({ label, value, hint, tone = 'neutral' }) {
  const valueClass = {
    neutral: 'text-gray-900',
    brand:   'text-brand-700',
    amber:   'text-amber-700',
    red:     'text-red-700',
    green:   'text-green-700',
  }[tone] ?? 'text-gray-900'
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 leading-none ${valueClass}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">{hint}</div>}
    </div>
  )
}

/**
 * runwayTag — colour and one-line hint based on runway length.
 * Thresholds picked to match a rational advisor's gut: 13 weeks = you
 * didn't breach, 6+ = yellow-light "fine, but watch it", <6 = red.
 */
function runwayTag(w) {
  if (w == null) return { tone: 'green', hint: "You don't breach in the projection window." }
  if (w >= 13)   return { tone: 'green', hint: "You don't breach in the projection window." }
  if (w >= 6)    return { tone: 'amber', hint: 'Tight but workable with planning.' }
  return { tone: 'red', hint: 'Act this month. This is where payroll risk lives.' }
}

// ----------------------------------------------------------------------------
// SVG chart
// ----------------------------------------------------------------------------

/**
 * BalanceChart — 13 column bars + a dashed threshold line + a highlighted
 * lowest-point bar. Viewport is 600×180 logical units so it scales to
 * container width via `preserveAspectRatio='none'` on the x-axis.
 *
 * We compute:
 *   yMin = min(0, lowestBalance, threshold) — always include 0 so the
 *          chart doesn't lie about the scale
 *   yMax = max(startingBalance + headroom, highestBalance)
 * and map balances linearly into the plot area. Bars are positive-only —
 * if a balance goes negative, the bar extends BELOW the zero line and is
 * tinted red to signal the breach visually as well as colorimetrically.
 */
function BalanceChart({ weeks, comfortThreshold, lowest }) {
  if (!weeks.length) return null

  const balances = weeks.map(w => Number(w.ending_balance) || 0)
  const dataMax  = Math.max(...balances, comfortThreshold || 0)
  const dataMin  = Math.min(...balances, 0, comfortThreshold || 0)

  // Pad the top so bars don't touch the ceiling.
  const yMax = dataMax === 0 ? 1000 : dataMax * 1.1
  const yMin = dataMin < 0 ? dataMin * 1.1 : 0

  const W       = 600
  const H       = 180
  const padL    = 48
  const padR    = 8
  const padTop  = 8
  const padBot  = 24
  const plotW   = W - padL - padR
  const plotH   = H - padTop - padBot
  const barW    = plotW / weeks.length * 0.7
  const barGap  = plotW / weeks.length * 0.3

  const yToPx = (v) => padTop + (yMax - v) / (yMax - yMin) * plotH
  const zeroY      = yToPx(0)
  const thresholdY = yToPx(comfortThreshold)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        style={{ minHeight: 160 }}
      >
        {/* y-axis ticks: 0, comfort threshold, max */}
        {[yMin, 0, comfortThreshold, yMax].filter((v, i, a) => a.indexOf(v) === i && Number.isFinite(v)).map((v) => (
          <g key={v}>
            <line
              x1={padL} x2={W - padR}
              y1={yToPx(v)} y2={yToPx(v)}
              stroke="#f3f4f6" strokeWidth="1"
            />
            <text
              x={padL - 6} y={yToPx(v) + 3}
              fontSize="9" fill="#9ca3af" textAnchor="end"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {formatCompactCurrency(v)}
            </text>
          </g>
        ))}

        {/* zero line */}
        <line
          x1={padL} x2={W - padR}
          y1={zeroY} y2={zeroY}
          stroke="#d1d5db" strokeWidth="1"
        />

        {/* comfort threshold line */}
        {comfortThreshold > 0 && (
          <g>
            <line
              x1={padL} x2={W - padR}
              y1={thresholdY} y2={thresholdY}
              stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3"
            />
            <text
              x={W - padR - 2} y={thresholdY - 3}
              fontSize="9" fill="#b45309" textAnchor="end"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              comfort: {formatCompactCurrency(comfortThreshold)}
            </text>
          </g>
        )}

        {/* bars */}
        {weeks.map((w, i) => {
          const bal     = Number(w.ending_balance) || 0
          const x       = padL + i * (barW + barGap) + barGap / 2
          const isLow   = lowest?.week === w.week
          const breached = bal < comfortThreshold
          const yTop    = bal >= 0 ? yToPx(bal) : zeroY
          const yBot    = bal >= 0 ? zeroY       : yToPx(bal)
          const h       = Math.max(1, yBot - yTop)
          const fill    = bal < 0
            ? '#dc2626'        // negative → red-600
            : isLow
              ? '#b45309'      // lowest positive → amber-700
              : breached
                ? '#f59e0b'    // below comfort → amber-500
                : '#6366f1'    // healthy → brand (indigo-500)
          return (
            <g key={w.week}>
              <rect
                x={x} y={yTop} width={barW} height={h}
                fill={fill} rx="2"
              />
              {/* x-axis week label */}
              <text
                x={x + barW / 2}
                y={H - padBot + 12}
                fontSize="9" fill="#6b7280" textAnchor="middle"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {w.week}
              </text>
            </g>
          )
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mt-2 pl-12">
        <LegendSwatch color="#6366f1" label="Healthy" />
        <LegendSwatch color="#f59e0b" label="Below comfort" />
        <LegendSwatch color="#b45309" label="Lowest point" />
        <LegendSwatch color="#dc2626" label="Negative" />
      </div>
    </div>
  )
}

function LegendSwatch({ color, label }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Table
// ----------------------------------------------------------------------------

function WeeksTable({ weeks, comfortThreshold, lowestWeek }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2 font-semibold">Wk</th>
            <th className="px-3 py-2 font-semibold">Ending</th>
            <th className="px-3 py-2 font-semibold text-right">In</th>
            <th className="px-3 py-2 font-semibold text-right">Out</th>
            <th className="px-3 py-2 font-semibold text-right">Net</th>
            <th className="px-3 py-2 font-semibold text-right">Balance</th>
            <th className="px-3 py-2 font-semibold">Note</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => {
            const bal       = Number(w.ending_balance) || 0
            const breached  = bal < comfortThreshold
            const isLowest  = lowestWeek === w.week
            const rowBg     = isLowest
              ? 'bg-amber-50'
              : breached
                ? 'bg-red-50/40'
                : 'bg-white'
            return (
              <tr key={w.week} className={`border-b border-gray-100 last:border-0 ${rowBg}`}>
                <td className="px-3 py-2 font-medium text-gray-900">{w.week}</td>
                <td className="px-3 py-2 text-gray-600">{w.week_ending || '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                  {formatCurrency(w.inflow)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                  {formatCurrency(w.outflow)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${Number(w.net) < 0 ? 'text-red-700' : 'text-gray-800'}`}>
                  {formatSignedCurrency(w.net)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums font-medium ${breached ? 'text-red-700' : 'text-gray-900'}`}>
                  {formatCurrency(bal)}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{w.note || ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Events
// ----------------------------------------------------------------------------

function EventRow({ event }) {
  const isIn = event.direction === 'inflow'
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
        isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`} aria-hidden>
        {isIn ? '↑' : '↓'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{event.event}</span>
          <span className="text-xs text-gray-500">{event.when}</span>
        </div>
        {event.amount != null && (
          <div className={`text-xs tabular-nums ${isIn ? 'text-green-700' : 'text-red-700'}`}>
            {isIn ? '+' : '−'} {formatCurrency(Math.abs(event.amount))}
          </div>
        )}
      </div>
    </li>
  )
}

// ----------------------------------------------------------------------------
// Risks / actions list
// ----------------------------------------------------------------------------

function ListCard({ tone, title, icon, items }) {
  const t = tone === 'red'
    ? { bg: 'bg-red-50',   border: 'border-red-200',   iconText: 'text-red-600' }
    : { bg: 'bg-brand-50', border: 'border-brand-200', iconText: 'text-brand-600' }
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} p-4`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1.5">
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-800">
            <span className={`flex-shrink-0 font-semibold ${t.iconText}`} aria-hidden>
              {icon}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Section({ title, hint, children }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {title}
      </div>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {children}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Number formatting
// ----------------------------------------------------------------------------

/**
 * Locale-aware currency. We don't know the user's currency code yet (it
 * isn't in the profile as a required field), so we render as a decimal
 * with thousands separators — close enough and works across locales. When
 * currency becomes part of the profile, swap to Intl.NumberFormat with
 * { style: 'currency', currency }.
 */
function formatCurrency(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `$${Math.round(Number(n)).toLocaleString()}`
}

function formatSignedCurrency(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const v = Math.round(Number(n))
  if (v === 0) return '$0'
  const sign = v < 0 ? '−' : '+'
  return `${sign}$${Math.abs(v).toLocaleString()}`
}

/** Compact axis labels: $45,000 → $45k, $120,000 → $120k. */
function formatCompactCurrency(n) {
  if (n == null || Number.isNaN(Number(n))) return ''
  const v = Number(n)
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}m`
  if (Math.abs(v) >= 1_000)     return `$${Math.round(v / 1000)}k`
  return `$${Math.round(v)}`
}
