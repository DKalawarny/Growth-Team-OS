/**
 * RocksPlan — renders the Rocks Tracker output from prompts.js.
 *
 * Layout (top to bottom):
 *   1. Theme banner          quarter label + coined theme + 1-2 sentence summary
 *   2. Company rocks         3-5 cards, each with owner, DoD checklist, weekly
 *                            milestones timeline, and failure-mode traps
 *   3. Individual rocks      0-3, rendered the same shape but tinted to mark
 *                            them as people-level rather than company-level
 *   4. What we're NOT doing  the discipline-of-focus section — this is why
 *                            the plan actually works
 *   5. Risks                 cross-rock risks the owner should watch
 *   6. Books                 1-3 related reads as chips
 *
 * Every field is rendered defensively — we never crash if Claude drops a
 * section. Reused by /tools/rocks (live result) and the Documents library
 * (saved rocks plan).
 */

const CATEGORY_STYLES = {
  revenue:    { dot: 'bg-emerald-500', text: 'text-emerald-800', bg: 'bg-emerald-50',  border: 'border-emerald-200', label: 'Revenue' },
  ops:        { dot: 'bg-sky-500',     text: 'text-sky-800',     bg: 'bg-sky-50',      border: 'border-sky-200',     label: 'Ops' },
  team:       { dot: 'bg-teal-500',    text: 'text-teal-800',    bg: 'bg-teal-50',     border: 'border-teal-200',    label: 'Team' },
  cash:       { dot: 'bg-amber-500',   text: 'text-amber-800',   bg: 'bg-amber-50',    border: 'border-amber-200',   label: 'Cash' },
  systems:    { dot: 'bg-blue-500',    text: 'text-blue-800',    bg: 'bg-blue-50',     border: 'border-blue-200',    label: 'Systems' },
  exit:       { dot: 'bg-rose-500',    text: 'text-rose-800',    bg: 'bg-rose-50',     border: 'border-rose-200',    label: 'Exit' },
  foundation: { dot: 'bg-gray-500',    text: 'text-gray-800',    bg: 'bg-gray-50',     border: 'border-gray-200',    label: 'Foundation' },
}

function categoryStyle(cat) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.foundation
}

import ToolDisclaimer from './ToolDisclaimer'

export default function RocksPlan({ data }) {
  if (!data) return null

  const {
    quarter_label,
    theme,
    summary,
    company_rocks    = [],
    individual_rocks = [],
    what_we_are_NOT_doing = [],
    risks            = [],
    books            = [],
  } = data

  return (
    <div className="space-y-6">
      <ThemeBanner
        quarter={quarter_label}
        theme={theme}
        summary={summary}
        rockCount={company_rocks.length}
      />

      {company_rocks.length > 0 && (
        <Section
          title="Company Rocks"
          hint="The 3–5 things that, if done, make this quarter a win."
        >
          <div className="space-y-3">
            {company_rocks.map((r, i) => (
              <RockCard key={i} rock={r} index={i + 1} scope="company" />
            ))}
          </div>
        </Section>
      )}

      {individual_rocks.length > 0 && (
        <Section
          title="Individual Rocks"
          hint="Person-level priorities. Each one has a single owner."
        >
          <div className="space-y-3">
            {individual_rocks.map((r, i) => (
              <RockCard key={i} rock={r} index={i + 1} scope="individual" />
            ))}
          </div>
        </Section>
      )}

      {what_we_are_NOT_doing.length > 0 && (
        <Section
          title="What we're NOT doing"
          hint="Tempting, but deferred. Naming them is how focus holds."
        >
          <ul className="space-y-2">
            {what_we_are_NOT_doing.map((item, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 text-sm text-gray-700">
                <span className="flex-shrink-0 text-gray-400 font-semibold" aria-hidden>✕</span>
                <span className="flex-1 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {risks.length > 0 && (
        <Section
          title="Risks to watch"
          hint="Cross-rock — cash, capacity, key-person, seasonal."
        >
          <ul className="space-y-2">
            {risks.map((r, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-sm text-amber-900">
                <span className="flex-shrink-0 mt-0.5" aria-hidden>⚠︎</span>
                <span className="flex-1 leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
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

      <ToolDisclaimer toolId="rocks-tracker" />
    </div>
  )
}

// ============================================================= Theme banner

function ThemeBanner({ quarter, theme, summary, rockCount }) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 md:p-6">
      <div className="flex items-start gap-5">
        <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-brand-600 text-white flex flex-col items-center justify-center">
          <div className="text-3xl md:text-4xl leading-none" aria-hidden>🪨</div>
          <div className="text-[10px] uppercase tracking-wider mt-1.5 opacity-90">
            {rockCount} {rockCount === 1 ? 'Rock' : 'Rocks'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {quarter && (
            <div className="text-xs uppercase tracking-wider text-brand-700 mb-1">
              {quarter}
            </div>
          )}
          {theme && (
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
              {theme}
            </h2>
          )}
          {summary && (
            <p className="text-sm md:text-base text-gray-700 mt-1.5 leading-relaxed">
              {summary}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================= Rock card

function RockCard({ rock, index, scope }) {
  const {
    title,
    owner,
    category,
    why_this,
    definition_of_done = [],
    weekly_milestones  = [],
    traps              = [],
  } = rock ?? {}

  const cat = categoryStyle(category)
  const scopeBadge = scope === 'individual'
    ? { cls: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Individual' }
    : { cls: 'bg-brand-50 text-brand-700 border-brand-200',    label: 'Company' }

  return (
    <article className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <header className="p-4 md:p-5 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${cat.bg} ${cat.border} border flex items-center justify-center text-xs font-bold ${cat.text}`}>
            {index}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${scopeBadge.cls}`}>
                {scopeBadge.label}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cat.bg} ${cat.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} aria-hidden />
                {cat.label}
              </span>
            </div>
            <h4 className="text-base md:text-lg font-semibold text-gray-900 leading-snug">
              {title ?? 'Untitled rock'}
            </h4>
            {owner && (
              <div className="text-xs text-gray-600 mt-1">
                Owner: <span className="font-medium text-gray-800">{owner}</span>
              </div>
            )}
          </div>
        </div>

        {why_this && (
          <p className="mt-3 text-sm text-gray-700 leading-relaxed italic">
            {why_this}
          </p>
        )}
      </header>

      {/* Definition of done */}
      {definition_of_done.length > 0 && (
        <div className="p-4 md:p-5 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Done when
          </div>
          <ul className="space-y-1.5">
            {definition_of_done.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border border-gray-300 bg-white" aria-hidden />
                <span className="leading-relaxed">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weekly milestones */}
      {weekly_milestones.length > 0 && (
        <div className="p-4 md:p-5 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Weekly rhythm
          </div>
          <ol className="space-y-2.5">
            {weekly_milestones.map((m, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-16 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded px-1.5 py-0.5 text-center self-start">
                  {m?.week ?? `Week ${i + 1}`}
                </div>
                <div className="flex-1 text-sm text-gray-800 leading-relaxed pt-0.5">
                  {m?.milestone ?? '—'}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Traps */}
      {traps.length > 0 && (
        <div className="p-4 md:p-5 bg-gray-50/60">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            How this usually fails
          </div>
          <ul className="space-y-1.5">
            {traps.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="flex-shrink-0 mt-0.5 text-gray-400" aria-hidden>⚠︎</span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
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
