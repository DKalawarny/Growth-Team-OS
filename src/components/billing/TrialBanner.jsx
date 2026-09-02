import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubscription } from '../../hooks/useSubscription'
import { PRICE_MONTHLY_USD, SHOW_PUBLIC_PRICE } from '../../lib/pricing'

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

  // ⚠️ 1 Sep — this banner ran during the private pilot. Daniel screenshotted it
  // saying "3 days left on your free trial. Upgrade now to keep access — or save
  // $294 with the annual plan" while SHOW_PUBLIC_PRICE is false and nothing is
  // charged. It told a pilot owner he was about to lose access and quoted him a
  // saving against a price that is not published anywhere.
  //
  // Same bug as the nine marketing pages, and it hid here because this lives in
  // the layout rather than on a page, so a sweep of src/pages missed it. There
  // is no trial to count down to while the product is free, and a countdown
  // with a price on it is the loudest possible version of the offer
  // contradiction — it is aimed at someone already inside the product.
  //
  // ⚠️ Anything that quotes a price or a deadline must derive from
  // SHOW_PUBLIC_PRICE. Do not hardcode either.
  if (!SHOW_PUBLIC_PRICE) return null

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
          <Link to="/settings/billing" className="underline hover:no-underline font-semibold">
            Upgrade now
          </Link>{' '}
          to keep access — or save ${PRICE_MONTHLY_USD * 2} with the{' '}
          <Link to="/settings/billing" className="underline hover:no-underline">
            annual plan
          </Link>.
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
