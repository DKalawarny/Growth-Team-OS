/**
 * stripe-portal
 *
 * Creates a Stripe Customer Portal session for the calling company and
 * returns { url }. The browser hard-redirects to let the user update their
 * payment method, cancel, view invoices, or change plans — all without us
 * building those screens ourselves. Stripe maintains the UI; we just hand
 * out the session.
 *
 * Prereqs:
 *   - The company already has a Stripe customer (i.e. a subscriptions row
 *     with stripe_customer_id set). If not there's nothing to manage —
 *     we return 400 so the UI can nudge them into Checkout first.
 *   - The Customer Portal is configured in the Stripe dashboard (Settings
 *     → Billing → Customer portal). Without it this call errors with
 *     "configuration not found". See README.
 *
 * Request body: ignored (portal session is per-customer, not per-plan).
 * Response 200:  { url: string }
 * Response 400:  { error: 'no_customer' } — no stripe_customer_id on file
 * Response 401:  auth failure
 * Response 500:  anything else
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY   same key as stripe-checkout
 *   APP_URL             where Stripe returns the user after they close the
 *                       portal (defaults to /settings)
 */

// deno-lint-ignore-file no-external-import
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser, serviceClient }    from '../_shared/supabase.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  try {
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

    const user = await authedUser(req)
    const admin = serviceClient()

    // Portal sessions are keyed to a Stripe customer, which we only have
    // if the company has been through Checkout at least once. No row (or
    // a row without customer_id) = nothing to manage.
    const { data: row } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', user.companyId)
      .maybeSingle()

    const customerId = row?.stripe_customer_id
    if (!customerId) {
      return json({ error: 'no_customer' }, 400)
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      // Return to the Billing tab — they'll see the refreshed subscription
      // state (the webhook will have fired for any change they made in the
      // portal by the time they click "Return to GrowthOS").
      return_url: `${appUrl}/settings/billing`,
    })

    if (!session.url) {
      return json({ error: 'Stripe did not return a portal URL' }, 500)
    }

    return json({ url: session.url })
  } catch (err) {
    console.error('[stripe-portal]', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401 : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
