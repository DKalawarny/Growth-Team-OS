/**
 * ExitReadinessReport — pure presentation component for the JSON produced by
 * EXIT_READINESS_PROMPT.
 *
 * Used in two places:
 *   - /tools/exit-readiness (right after Claude returns)
 *   - /documents            (when opening a saved report)
 *
 * Field names here MUST match the JSON shape the prompt returns. If the
 * prompt changes, update this file in the same commit.
 *
 * Visual hierarchy (intentional):
 *   1. Big score + grade — the one number the owner cares about
 *   2. Plain-English summary — "what this means for me"
 *   3. Driver bars — where the score came from, grouped by color
 *   4. Strengths / Risks / Quick wins — three parallel lists
 *   5. Books — footnote, not a section
 *
 * Colour tone:
 *   green = strengths (real wins)
 *   red   = risks (what buyers would ding)
 *   brand = quick wins (things you can act on this quarter)
 */

import ToolDisclaimer from './ToolDisclaimer'

export default function ExitReadinessReport({ data }) {
  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-gray-500">No content saved.</p>
  }

  const {
    overall_score,
    grade,
    summary,
    drivers = [],
    strengths = [],
    risks = [],
    quick_wins = [],
    books = [],
  } = data

  return (
    <div className="space-y-6">
      {/* Headline score — visual anchor of the report */}
      <HeadlineScore score={overall_score} grade={grade} summary={summary} />

      {/* Drivers */}
      {drivers.length > 0 && (
        <Section
          title="Driver breakdown"
          hint="Each driver is what a buyer looks at. The weight next to it is how much it moves the overall score."
        >
          <div className="space-y-3">
            {drivers.map((d, i) => <DriverRow key={i} driver={d} />)}
          </div>
        </Section>
      )}

      {/* Three-column-ish lists, but stack on narrow widths for readability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strengths.length > 0 && (
          <ListCard tone="green" title="Strengths" icon="✓" items={strengths} />
        )}
        {risks.length > 0 && (
          <ListCard tone="red" title="Risks" icon="!" items={risks} />
        )}
      </div>

      {quick_wins.length > 0 && (
        <ListCard
          tone="brand"
          title="Quick wins"
          icon="→"
          hint="Actions you could start this quarter that would materially lift the score."
          items={quick_wins}
        />
      )}

      {books.length > 0 && (
        <Section title="Further reading">
          <ul className="flex flex-wrap gap-2">
            {books.map((b, i) => (
              <li
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs text-gray-700"
              >
                <span aria-hidden>📖</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <ToolDisclaimer toolId="exit-readiness" />
    </div>
  )
}

/**
 * HeadlineScore — big number + grade + summary. This is the "screenshot
 * moment" of the report — what someone would paste into a slack thread.
 */
function HeadlineScore({ score, grade, summary }) {
  const s    = clampScore(score)
  const tone = scoreTone(s)
  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-6`}>
      <div className="flex items-start gap-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-5xl font-bold text-gray-900 leading-none">
            {Number.isFinite(s) ? s : '—'}
            <span className="text-xl text-gray-400 font-medium">/100</span>
          </div>
          {grade && (
            <div className={`text-2xl font-bold ${tone.gradeText} px-3 py-1 rounded-lg bg-white/70 border ${tone.border}`}>
              {grade}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-[240px]">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Sellability score
          </div>
          {summary && (
            <p className="text-sm text-gray-800 leading-relaxed">{summary}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * DriverRow — name on the left, score + weight on the right, bar underneath,
 * note below. Bar colour shifts with score so the eye can scan which drivers
 * are pulling the grade down without reading the numbers.
 */
function DriverRow({ driver }) {
  const score = clampScore(driver?.score)
  const tone  = scoreTone(score)
  const pct   = Number.isFinite(score) ? score : 0
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium text-gray-900">{driver?.name ?? 'Driver'}</div>
        <div className="flex items-baseline gap-2 text-xs">
          <span className="text-gray-400">weight {driver?.weight_pct ?? 0}%</span>
          <span className={`font-semibold ${tone.text}`}>
            {Number.isFinite(score) ? score : '—'}
          </span>
        </div>
      </div>
      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${tone.bar} transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {driver?.note && (
        <p className="text-xs text-gray-600 mt-2 leading-relaxed">{driver.note}</p>
      )}
    </div>
  )
}

/**
 * ListCard — reusable tone-aware list. Kept simple so the three parallel
 * lists (strengths / risks / quick_wins) feel visually consistent.
 */
function ListCard({ tone, title, icon, hint, items }) {
  const t = toneStyles[tone] ?? toneStyles.brand
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} p-4`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1">
        {title}
      </div>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
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
// Styling helpers
// ----------------------------------------------------------------------------

/**
 * Score → colour tone. Thresholds mirror the grade bands in the prompt:
 *   85+  strong (green)
 *   65+  workable (brand/blue — "you've got bones")
 *   <65  needs work (amber/red-ish)
 * Keeping this centralised so tweaking the bands is a one-line change.
 */
function scoreTone(score) {
  if (!Number.isFinite(score)) return toneStyles.neutral
  if (score >= 75) return toneStyles.green
  if (score >= 60) return toneStyles.brand
  if (score >= 45) return toneStyles.amber
  return toneStyles.red
}

const toneStyles = {
  green:   {
    bg:         'bg-green-50',
    border:     'border-green-200',
    bar:        'bg-green-500',
    text:       'text-green-700',
    iconText:   'text-green-600',
    gradeText:  'text-green-700',
  },
  brand:   {
    bg:         'bg-brand-50',
    border:     'border-brand-200',
    bar:        'bg-brand-500',
    text:       'text-brand-700',
    iconText:   'text-brand-600',
    gradeText:  'text-brand-700',
  },
  amber:   {
    bg:         'bg-amber-50',
    border:     'border-amber-200',
    bar:        'bg-amber-500',
    text:       'text-amber-700',
    iconText:   'text-amber-600',
    gradeText:  'text-amber-700',
  },
  red:     {
    bg:         'bg-red-50',
    border:     'border-red-200',
    bar:        'bg-red-500',
    text:       'text-red-700',
    iconText:   'text-red-600',
    gradeText:  'text-red-700',
  },
  neutral: {
    bg:         'bg-gray-50',
    border:     'border-gray-200',
    bar:        'bg-gray-400',
    text:       'text-gray-700',
    iconText:   'text-gray-500',
    gradeText:  'text-gray-700',
  },
}

function clampScore(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  return Math.max(0, Math.min(100, Math.round(v)))
}
