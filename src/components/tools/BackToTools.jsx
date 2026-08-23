import { Link } from 'react-router-dom'

/**
 * BackToTools — the escape hatch at the top of every tool page.
 *
 * ⚠️ WHY THIS EXISTS
 *
 * Tool pages had no way back except a "Cancel" link at the BOTTOM of the form.
 * That is not the same thing, for two reasons an audit in the browser makes
 * obvious and a read of the source does not:
 *
 *   1. It is below the fold on every one of these pages. Getting out of a tool
 *      meant scrolling down past the thing you had decided not to fill in.
 *   2. Once a result renders, the form — and with it the only Cancel — is
 *      replaced. At that point there is no way back to /tools at all except the
 *      browser's own back button, and two of the pages (Decision, Safety) never
 *      had one in the first place.
 *
 * The sidebar has no /tools entry either, so this is genuinely the only route
 * back to the grid from inside a tool.
 *
 * Kept deliberately quiet: ink-400, small, no button chrome. It is a way out,
 * not a call to action, and the page already has one of those.
 */
export default function BackToTools({ className = '' }) {
  return (
    <Link
      to="/tools"
      className={`inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-700 transition-colors ${className}`}
    >
      <span aria-hidden>←</span> All tools
    </Link>
  )
}
