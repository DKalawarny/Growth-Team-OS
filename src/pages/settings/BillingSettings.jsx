import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BillingSection from '../../components/settings/BillingSection'
import UsageSection   from '../../components/settings/UsageSection'

/**
 * BillingSettings — plan, payment method, and this month's usage.
 *
 * Also handles the post-checkout bounce-back: Stripe sends users to
 * /settings/billing?checkout=success after a successful Checkout Session,
 * we show a green confirmation banner once, then strip the param so a
 * refresh doesn't resurface it.
 */
export default function BillingSettings() {
  const [params, setParams] = useSearchParams()
  const [banner, setBanner] = useState(() => bannerFromParams(params))

  useEffect(() => {
    if (!params.get('checkout')) return
    const next = new URLSearchParams(params)
    next.delete('checkout')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className="rounded-xl px-4 py-3 text-sm border bg-green-50 border-green-200 text-green-800 flex items-start gap-3"
          role="status"
        >
          <span className="flex-1">{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-green-600 hover:text-green-800"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <BillingSection />
      <UsageSection />
    </div>
  )
}

/**
 * Map ?checkout=success into a banner payload. Stripe's success_url lands
 * here; the webhook has usually upserted the subscription by the time
 * this renders. Banner confirms the charge went through even if the plan
 * state hasn't fully propagated yet.
 *
 * We deliberately don't handle '?checkout=canceled' — that path sends the
 * user back to /pricing, which owns its own banner.
 */
function bannerFromParams(params) {
  if (params.get('checkout') !== 'success') return null
  return {
    text: "Payment successful — you're subscribed. Your plan details are below; it can take a few seconds to update.",
  }
}
