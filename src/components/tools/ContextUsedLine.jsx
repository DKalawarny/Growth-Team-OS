import { formatContextSummaryParts } from '../../lib/toolContextSummary'

/**
 * ContextUsedLine — "Based on: …" transparency strip rendered above tool
 * results. Shows the owner exactly which inputs the AI saw — business
 * profile, milestone count, uploaded files, financial snapshots, etc.
 *
 * Why above the result, not below:
 *   The owner reads the answer with that frame in mind. Seeing it AFTER
 *   would feel like a footnote; seeing it FIRST sets the right scepticism
 *   ("did I miss uploading the latest P&L?") before they react to the
 *   answer.
 *
 * Renders nothing when the summary is empty — keeps the JSX call site
 * forgiving for tools that don't pass a context object.
 *
 * Drives off the structured summary produced by lib/toolContextSummary.js
 * which is also persisted onto documents.input_data so old saved docs
 * keep their provenance line.
 */
export default function ContextUsedLine({ summary, className = '' }) {
  const parts = formatContextSummaryParts(summary)
  if (parts.length === 0) return null

  return (
    <div
      className={`bg-ink-50 border border-ink-100 rounded-lg px-4 py-2.5 text-[11px] leading-snug ${className}`}
    >
      <span className="font-semibold text-ink-700">Based on: </span>
      <span className="text-ink-600">{parts.join(' · ')}</span>
    </div>
  )
}
