import { getToolDisclaimer } from '../../lib/toolDisclaimers'

/**
 * ToolDisclaimer — small italicised note rendered at the foot of every
 * tool result. Pulls the right one-liner from lib/toolDisclaimers.js by
 * tool_id.
 *
 * Drops itself silently when no disclaimer is registered for the tool —
 * keeps the JSX call site forgiving so it can be added everywhere.
 *
 * Used in:
 *   - Each tool's result component (HiringScorecard, OfferBuilderCard, …)
 *     so the note follows the result wherever it's shown — fresh on the
 *     tool page AND later when reopening from /documents.
 */
export default function ToolDisclaimer({ toolId, className = '' }) {
  const text = getToolDisclaimer(toolId)
  if (!text) return null

  return (
    <p
      className={`text-[11px] text-ink-500 leading-snug border-t border-ink-100 pt-3 mt-5 ${className}`}
    >
      <span className="font-semibold text-ink-600">Note: </span>
      {text}
    </p>
  )
}
