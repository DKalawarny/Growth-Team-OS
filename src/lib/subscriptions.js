import { supabase } from './supabase'

/**
 * Subscription helpers — browser-side wrapper over the stripe-* Edge
 * Functions and the `subscriptions` table.
 *
 * Paid plan state is maintained server-side by supabase/functions/stripe-
 * webhook (see migration 010). The browser reads from the `subscriptions`
 * table via RLS and never talks to Stripe directly — Stripe's rate limits
 * don't survive a real user base, and keeping the secret key server-side
 * is non-negotiable.
 *
 * Access model (enforced by hasActiveAccess below, consumed by the
 * forthcoming RequireActiveSubscription wrapper on tool routes):
 *
 *   - Before companies.trial_ends_at  → full access, no subscription row
 *                                        required
 *   - After trial ends                → access requires subscriptions.status
 *                                        in ('active', 'trialing', 'past_due')
 *
 * past_due is included deliberately. Stripe retries failed charges for up
 * to 3 weeks; locking users out on the first failed card charge is hostile
 * and causes churn we can prevent. Tighten to strict 'active' only if this
 * becomes abused.
 */

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due']

// ---- Reads -----------------------------------------------------------------

/**
 * Fetch the subscription row for a company. Returns null if none exists —
 * which is the common case for brand-new accounts (they have a trial but
 * no Stripe relationship yet).
 *
 * Errors are swallowed (warn + return null). The gate logic interprets
 * null as "no paid plan" which correctly defaults to trial-based access.
 * A flaky read blocking a user on trial would be hostile.
 */
export async function getSubscription(companyId) {
  if (!companyId) return null
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) {
    console.warn('[subscriptions] getSubscription failed', error)
    return null
  }
  return data
}

/**
 * Does this company currently have app access? Pure function — pass in the
 * subscription row (or null) and the trial_ends_at timestamp (or null), and
 * we return a boolean. Decoupled from Supabase so it's trivial to test and
 * safe to call from render paths.
 *
 * Precedence: if either an active subscription OR an unexpired trial is
 * present, access is granted. We don't require both.
 */
export function hasActiveAccess({ subscription, trialEndsAt }) {
  if (subscription && ACTIVE_STATUSES.includes(subscription.status)) return true
  if (trialEndsAt) {
    const end = new Date(trialEndsAt).getTime()
    if (Number.isFinite(end) && end > Date.now()) return true
  }
  return false
}

/**
 * Human-readable summary for the Settings billing tab. Returns one of:
 *
 *   { kind: 'trialing',   daysLeft: 3 }
 *   { kind: 'active',     plan: 'owner', renewsAt: Date, cancelAtPeriodEnd: bool }
 *   { kind: 'past_due',   plan: 'owner' }
 *   { kind: 'canceled',   plan: 'owner', endsAt: Date }
 *   { kind: 'expired' }   // trial over, no paid sub
 *
 * Kept as a tagged shape (not a formatted string) so the UI has full
 * control over rendering — different surfaces show different emphasis.
 */
export function describeSubscription({ subscription, trialEndsAt }) {
  const now = Date.now()

  if (subscription) {
    const renewsAt = subscription.current_period_end ? new Date(subscription.current_period_end) : null
    switch (subscription.status) {
      case 'active':
      case 'trialing':
        return {
          kind: 'active',
          plan: subscription.plan,
          renewsAt,
          cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        }
      case 'past_due':
        return { kind: 'past_due', plan: subscription.plan }
      case 'canceled':
      case 'incomplete_expired':
      case 'unpaid':
        return { kind: 'canceled', plan: subscription.plan, endsAt: renewsAt }
      default:
        // incomplete and anything unexpected — treat as no access until
        // Stripe settles it. The webhook will update us when it does.
        return { kind: 'expired' }
    }
  }

  if (trialEndsAt) {
    const end = new Date(trialEndsAt).getTime()
    if (Number.isFinite(end) && end > now) {
      const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
      return { kind: 'trialing', daysLeft }
    }
  }
  return { kind: 'expired' }
}

// ---- Writes (via Edge Functions) ------------------------------------------

/**
 * Kick off Stripe Checkout for a paid plan. Creates the session server-side
 * (stripe-checkout Edge Function) and hard-redirects the browser to Stripe's
 * hosted page. On success Stripe sends the user to /settings/billing?checkout=success;
 * on cancel, back to /pricing?checkout=canceled.
 *
 * Throws if the caller isn't signed in or the Edge Function errors. Callers
 * should catch and surface the error inline (not block with an alert).
 */
export async function startCheckout(plan = 'owner') {
  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    method: 'POST',
    body:   { plan },
  })
  if (error) throw new Error(error.message || 'Could not start checkout')
  if (data?.error) throw new Error(data.error)
  if (!data?.url)  throw new Error('No checkout URL returned')

  // Hard navigation — Stripe Checkout is a full-page flow, not a modal.
  window.location.href = data.url
}

/**
 * Purchase a one-time AI budget top-up ($5 or $10). Creates a Stripe Checkout
 * session server-side and redirects the browser to it. On success Stripe sends
 * the user to /settings/billing?topup=success and fires checkout.session.completed,
 * which the webhook handles by incrementing companies.monthly_spend_cap.
 */
export async function startTopUp(amount) {
  if (![5, 10].includes(amount)) throw new Error('Invalid top-up amount')
  const { data, error } = await supabase.functions.invoke('stripe-topup', {
    method: 'POST',
    body:   { amount },
  })
  if (error) throw new Error(error.message || 'Could not start top-up')
  if (data?.error) throw new Error(data.error)
  if (!data?.url)  throw new Error('No checkout URL returned')
  window.location.href = data.url
}

/**
 * Open Stripe Customer Portal — where the user updates their card, views
 * invoices, cancels, or changes plan. We don't rebuild any of that; we
 * hand Stripe a session and redirect.
 *
 * Only meaningful if the company has an existing Stripe customer record
 * (i.e. they've been through Checkout at least once). If not, the Edge
 * Function returns { error: 'no_customer' } — callers should catch that
 * specific message and steer to Checkout instead.
 *
 * Like startCheckout, this is a hard-navigation flow (not a modal).
 */
export async function openPortal() {
  const { data, error } = await supabase.functions.invoke('stripe-portal', {
    method: 'POST',
    body:   {},
  })
  if (error) throw new Error(error.message || 'Could not open billing portal')
  if (data?.error) throw new Error(data.error)
  if (!data?.url)  throw new Error('No portal URL returned')

  window.location.href = data.url
}

