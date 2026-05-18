import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubscription } from '../../hooks/useSubscription'
import { startCheckout, openPortal } from '../../lib/subscriptions'
import { PRICE_MONTHLY_USD, TRIAL_DAYS } from '../../lib/pricing'

/**
 * Paywall — full-card screen shown when a user without active access
 * lands on a gated route (tool routes). The route stays at its original
 * URL so bookmarks survive and the user sees which tool they were trying
 * to reach; the guard just swaps in this component for the tool body.
 *
 * States (derived from useSubscription().status, same shapes as BillingSection):
 *
 *   expired   trial ran out, never paid          → "Upgrade now"
 *   canceled  previously subscribed, now gone    → "Reactivate"
 *   past_due  card failed                        → "Update payment"
 *
 * We intentionally don't render this for `trialing` — trial users still
 * have access, so the guard never puts them here.
 */

export default function Paywall() {
  const { status } = useSubscription()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const upgrade = async () => {
    setErr(null); setBusy(true)
    try { await startCheckout('owner') }
    catch (e) { setErr(e.message || 'Could not start checkout'); setBusy(false) }
  }

  const portal = async () => {
    setErr(null); setBusy(true)
    try { await openPortal() }
    catch (e) {
      if (e.message === 'no_customer') { await upgrade(); return }
      setErr(e.message || 'Could not open billing portal')
      setBusy(false)
    }
  }

  // Pick the copy + primary action based on why access was denied.
  const content = pickContent(status)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <LockBadge tone={content.tone} />
        <h1 className="text-2xl font-bold text-gray-900 mt-4">{content.title}</h1>
        <p className="text-gray-600 mt-2 leading-relaxed">{content.body}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {content.primary === 'portal' ? (
            <button
              type="button"
              onClick={portal}
              disabled={busy}
              className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white text-sm font-medium transition-colors"
            >
              {busy ? 'Opening Stripe…' : 'Update payment method'}
            </button>
          ) : (
            <button
              type="button"
              onClick={upgrade}
              disabled={busy}
              className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white text-sm font-medium transition-colors"
            >
              {busy ? 'Redirecting to Stripe…' : content.primaryLabel}
            </button>
          )}

          <Link
            to="/pricing"
            className="px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
          >
            See what's included
          </Link>
        </div>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

        {/* Trust signals */}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
          {['Cancel any time — no lock-in', `${TRIAL_DAYS}-day money-back guarantee`, 'Your data stays yours'].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M13.28 4.22a.75.75 0 010 1.06l-6.5 6.5a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06l2.47 2.47 5.97-5.97a.75.75 0 011.06 0z"/></svg>
              {t}
            </span>
          ))}
        </div>

        <hr className="my-6 border-gray-100" />

        <div className="text-sm text-gray-500 space-y-2">
          <p>
            <Link to="/settings" className="text-brand-600 hover:underline">
              Billing settings
            </Link>
            {' · '}
            <Link to="/dashboard" className="text-brand-600 hover:underline">
              Back to dashboard
            </Link>
          </p>
          <p>
            Need help?{' '}
            <a href="mailto:support@leadeos.com" className="text-brand-600 hover:underline">
              support@leadeos.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Copy selection — keep the component body above readable by pushing the
// branch-specific strings here. Each branch returns the same shape so the
// renderer stays uniform.
// ----------------------------------------------------------------------------

function pickContent(status) {
  if (status.kind === 'past_due') {
    return {
      tone:         'warn',
      title:        'Your last payment failed',
      body:         'Stripe will keep retrying, but in the meantime the tools are locked. Update your card in the billing portal and access is restored immediately.',
      primary:      'portal',
      primaryLabel: 'Update payment method',
    }
  }
  if (status.kind === 'canceled') {
    return {
      tone:         'neutral',
      title:        'Your subscription has ended',
      body:         'Your plan is no longer active. Reactivate to get the tools back — your roadmap, documents, and check-ins stayed exactly as you left them.',
      primary:      'checkout',
      primaryLabel: 'Reactivate subscription',
    }
  }
  // 'expired' — the default / trial-ended case.
  return {
    tone:         'warn',
    title:        'Your free trial has ended',
    body:         `You've had two full weeks to kick the tires — time to pick a plan. The Owner plan is $${PRICE_MONTHLY_USD}/month, includes every tool, and you can cancel any time.`,
    primary:      'checkout',
    primaryLabel: `Upgrade now — $${PRICE_MONTHLY_USD} / month`,
  }
}

function LockBadge({ tone }) {
  const cls = tone === 'warn'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-gray-50  text-gray-700  border-gray-200'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cls}`}>
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5 7V5a3 3 0 016 0v2" strokeLinecap="round" />
      </svg>
      Subscription required
    </span>
  )
}
