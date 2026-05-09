/**
 * CapExceededNotice — shown in place of the usual red error strip when a
 * tool run was blocked by the monthly cap. Every tool page renders this
 * when its error handler sees a CapExceededError.
 *
 * Why its own component (not inline in each tool):
 *   - Same copy + same layout on all 8 tools = less drift
 *   - If we change the contact link or add a "request higher cap" CTA
 *     later, one file to update
 *
 * Props map 1:1 to CapExceededError fields so the caller just does:
 *   <CapExceededNotice err={err} />
 *
 * The err object comes from usage.js:
 *   { toolId, used, cap, resetDate }
 */

import { Link } from 'react-router-dom'
import SpendCapBanner from './SpendCapBanner'

export default function CapExceededNotice({ err, toolLabel }) {
  if (!err) return null

  // Spend cap exceeded — show top-up buttons instead of the plain notice.
  if (err.code === 'spend_cap_exceeded') {
    return <SpendCapBanner err={err} />
  }

  // Per-tool call cap exceeded — original notice.
  const label = toolLabel || err.toolId || 'this tool'
  const reset = formatResetDate(err.resetDate)

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none" aria-hidden="true">⏸</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-amber-900">
            Monthly cap reached for {label}
          </div>
          <p className="mt-1 text-amber-800">
            You've used {err.used} of {err.cap} runs for this tool this month.
            Your allowance resets on <strong>{reset}</strong>.
          </p>
          <p className="mt-2 text-amber-800">
            Need it raised sooner?{' '}
            <Link to="/settings" className="underline hover:text-amber-950">
              Check usage in Settings
            </Link>
            {' '}or email{' '}
            <a
              href="mailto:dkalawarny@hotmail.com?subject=Raise%20my%20monthly%20tool%20cap"
              className="underline hover:text-amber-950"
            >
              dkalawarny@hotmail.com
            </a>
            {' '}and we'll bump your limit.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * "May 1, 2026" — readable, unambiguous, locale-sensible. Falls back to the
 * ISO date if the input isn't a Date (shouldn't happen, but defensive).
 */
function formatResetDate(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return 'the 1st of next month'
  }
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  })
}
