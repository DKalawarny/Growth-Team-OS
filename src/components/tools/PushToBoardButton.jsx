import { Link } from 'react-router-dom'

/**
 * PushToBoardButton — small "→ Board" chip that takes any tool-generated
 * action item and pre-fills the new-task modal on /board.
 *
 * The Board page accepts a `?task=<encoded>` query param. When present, it
 * auto-opens the new-task modal with the title filled in. The user can edit,
 * assign, and save in one click.
 *
 * Usage:
 *   <PushToBoardButton title="Run a 30-day stand-up with the new hire" />
 *
 * Variants:
 *   default — small text-link style, fits inline next to a list item
 *   pill    — larger chip style, fits standalone in card footers
 */
export default function PushToBoardButton({ title, variant = 'default', label }) {
  const href = `/board?task=${encodeURIComponent(title || '')}`

  if (variant === 'pill') {
    return (
      <Link
        to={href}
        title="Add this to your Work Board"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 hover:bg-brand-100 hover:border-brand-300 transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
          <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
          <line x1="2.5" y1="6" x2="13.5" y2="6" />
          <circle cx="5" cy="9.5" r="0.75" fill="currentColor" />
        </svg>
        {label ?? 'Add to board'}
      </Link>
    )
  }

  return (
    <Link
      to={href}
      title="Add this to your Work Board"
      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-ink-400 hover:text-brand-600 transition-colors flex-shrink-0"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
        <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
        <line x1="2.5" y1="6" x2="13.5" y2="6" />
      </svg>
      {label ?? '→ Board'}
    </Link>
  )
}
