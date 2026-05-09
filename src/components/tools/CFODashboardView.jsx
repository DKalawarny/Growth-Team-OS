/**
 * CFODashboardView — renders the CFO Dashboard output from prompts.js.
 *
 * Layout (top to bottom):
 *   1. Headline band    period label + letter grade + 1-2 sentence summary
 *   2. KPI grid         5-8 cards with value + period-over-period delta
 *   3. Commentary       the fractional-CFO voice paragraph
 *   4. Flags two-up     green flags (left) + red flags (right)
 *   5. Trends           multi-period arrows
 *   6. Accountant Qs    pointed questions to take to the bookkeeper
 *   7. Next actions     numbered list of concrete next moves
 *   8. Books strip      3 recommended reads
 *
 * Defensive on every field — the prompt promises a shape but we still render
 * gracefully if Claude drops a section.
 *
 * Reused in two places: the live tool page /tools/cfo (result view) and the
 * Documents library detail expansion. Keep it pure — no fetching, no auth.
 */

import ToolDisclaimer from './ToolDisclaimer'

export default function CFODashboardView({ data, computedDeltas = {}, prevPeriodLabel = null }) {
  if (!data) return null

  const {
    period_label,
    summary,
    health_grade,
    kpis = [],
    commentary,
    green_flags = [],
    red_flags   = [],
    trends      = [],
    accountant_questions = [],
    next_actions = [],
    books        = [],
  } = data

  return (
    <div className="space-y-6">
      <HeadlineBand
        period={period_label}
        grade={health_grade}
        summary={summary}
      />

      {kpis.length > 0 && (
        <Section
          title="The numbers"
          hint={
            prevPeriodLabel
              ? `Arrows show change vs ${prevPeriodLabel}.`
              : 'Delta vs the prior period when we have it.'
          }
        >
          <KPIGrid kpis={kpis} computedDeltas={computedDeltas} prevPeriodLabel={prevPeriodLabel} />
        </Section>
      )}

      {commentary && (
        <Section title="What's going on">
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {commentary}
          </div>
        </Section>
      )}

      {(green_flags.length > 0 || red_flags.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FlagList
            tone="green"
            title="Worth celebrating"
            items={green_flags}
            emptyHint="Nothing green jumped out this period."
          />
          <FlagList
            tone="red"
            title="Needs attention"
            items={red_flags}
            emptyHint="No red flags — keep the discipline."
          />
        </div>
      )}

      {trends.length > 0 && (
        <Section title="Trends" hint="Multi-period reads. What's drifting vs holding steady.">
          <ul className="space-y-2">
            {trends.map((t, i) => <TrendRow key={i} trend={t} />)}
          </ul>
        </Section>
      )}

      {accountant_questions.length > 0 && (
        <Section
          title="Ask your accountant"
          hint="Copy-paste these into an email — they're sharper than 'how was my month'."
        >
          <ul className="space-y-2">
            {accountant_questions.map((q, i) => (
              <li key={i} className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
                <span className="text-brand-600 font-semibold mr-2">Q{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {next_actions.length > 0 && (
        <Section title="Do this in the next 2 weeks" hint="Ordered by leverage.">
          <ol className="space-y-2">
            {next_actions.map((a, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm text-gray-800">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1">{a}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {books.length > 0 && (
        <Section title="Go deeper">
          <div className="flex flex-wrap gap-2">
            {books.map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700"
              >
                <span aria-hidden>📖</span>
                {b}
              </span>
            ))}
          </div>
        </Section>
      )}

      <ToolDisclaimer toolId="cfo-dashboard" />
    </div>
  )
}

// ============================================================= Headline

function HeadlineBand({ period, grade, summary }) {
  const tone = gradeTone(grade)
  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-5 md:p-6`}>
      <div className="flex items-start gap-5">
        <div className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-2xl ${tone.badgeBg} ${tone.badgeText} flex flex-col items-center justify-center`}>
          <div className="text-3xl md:text-4xl font-bold leading-none">
            {grade || '—'}
          </div>
          <div className="text-[10px] uppercase tracking-wider mt-1 opacity-80">
            Health
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {period && (
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
              {period}
            </div>
          )}
          <h2 className={`text-xl md:text-2xl font-bold ${tone.headline}`}>
            {summary || 'Your books at a glance.'}
          </h2>
        </div>
      </div>
    </div>
  )
}

/**
 * Grade → colour tone. Mirrors Exit Readiness' scoreTone pattern so the app
 * feels coherent across tools.
 *
 * We peel off the +/− modifier so "B+" and "B-" both land in the same bucket,
 * then read the letter. Unknown grades (missing or weird) fall back to brand.
 */
function gradeTone(grade) {
  const letter = (grade || '').trim().charAt(0).toUpperCase()
  if (letter === 'A') return TONE.green
  if (letter === 'B') return TONE.brand
  if (letter === 'C') return TONE.amber
  return TONE.red
}

const TONE = {
  green: {
    border:    'border-green-200',
    bg:        'bg-green-50',
    badgeBg:   'bg-green-600',
    badgeText: 'text-white',
    headline:  'text-green-900',
  },
  brand: {
    border:    'border-brand-200',
    bg:        'bg-brand-50',
    badgeBg:   'bg-brand-600',
    badgeText: 'text-white',
    headline:  'text-brand-900',
  },
  amber: {
    border:    'border-amber-200',
    bg:        'bg-amber-50',
    badgeBg:   'bg-amber-500',
    badgeText: 'text-white',
    headline:  'text-amber-900',
  },
  red: {
    border:    'border-red-200',
    bg:        'bg-red-50',
    badgeBg:   'bg-red-600',
    badgeText: 'text-white',
    headline:  'text-red-900',
  },
}

// ============================================================= KPIs

function KPIGrid({ kpis, computedDeltas = {}, prevPeriodLabel = null }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {kpis.map((k, i) => (
        <KPICard
          key={i}
          kpi={k}
          computedDeltas={computedDeltas}
          prevPeriodLabel={prevPeriodLabel}
        />
      ))}
    </div>
  )
}

function KPICard({ kpi, computedDeltas = {}, prevPeriodLabel = null }) {
  const { label, value, period_over_period, is_estimate, note } = kpi
  const computed = computedDeltas[normLabel(label)]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </div>
        {is_estimate && (
          <span
            className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"
            title="Estimated — upload a P&L for the real number"
          >
            est.
          </span>
        )}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
        {value ?? '—'}
      </div>

      {/* Prefer computed (real data) over Claude's estimate */}
      {computed ? (
        <ComputedDelta delta={computed} prevPeriodLabel={prevPeriodLabel} />
      ) : period_over_period ? (
        <PeriodDelta delta={period_over_period} />
      ) : null}

      {note && (
        <div className="text-xs text-gray-600 mt-2 leading-relaxed">
          {note}
        </div>
      )}
    </div>
  )
}

/**
 * Trend pill derived from two real saved reads.
 * Arrow and percentage are visually separated so they're each readable
 * at a glance. isGood drives the colour; null (flat) is neutral grey.
 */
function ComputedDelta({ delta, prevPeriodLabel }) {
  const { pct, direction, isGood } = delta
  const isFlat = direction === 'flat'

  const colors = isFlat
    ? { bg: 'bg-gray-50', border: 'border-gray-200', arrow: 'text-gray-400', pct: 'text-gray-500' }
    : isGood
    ? { bg: 'bg-green-50', border: 'border-green-200', arrow: 'text-green-600', pct: 'text-green-700' }
    : { bg: 'bg-red-50',   border: 'border-red-200',   arrow: 'text-red-500',   pct: 'text-red-700'   }

  const arrow  = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const sign   = direction === 'up' ? '+' : direction === 'down' ? '−' : ''
  const label  = isFlat ? 'flat' : `${sign}${pct}%`

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${colors.bg} ${colors.border}`}>
        <span aria-hidden className={`text-base leading-none font-black ${colors.arrow}`}>{arrow}</span>
        <span className={`tabular-nums tracking-tight ${colors.pct}`}>{label}</span>
      </span>
      {prevPeriodLabel && (
        <span className="text-[10px] text-gray-400 leading-none">
          vs {prevPeriodLabel}
        </span>
      )}
    </div>
  )
}

/** Normalise a KPI label for fuzzy matching — same logic as CFO.jsx. */
function normLabel(label) {
  return (label || '').toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')
}

function PeriodDelta({ delta }) {
  const dir = delta?.direction
  const tone =
    dir === 'up'   ? 'text-green-700 bg-green-50 border-green-200'
    : dir === 'down' ? 'text-red-700 bg-red-50 border-red-200'
    : 'text-gray-600 bg-gray-50 border-gray-200'
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border ${tone}`}>
        <span aria-hidden>{arrow}</span>
        {delta?.delta ?? '—'}
      </span>
      {delta?.note && (
        <span className="text-xs text-gray-500">{delta.note}</span>
      )}
    </div>
  )
}

// ============================================================= Flags

function FlagList({ tone, title, items, emptyHint }) {
  const styles = tone === 'green'
    ? { border: 'border-green-200', bg: 'bg-green-50/50', dot: 'bg-green-500', heading: 'text-green-900' }
    : { border: 'border-red-200',   bg: 'bg-red-50/50',   dot: 'bg-red-500',   heading: 'text-red-900' }

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
      <div className={`text-sm font-semibold ${styles.heading} mb-2`}>
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 italic">{emptyHint}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
              <span className={`flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${styles.dot}`} />
              <span className="leading-relaxed">{f}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ============================================================= Trends

function TrendRow({ trend }) {
  const dir = trend?.direction
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : dir === 'volatile' ? '↕' : '→'
  const tone =
    dir === 'up'       ? 'text-green-700'
    : dir === 'down'     ? 'text-red-700'
    : dir === 'volatile' ? 'text-amber-700'
    : 'text-gray-600'
  return (
    <li className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3.5">
      <span className={`flex-shrink-0 text-lg font-semibold ${tone}`} aria-hidden>
        {arrow}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">
          {trend?.metric ?? 'Metric'}
        </div>
        {trend?.note && (
          <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            {trend.note}
          </div>
        )}
      </div>
    </li>
  )
}

// ============================================================= Section

function Section({ title, hint, children }) {
  return (
    <section>
      <div className="mb-2.5">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
