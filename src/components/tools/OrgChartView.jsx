/**
 * OrgChartView — pure presentation component for the JSON produced by
 * ORG_CHART_PROMPT.
 *
 * Used in two places:
 *   - /tools/org-chart (right after Claude returns)
 *   - /documents       (when opening a saved chart)
 *
 * Field names here MUST match the JSON shape the prompt returns. If the
 * prompt changes, update this file in the same commit.
 *
 * Why indented cards, not a flowchart:
 *   A real flowchart needs a graph library, pan/zoom, mobile breakpoints,
 *   and a lot of code for the fidelity most owners actually need. An
 *   indented tree of cards communicates the same hierarchy, stays readable
 *   on a phone, and prints cleanly. We can upgrade to a visual tree later
 *   when we hit the limits of this.
 *
 * Visual order (intentional):
 *   1. Summary
 *   2. Owner transition     — the emotional hook: "here's how YOUR job changes"
 *   3. Target org tree      — who reports to whom at the horizon
 *   4. Hiring sequence      — when each new hire happens and what it unlocks
 *   5. Risks
 *   6. Books
 */

import ToolDisclaimer from './ToolDisclaimer'

export default function OrgChartView({ data }) {
  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-gray-500">No content saved.</p>
  }

  const {
    summary,
    horizon_label,
    roles = [],
    hiring_sequence = [],
    owner_transition,
    risks = [],
    books = [],
  } = data

  return (
    <div className="space-y-6">
      {summary && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <div className="text-xs uppercase tracking-wide text-brand-700 mb-1">
            Target org · {horizon_label || 'Future state'}
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{summary}</p>
        </div>
      )}

      {owner_transition && <OwnerTransition block={owner_transition} />}

      {roles.length > 0 && (
        <Section
          title="Who does what"
          hint="Indentation = reporting line. Tag colour = existing vs. new vs. evolving role."
        >
          <RoleTree roles={roles} />
        </Section>
      )}

      {hiring_sequence.length > 0 && (
        <Section
          title="Hiring sequence"
          hint="Order matters more than speed. Each hire is in this position because it unlocks the next."
        >
          <ol className="space-y-2">
            {hiring_sequence.map((h, i) => <HireStep key={i} hire={h} />)}
          </ol>
        </Section>
      )}

      {risks.length > 0 && (
        <Section title="Watch-outs">
          <ul className="space-y-1.5">
            {risks.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-800">
                <span className="text-red-500 flex-shrink-0 font-semibold" aria-hidden>!</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
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

      <ToolDisclaimer toolId="org-chart" />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Owner transition — the "here's what changes for YOU" block
// ----------------------------------------------------------------------------

function OwnerTransition({ block }) {
  const { from, to, stop_doing = [], start_doing = [] } = block
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Your role shifts
      </div>

      {(from || to) && (
        <div className="flex items-start gap-3 flex-wrap mb-4">
          <div className="flex-1 min-w-[180px] rounded-lg bg-gray-50 border border-gray-200 p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
              Today
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{from || '—'}</p>
          </div>
          <div className="text-gray-300 text-xl self-center" aria-hidden>→</div>
          <div className="flex-1 min-w-[180px] rounded-lg bg-brand-50 border border-brand-200 p-3">
            <div className="text-[10px] uppercase tracking-wide text-brand-700 font-semibold mb-1">
              Target state
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{to || '—'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {stop_doing.length > 0 && (
          <StopStartList
            tone="red"
            title="Stop doing"
            icon="×"
            items={stop_doing}
          />
        )}
        {start_doing.length > 0 && (
          <StopStartList
            tone="green"
            title="Start doing"
            icon="✓"
            items={start_doing}
          />
        )}
      </div>
    </div>
  )
}

function StopStartList({ tone, title, icon, items }) {
  const t = tone === 'red'
    ? { bg: 'bg-red-50',   border: 'border-red-200',   iconText: 'text-red-600' }
    : { bg: 'bg-green-50', border: 'border-green-200', iconText: 'text-green-600' }
  return (
    <div className={`rounded-lg border ${t.border} ${t.bg} p-3`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1.5">
        {title}
      </div>
      <ul className="space-y-1">
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

// ----------------------------------------------------------------------------
// Role tree — indented hierarchy driven by reports_to
// ----------------------------------------------------------------------------

/**
 * Builds a lookup from title -> children, then renders recursively starting
 * from roles with reports_to === null.
 *
 * Defensive bits worth calling out:
 *   - Titles should be unique within a tree. Prompt enforces this implicitly
 *     but if it ever returns two "Manager" roles, we de-dup on render by
 *     treating them as siblings with the same parent.
 *   - If a reports_to points at a non-existent title, that role is orphaned —
 *     we surface it in an "Unreporting" group at the bottom so nothing gets
 *     silently dropped.
 *   - Tree depth is capped at 6 levels (defensive — no sane SMB org goes
 *     deeper, but a bad prompt response could cycle infinitely otherwise).
 */
function RoleTree({ roles }) {
  const byParent = new Map()
  const titles   = new Set()
  for (const r of roles) titles.add(r.title)
  for (const r of roles) {
    const key = r.reports_to && titles.has(r.reports_to) ? r.reports_to : '__root__'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(r)
  }

  // Orphans: roles that named a reports_to that doesn't exist in the tree.
  const orphans = roles.filter(
    r => r.reports_to && !titles.has(r.reports_to)
  )
  const roots = byParent.get('__root__') ?? []

  return (
    <div className="space-y-2">
      {roots.map(r => (
        <RoleBranch key={r.title} role={r} byParent={byParent} depth={0} />
      ))}
      {orphans.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">
            Unreporting
          </div>
          <div className="space-y-2">
            {orphans.map(r => <RoleCard key={r.title} role={r} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function RoleBranch({ role, byParent, depth }) {
  const children = byParent.get(role.title) ?? []
  const MAX_DEPTH = 6
  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 16 }}>
      <RoleCard role={role} depth={depth} />
      {children.length > 0 && depth < MAX_DEPTH && (
        <div className="mt-2 pl-3 border-l-2 border-gray-100 space-y-2">
          {children.map(c => (
            <RoleBranch
              key={c.title}
              role={c}
              byParent={byParent}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * RoleCard — one seat in the org. Tag in the top-right labels the role's
 * type (existing / transition / new-hire) with a colour that matches its
 * role in the narrative:
 *   existing   = neutral gray (no action needed)
 *   transition = amber (something has to change here)
 *   new-hire   = brand (you need to find this person)
 */
function RoleCard({ role, depth = 0 }) {
  const typeBadge = TYPE_BADGES[role?.type] ?? TYPE_BADGES.existing
  const rings = depth === 0
    ? 'border-gray-300 shadow-sm'
    : 'border-gray-200'
  return (
    <div className={`rounded-lg border ${rings} bg-white p-3`}>
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900">
            {role.title}
            {role.headcount > 1 && (
              <span className="text-xs text-gray-400 ml-1 font-normal">
                × {role.headcount}
              </span>
            )}
          </div>
          {role.hire_by && role.type === 'new-hire' && (
            <div className="text-xs text-brand-700 mt-0.5">
              Hire by {role.hire_by}
            </div>
          )}
        </div>
        <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${typeBadge.classes}`}>
          {typeBadge.label}
        </span>
      </div>

      {role.note && (
        <p className="text-xs text-gray-600 italic mt-2">{role.note}</p>
      )}

      {Array.isArray(role.responsibilities) && role.responsibilities.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
            Owns
          </div>
          <ul className="space-y-0.5">
            {role.responsibilities.map((r, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-gray-700">
                <span className="text-gray-300 flex-shrink-0" aria-hidden>•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(role.key_kpis) && role.key_kpis.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
            Measured by
          </div>
          <div className="flex flex-wrap gap-1">
            {role.key_kpis.map((k, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const TYPE_BADGES = {
  'existing':   { label: 'Existing',   classes: 'bg-gray-100 text-gray-700' },
  'transition': { label: 'Evolves',    classes: 'bg-amber-100 text-amber-800' },
  'new-hire':   { label: 'New hire',   classes: 'bg-brand-100 text-brand-800' },
}

// ----------------------------------------------------------------------------
// Hiring step
// ----------------------------------------------------------------------------

function HireStep({ hire }) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3 flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white font-semibold text-sm flex items-center justify-center">
        {hire.order}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="text-sm font-semibold text-gray-900">{hire.role}</div>
          {hire.hire_by && (
            <div className="text-xs text-brand-700 font-medium">
              Hire by {hire.hire_by}
            </div>
          )}
        </div>
        {hire.why_this_first && (
          <div className="mt-1.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              Why this first
            </div>
            <p className="text-xs text-gray-700 mt-0.5">{hire.why_this_first}</p>
          </div>
        )}
        {hire.unlocks && (
          <div className="mt-1.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              Unlocks
            </div>
            <p className="text-xs text-gray-700 mt-0.5">{hire.unlocks}</p>
          </div>
        )}
      </div>
    </li>
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
