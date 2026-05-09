import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubscription } from '../../hooks/useSubscription'

/**
 * TrialBanner — sticky top banner shown to users in the last stretch of
 * their free trial. Purely a nudge toward /settings; doesn't block anything
 * (the paywall handles the hard stop at day 0).
 *
 * Shown when ALL of:
 *   - no paid subscription exists (status.kind === 'trialing' with no
 *     subscription row means the trial is company.trial_ends_at-driven)
 *   - 3 or fewer days remain
 *   - the user hasn't dismissed it in this browser session
 *
 * Hidden in every other case — don't waste screen space on users who've
 * just signed up, or on paying users whose renewal is weeks out. sessionStorage
 * dismissal is intentional: per-tab, not per-forever. If someone dismisses
 * with 3 days left, we want to re-show at 1 day.
 *
 * Placement: inside AppLayout, above <Outlet />. All authed + profile-complete
 * surfaces get it uniformly; no per-page opt-in.
 */

const DISMISS_KEY = 'growthos:trial-banner-dismissed'

export default function TrialBanner() {
  const { subscription, status, loading } = useSubscription()

  // Dismissal state — seeded from sessionStorage so a navigation doesn't
  // resurrect the banner mid-session. No useEffect: a lazy initializer is
  // enough because the key is only read at mount and written on click.
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1' }
    catch { return false }   // SSR / storage-denied — fall through
  })

  if (loading || dismissed) return null

  // Only the no-paid-sub trial case qualifies. A Stripe-managed trial
  // (which would have subscription != null AND status.kind === 'active')
  // is the user's problem to manage via the portal — we don't need to
  // warn them.
  if (subscription) return null
  if (status.kind !== 'trialing') return null

  const { daysLeft } = status
  if (daysLeft > 3) return null

  const onDismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  // Copy tightens as the countdown shrinks — subtle pressure, not alarm.
  const message =
    daysLeft === 0 ? 'Your free trial ends today.' :
    daysLeft === 1 ? '1 day left on your free trial.' :
                     `${daysLeft} days left on your free trial.`

  const tone = daysLeft <= 1
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-amber-50 border-amber-200 text-amber-800'

  return (
    <div
      className={`border-b ${tone} text-sm`}
      role="status"
    >
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <span className="flex-1">
          <strong className="font-semibold">{message}</strong>{' '}
          <Link to="/settings" className="underline hover:no-underline">
            Upgrade now
          </Link>{' '}
          to keep using the tools.
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-current opacity-70 hover:opacity-100 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
