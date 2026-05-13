/**
 * Smoke tests — billing gate
 *
 * Why this file: hasActiveAccess() is the single function that decides
 * whether a user gets access to `/tools/*`. If it regresses, paying users
 * get locked out (refund risk) or expired trials get free access (revenue
 * leak). The function is pure and tiny, so testing the truth table is
 * cheap and catches the categories of regression that matter:
 *
 *   1. Trial-active users keep access without a Stripe row
 *   2. Trial-expired users without a paid sub are denied
 *   3. Paid users (active / trialing / past_due) keep access after trial
 *   4. Canceled or unpaid users are denied after trial
 *
 * describeSubscription() drives the Settings billing card copy — different
 * shapes for trialing / active / past_due / canceled / expired. A few
 * sanity checks here so the UI doesn't render `undefined.daysLeft` after
 * a refactor.
 *
 * Run:  npm test
 * Watch: npm run test:watch
 */

import { describe, it, expect } from 'vitest'
import { hasActiveAccess, describeSubscription } from './subscriptions'

// ── Date helpers ─────────────────────────────────────────────────────────────
const daysFromNow  = n => new Date(Date.now() + n * 86_400_000).toISOString()
const daysAgo      = n => new Date(Date.now() - n * 86_400_000).toISOString()

// ── hasActiveAccess ──────────────────────────────────────────────────────────

describe('hasActiveAccess', () => {
  it('grants access during an unexpired trial with no subscription', () => {
    expect(hasActiveAccess({
      subscription: null,
      trialEndsAt:  daysFromNow(7),
    })).toBe(true)
  })

  it('denies access after the trial ends with no subscription', () => {
    expect(hasActiveAccess({
      subscription: null,
      trialEndsAt:  daysAgo(1),
    })).toBe(false)
  })

  it('denies access when there is no trial and no subscription', () => {
    expect(hasActiveAccess({
      subscription: null,
      trialEndsAt:  null,
    })).toBe(false)
  })

  it('grants access for an active subscription regardless of trial state', () => {
    expect(hasActiveAccess({
      subscription: { status: 'active' },
      trialEndsAt:  daysAgo(30),
    })).toBe(true)
  })

  it('grants access for a trialing subscription', () => {
    expect(hasActiveAccess({
      subscription: { status: 'trialing' },
      trialEndsAt:  null,
    })).toBe(true)
  })

  it('grants access for a past_due subscription — deliberate, see ACCESS notes', () => {
    // Stripe retries failed charges for up to 3 weeks. Locking users out on
    // the first failed charge is hostile; we keep them in until Stripe gives up.
    expect(hasActiveAccess({
      subscription: { status: 'past_due' },
      trialEndsAt:  null,
    })).toBe(true)
  })

  it('denies access for a canceled subscription after the trial ends', () => {
    expect(hasActiveAccess({
      subscription: { status: 'canceled' },
      trialEndsAt:  daysAgo(1),
    })).toBe(false)
  })

  it('denies access for an incomplete subscription', () => {
    // incomplete = Stripe is still processing the first payment; we treat
    // these as no access until the webhook flips them to active.
    expect(hasActiveAccess({
      subscription: { status: 'incomplete' },
      trialEndsAt:  daysAgo(1),
    })).toBe(false)
  })

  it('falls back to trial access when subscription is canceled but trial is still live', () => {
    // Pathological — shouldn't happen in production — but the function
    // should be safe: either condition grants access.
    expect(hasActiveAccess({
      subscription: { status: 'canceled' },
      trialEndsAt:  daysFromNow(3),
    })).toBe(true)
  })

  it('ignores a non-parseable trialEndsAt value', () => {
    expect(hasActiveAccess({
      subscription: null,
      trialEndsAt:  'not a date',
    })).toBe(false)
  })
})

// ── describeSubscription ─────────────────────────────────────────────────────

describe('describeSubscription', () => {
  it('returns { kind: "trialing", daysLeft } during an active trial', () => {
    const result = describeSubscription({
      subscription: null,
      trialEndsAt:  daysFromNow(5),
    })
    expect(result.kind).toBe('trialing')
    // Allow 4 or 5 because of how Math.ceil rounds — depends on the
    // millisecond drift between daysFromNow() and Date.now() inside the func.
    expect([4, 5]).toContain(result.daysLeft)
  })

  it('returns { kind: "expired" } when both trial and subscription are absent', () => {
    expect(describeSubscription({
      subscription: null,
      trialEndsAt:  null,
    })).toEqual({ kind: 'expired' })
  })

  it('returns { kind: "expired" } when the trial has ended and no sub exists', () => {
    expect(describeSubscription({
      subscription: null,
      trialEndsAt:  daysAgo(2),
    })).toEqual({ kind: 'expired' })
  })

  it('returns { kind: "active", cancelAtPeriodEnd: false } for a healthy subscription', () => {
    const result = describeSubscription({
      subscription: {
        status:                'active',
        plan:                  'owner',
        current_period_end:    daysFromNow(20),
        cancel_at_period_end:  false,
      },
      trialEndsAt: null,
    })
    expect(result.kind).toBe('active')
    expect(result.plan).toBe('owner')
    expect(result.cancelAtPeriodEnd).toBe(false)
    expect(result.renewsAt).toBeInstanceOf(Date)
  })

  it('flags cancel_at_period_end on an otherwise-active subscription', () => {
    // This is what the Settings UI uses to show "Canceling — access ends <date>"
    const result = describeSubscription({
      subscription: {
        status:                'active',
        plan:                  'owner',
        current_period_end:    daysFromNow(10),
        cancel_at_period_end:  true,
      },
      trialEndsAt: null,
    })
    expect(result.kind).toBe('active')
    expect(result.cancelAtPeriodEnd).toBe(true)
  })

  it('returns { kind: "past_due", plan } for a past_due subscription', () => {
    expect(describeSubscription({
      subscription: { status: 'past_due', plan: 'owner_annual' },
      trialEndsAt:  null,
    })).toEqual({ kind: 'past_due', plan: 'owner_annual' })
  })

  it('returns { kind: "canceled" } for a canceled subscription', () => {
    const result = describeSubscription({
      subscription: {
        status:                'canceled',
        plan:                  'owner',
        current_period_end:    daysFromNow(5),
      },
      trialEndsAt: null,
    })
    expect(result.kind).toBe('canceled')
    expect(result.plan).toBe('owner')
    expect(result.endsAt).toBeInstanceOf(Date)
  })

  it('treats incomplete subscriptions as expired (no access until webhook lands)', () => {
    expect(describeSubscription({
      subscription: { status: 'incomplete', plan: 'owner' },
      trialEndsAt:  null,
    })).toEqual({ kind: 'expired' })
  })
})
