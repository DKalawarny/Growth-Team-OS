import { Link } from 'react-router-dom'

/**
 * ExecutiveBriefCard — the intelligence layer surfaced on the Dashboard.
 *
 * Shows the synthesised cross-file analysis from the Library (summary + the
 * three-column strengths / gaps / opportunities picture) so the owner lands
 * every day on a live executive briefing, not just a task list.
 *
 * Only rendered when library_intelligence exists (i.e. the owner has uploaded
 * documents and run at least one analysis). Hidden otherwise — no empty states.
 *
 * Clicking "Full analysis →" takes them to the Uploaded tab in the Library
 * where the full panel, mileston suggestions, and Re-analyze button live.
 */
export default function ExecutiveBriefCard({ analysis }) {
  if (!analysis?.summary) return null

  const fileCount = analysis.file_count ?? 0
  const analyzedAt = analysis.analyzed_at ? formatRelative(analysis.analyzed_at) : null

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-ink-100 overflow-hidden">

      {/* Dark header */}
      <div className="bg-ink-900 px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Live green dot — signals this is current intelligence, not static */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400">
            Executive Briefing
          </span>
          {fileCount > 0 && (
            <span className="text-[10px] text-ink-500">
              · {fileCount} document{fileCount !== 1 ? 's' : ''} analyzed
              {analyzedAt ? ` · ${analyzedAt}` : ''}
            </span>
          )}
        </div>
        <Link
          to="/documents?view=uploaded"
          className="text-[10.5px] text-ink-400 hover:text-brand-400 transition-colors font-medium flex-shrink-0"
        >
          Full analysis →
        </Link>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* One-line business summary */}
        <p className="text-sm text-ink-700 leading-relaxed mb-4">
          {analysis.summary}
        </p>

        {/* Three-column signal grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SignalCol
            label="Strengths"
            items={analysis.strengths ?? []}
            color="green"
          />
          <SignalCol
            label="Gaps & Risks"
            items={analysis.gaps ?? []}
            color="amber"
          />
          <SignalCol
            label="Opportunities"
            items={analysis.opportunities ?? []}
            color="blue"
          />
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------

function SignalCol({ label, items, color }) {
  const styles = {
    green: { label: 'text-green-600', dot: 'bg-green-500', bg: 'bg-green-50 border-green-100' },
    amber: { label: 'text-brand-600', dot: 'bg-brand-500', bg: 'bg-brand-50 border-brand-100' },
    blue:  { label: 'text-blue-600',  dot: 'bg-blue-500',  bg: 'bg-blue-50  border-blue-100'  },
  }[color] ?? { label: 'text-ink-500', dot: 'bg-ink-400', bg: 'bg-ink-50 border-ink-100' }

  return (
    <div className={`rounded-lg border p-3 ${styles.bg}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${styles.label}`}>
        {label}
      </p>
      <ul className="space-y-1.5">
        {(items ?? []).slice(0, 3).map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-ink-700">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${styles.dot}`} />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ----------------------------------------------------------------------------

function formatRelative(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7)   return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
