import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubscription } from '../../hooks/useSubscription'
import { startCheckout, openPortal } from '../../lib/subscriptions'

/**
 * BillingSection — plan status + payment management inside Settings.
 *
 * Five view states, derived from describeSubscription() in lib/subscriptions.js:
 *
 *   trialing (no paid sub)    → "X days left" + Upgrade now → Checkout
 *   active / trialing (paid)  → plan + renewal date + Manage billing → portal
 *                               (badge for cancel_at_period_end)
 *   past_due                  → amber warning + Update payment → portal
 *   canceled                  → neutral + Reactivate → Checkout
 *   expired                   → red + Upgrade now → Checkout
 *
 * The "paid sub trialing" case is distinct from "trialing" — Stripe's
 * `trialing` status means they've entered card details and are in a
 * Stripe-managed trial period. Our no-card trial (managed by
 * companies.trial_ends_at) is the default for new signups and has
 * subscription = null. describeSubscription returns 'trialing' for
 * both, but only the paid variant carries a `plan` so we branch on that.
 *
 * Why surface portal access here rather than just on /pricing:
 *   - Settings is the natural "change my account" destination
 *   - /pricing is a marketing surface and redirects to Stripe for the
 *     purchase; once purchased, ongoing management belongs here
 *   - Stripe's portal is where the user cancels, and the cancel button
 *     shouldn't live on a page labeled "Pricing"
 */

export default function BillingSection() {
  const { subscription, loading, status } = useSubscription()

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const handleCheckout = async () => {
    setErr(null)
    setBusy(true)
    try {
      await startCheckout('owner')
      // Redirects away — if we fall through, something swallowed the nav.
    } catch (e) {
      setErr(e.message || 'Could not start checkout')
      setBusy(false)
    }
  }

  const handlePortal = async () => {
    setErr(null)
    setBusy(true)
    try {
      await openPortal()
    } catch (e) {
      // 'no_customer' means no Stripe customer yet — fall through to
      // checkout rather than showing a scary error for a pre-purchase state.
      if (e.message === 'no_customer') {
        await handleCheckout()
        return
      }
      setErr(e.message || 'Could not open billing portal')
      setBusy(false)
    }
  }

  // Note: no refresh ceremony needed for post-checkout return. Stripe's
  // success_url is a full-page navigation, so the component remounts and
  // the hook refetches naturally. The webhook has usually settled by then.

  return (
    <section className="mt-10 bg-white border border-gray-200 rounded-xl p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your plan, payment method, and invoices.
        </p>
      </header>

      {loading ? (
        <div className="space-y-2">
          <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <BillingBody
          status={status}
          subscription={subscription}
          busy={busy}
          err={err}
          onCheckout={handleCheckout}
          onPortal={handlePortal}
        />
      )}
    </section>
  )
}

// ----------------------------------------------------------------------------
// Body — renders one of five layouts based on the tagged status shape.
// Split out so the top-level component stays tidy; each branch is ~10 lines.
// ----------------------------------------------------------------------------

function BillingBody({ status, subscription, busy, err, onCheckout, onPortal }) {
  // Precedence matters: a live subscription overrides trial state. We check
  // 'active' first because that's the steady state for paying users.

  if (status.kind === 'active') {
    const hasPaidSub = !!subscription   // describeSubscription collapses
                                        // trialing (paid) → kind='active'
                                        // so the badge below is accurate
                                        // either way.
    return (
      <>
        <PlanHeader plan={status.plan} tone="ok" />

        <div className="text-sm text-gray-600 space-y-1 mb-4">
          {status.cancelAtPeriodEnd ? (
            <p className="text-amber-700">
              <strong>Canceling</strong> — access ends {formatDate(status.renewsAt)}.
              You can resume any time before then.
            </p>
          ) : status.renewsAt ? (
            <p>Renews {formatDate(status.renewsAt)}.</p>
          ) : null}
        </div>

        <PrimaryButton onClick={onPortal} busy={busy} label="Manage billing" busyLabel="Opening Stripe…" />
        <Hint>Update your card, download invoices, or cancel in the Stripe portal.</Hint>
        {err && <ErrorLine text={err} />}
        {!hasPaidSub && null /* branch kept explicit; no UI diff */}
      </>
    )
  }

  if (status.kind === 'past_due') {
    return (
      <>
        <PlanHeader plan={status.plan} tone="warn" />
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          Your last payment didn't go through. Update your card to keep access —
          Stripe will retry automatically once it's fixed.
        </p>
        <PrimaryButton onClick={onPortal} busy={busy} label="Update payment method" busyLabel="Opening Stripe…" />
        {err && <ErrorLine text={err} />}
      </>
    )
  }

  if (status.kind === 'canceled') {
    return (
      <>
        <PlanHeader plan={status.plan} tone="neutral" />
        <p className="text-sm text-gray-600 mb-4">
          {status.endsAt && new Date(status.endsAt) > new Date()
            ? <>Canceled — access ends {formatDate(status.endsAt)}.</>
            : <>Your subscription has ended. Reactivate any time.</>}
        </p>
        <PrimaryButton onClick={onCheckout} busy={busy} label="Reactivate subscription" busyLabel="Opening Stripe…" />
        {err && <ErrorLine text={err} />}
      </>
    )
  }

  if (status.kind === 'trialing') {
    const { daysLeft } = status
    const urgent = daysLeft <= 3
    return (
      <>
        <PlanHeader plan="Free trial" tone={urgent ? 'warn' : 'neutral'} />
        <p className={`text-sm mb-4 ${urgent ? 'text-amber-800' : 'text-gray-600'}`}>
          {daysLeft > 0
            ? <>
                <strong>{daysLeft} day{daysLeft === 1 ? '' : 's'} left</strong> on your free trial.
                Upgrade to keep using the tools when it ends.
              </>
            : <>Your trial ends today. Upgrade to keep using the tools.</>}
        </p>
        <PrimaryButton onClick={onCheckout} busy={busy} label="Upgrade now — $97 / month" busyLabel="Redirecting to Stripe…" />
        <Hint>
          Cancel anytime. See the{' '}
          <Link to="/pricing" className="text-brand-600 hover:underline">Pricing page</Link>
          {' '}for what's included.
        </Hint>
        {err && <ErrorLine text={err} />}
      </>
    )
  }

  // kind === 'expired' — trial over, no paid sub. The most aggressive
  // CTA state, but we still don't block the rest of Settings; gating
  // of the tool routes is the actual paywall. This section is explanation.
  return (
    <>
      <PlanHeader plan="No active plan" tone="warn" />
      <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
        Your free trial has ended. Upgrade to unlock the tools again.
      </p>
      <PrimaryButton onClick={onCheckout} busy={busy} label="Upgrade now — $97 / month" busyLabel="Redirecting to Stripe…" />
      <Hint>
        Questions before you commit?{' '}
        <a href="mailto:dkalawarny@hotmail.com" className="text-brand-600 hover:underline">
          Email us
        </a>.
      </Hint>
      {err && <ErrorLine text={err} />}
    </>
  )
}

// ----------------------------------------------------------------------------
// Small shared subcomponents — kept inline because they're only used here
// ----------------------------------------------------------------------------

function PlanHeader({ plan, tone }) {
  const toneCls =
    tone === 'ok'      ? 'bg-green-50  text-green-800  border-green-200'  :
    tone === 'warn'    ? 'bg-amber-50  text-amber-800  border-amber-200'  :
                         'bg-gray-50   text-gray-700   border-gray-200'
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base font-semibold text-gray-900">Current plan:</span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${toneCls}`}>
        {formatPlan(plan)}
      </span>
    </div>
  )
}

function PrimaryButton({ onClick, busy, label, busyLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white text-sm font-medium transition-colors"
    >
      {busy ? busyLabel : label}
    </button>
  )
}

function Hint({ children }) {
  return <p className="mt-3 text-xs text-gray-500">{children}</p>
}

function ErrorLine({ text }) {
  return <p className="mt-3 text-xs text-red-600">{text}</p>
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatDate(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatPlan(plan) {
  if (!plan) return 'Free trial'
  if (plan === 'owner') return 'Owner'
  // Capitalize unknown plans so future additions ('agency', 'scale') don't
  // need this helper updated.
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}
