import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import {
  getSubscription,
  hasActiveAccess,
  describeSubscription,
} from '../lib/subscriptions'

/**
 * useSubscription — resolves the `subscriptions` row for the caller's
 * company, plus a derived access flag and human-readable status.
 *
 * Why a separate hook (instead of extending useAuth):
 *   - Most routes don't need subscription state. Fetching it on every
 *     page mount would be wasteful and couple auth to paid-plan concerns
 *     for no benefit.
 *   - The consumers that DO need it (RequireActiveSubscription gate,
 *     TrialBanner, BillingSection) are specific — opt-in via hook.
 *   - Refreshing after openPortal / returning from Stripe should be
 *     cheap; scoped hook keeps that flow contained.
 *
 * Returned shape:
 *   subscription   `subscriptions` row or null
 *   trialEndsAt    from companies.trial_ends_at — copied out so callers
 *                  don't need useAuth alongside this hook
 *   loading        true until both the hook's own fetch and useAuth's
 *                  company resolution have settled
 *   hasAccess      derived via hasActiveAccess — the single boolean the
 *                  gate actually branches on
 *   status         tagged shape from describeSubscription — for UI
 *   refresh()      manual refetch; use after openPortal / ?checkout=success
 *
 * Errors from getSubscription are swallowed (see lib). We interpret null
 * as "no sub yet," which correctly falls back to trial-based access —
 * blocking a user on a flaky read would be hostile.
 */
export function useSubscription() {
  const { company, loading: authLoading } = useAuth()
  const companyId = company?.id
  const trialEndsAt = company?.trial_ends_at ?? null

  const [subscription, setSubscription] = useState(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    ;(async () => {
      setFetching(true)
      const s = await getSubscription(companyId)
      if (!cancelled) {
        setSubscription(s)
        setFetching(false)
      }
    })()
    return () => { cancelled = true }
  }, [companyId])

  async function refresh() {
    if (!companyId) return
    const s = await getSubscription(companyId)
    setSubscription(s)
  }

  const loading = authLoading || (!!companyId && fetching)
  const hasAccess = hasActiveAccess({ subscription, trialEndsAt })
  const status = describeSubscription({ subscription, trialEndsAt })

  return {
    subscription,
    trialEndsAt,
    loading,
    hasAccess,
    status,
    refresh,
  }
}
