/**
 * stripe-topup
 *
 * Creates a one-time Stripe Checkout session so a company can purchase
 * $5 or $10 of extra AI budget mid-month.
 *
 * Flow:
 *   1. Verify caller JWT → { userId, companyId }
 *   2. Validate requested amount ($5 or $10 only)
 *   3. Reuse existing Stripe customer if the company has one
 *   4. Create a one-time Checkout session (mode: 'payment')
 *   5. Return { url } — browser redirects to Stripe hosted page
 *
 * On success Stripe fires checkout.session.completed with
 * metadata.type = 'spend_topup'. The webhook (stripe-webhook/index.ts)
 * handles that event by incrementing companies.monthly_spend_cap.
 *
 * Request body: { amount: 5 | 10 }
 * Response 200: { url: string }
 * Response 400: invalid amount
 * Response 401: auth failure
 * Response 500: anything else
 */

// deno-lint-ignore-file no-external-import
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser, serviceClient }    from '../_shared/supabase.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const VALID_AMOUNTS = [5, 10]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  try {
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

    const user   = await authedUser(req)
    const body   = await req.json().catch(() => ({})) as { amount?: unknown }
    const amount = Number(body.amount)

    if (!VALID_AMOUNTS.includes(amount)) {
      return json({ error: `amount must be one of: ${VALID_AMOUNTS.join(', ')}` }, 400)
    }

    const admin = serviceClient()

    // Reuse existing Stripe customer for this company if one exists.
    // Keeps invoice history unified under one customer in Stripe.
    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', user.companyId)
      .maybeSingle()

    const customerId: string | undefined = existing?.stripe_customer_id ?? undefined

    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ...(customerId ? { customer: customerId } : {}),
      line_items: [{
        quantity: 1,
        price_data: {
          currency:     'usd',
          unit_amount:  amount * 100,   // Stripe uses cents
          product_data: {
            name:        `AI Top-up — $${amount}`,
            description: `Adds $${amount} to your monthly AI budget for the rest of this month.`,
          },
        },
      }],
      // client_reference_id echoed back on checkout.session.completed —
      // the webhook uses it to know which company to credit.
      client_reference_id: user.companyId,
      metadata: {
        company_id: user.companyId,
        type:       'spend_topup',
        topup_usd:  String(amount),
      },
      success_url: `${appUrl}/settings/billing?topup=success`,
      cancel_url:  `${appUrl}/settings/billing`,
    })

    if (!session.url) return json({ error: 'Stripe did not return a checkout URL' }, 500)
    return json({ url: session.url })

  } catch (err) {
    console.error('[stripe-topup]', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401 : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
