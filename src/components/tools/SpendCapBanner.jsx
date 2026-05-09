/**
 * SpendCapBanner — shown whenever a Claude call is blocked by the monthly
 * dollar spend cap. Renders the blocked-state copy AND two top-up buttons
 * ($5 / $10) that redirect to Stripe Checkout.
 *
 * Used in two places:
 *   - CapExceededNotice (tool pages) — when err.code === 'spend_cap_exceeded'
 *   - Advisor.jsx — inline chat error when spend cap is hit mid-conversation
 *
 * Props:
 *   err   SpendCapExceededError  — carries .used, .cap, .resetDate
 *   dark  bool (default false)   — true for the Advisor's dark bg
 */

import { useState } from 'react'
import { startTopUp } from '../../lib/subscriptions'

export default function SpendCapBanner({ err, dark = false }) {
  const [loading,  setLoading]  = useState(null) // 5 | 10 | null
  const [topupErr, setTopupErr] = useState(null)

  if (!err) return null

  const used  = Number(err.used ?? 0).toFixed(2)
  const cap   = Number(err.cap  ?? 10).toFixed(2)
  const reset = formatResetDate(err.resetDate)

  async function handleTopUp(amount) {
    setLoading(amount)
    setTopupErr(null)
    try {
      await startTopUp(amount)
      // startTopUp does a hard redirect — we only reach here on error
    } catch (e) {
      setTopupErr(e.message || 'Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  if (dark) {
    // ── Dark variant — for the Advisor chat (dark bg) ──────────────────────
    return (
      <div className="mx-4 my-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
        <div className="flex items-start gap-3">
          <span className="text-base leading-none mt-0.5">⏸</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">
              Monthly AI budget reached (${cap})
            </p>
            <p className="mt-1 text-ink-400">
              You've used ${used} of your ${cap} budget this month.
              Resets on <span className="text-ink-300">{reset}</span>.
            </p>
            <p className="mt-3 text-ink-300 text-xs font-medium uppercase tracking-wide">
              Add more to keep going
            </p>
            <div className="mt-2 flex gap-2">
              {[5, 10].map(amount => (
                <button
                  key={amount}
                  onClick={() => handleTopUp(amount)}
                  disabled={!!loading}
                  className="px-4 py-2 rounded-lg bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  {loading === amount ? 'Redirecting…' : `Add credits for $${amount}`}
                </button>
              ))}
            </div>
            {topupErr && (
              <p className="mt-2 text-red-400 text-xs">{topupErr}</p>
            )}
            <p className="mt-3 text-ink-600 text-xs">
              Instant — you'll be redirected to Stripe and back in under a minute. Top-ups add to your cap for this month only.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Light variant — for tool pages ─────────────────────────────────────────
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none" aria-hidden="true">⏸</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-amber-900">
            Monthly AI budget reached (${cap})
          </div>
          <p className="mt-1 text-amber-800">
            You've used ${used} of your ${cap} monthly AI budget.
            Your limit resets on <strong>{reset}</strong>.
          </p>

          <p className="mt-3 text-amber-900 font-medium text-xs uppercase tracking-wide">
            Add more to keep going
          </p>
          <div className="mt-2 flex gap-2">
            {[5, 10].map(amount => (
              <button
                key={amount}
                onClick={() => handleTopUp(amount)}
                disabled={!!loading}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {loading === amount ? 'Redirecting…' : `Add credits for $${amount}`}
              </button>
            ))}
          </div>
          {topupErr && (
            <p className="mt-2 text-red-600 text-xs">{topupErr}</p>
          )}
          <p className="mt-3 text-amber-700 text-xs">
            Instant — you'll be redirected to Stripe and back in under a minute. Top-ups add to your cap for this month only.
          </p>
        </div>
      </div>
    </div>
  )
}

function formatResetDate(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return 'the 1st of next month'
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  })
}
