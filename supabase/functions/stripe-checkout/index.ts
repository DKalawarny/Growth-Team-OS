/**
 * stripe-checkout
 *
 * Browser calls this to start a paid subscription. Flow:
 *
 *   1. Verify caller JWT → { userId, companyId }
 *   2. Resolve the plan ('owner' for now) to a Stripe price_id via env var
 *   3. Look up or create a Stripe customer for the company
 *   4. Create a Checkout Session scoped to that customer + price
 *   5. Return { url } — browser redirects to Stripe's hosted checkout
 *
 * Why not client-side Stripe.js for this:
 *   - Session creation requires the secret key (server-side only).
 *   - Keeps Stripe secrets out of the browser bundle.
 *   - Lets us stamp company_id into client_reference_id + subscription
 *     metadata, so the webhook knows who the subscription belongs to without
 *     a lookup table.
 *
 * Request body (JSON, optional):
 *   { plan?: 'owner' }   // default 'owner' — only paid plan right now
 *
 * Response 200:  { url: string }
 * Response 400:  { error } — unknown plan / missing price env
 * Response 401:  auth failure
 * Response 500:  anything else
 *
 * Required env vars (set in Supabase → Edge Functions → Secrets):
 *   STRIPE_SECRET_KEY        sk_test_... or sk_live_...
 *   STRIPE_PRICE_ID_OWNER    price_... for the recurring Owner price
 *   APP_URL                  where to send the user back to (e.g.
 *                            https://growthos.com or http://localhost:5173)
 */

// deno-lint-ignore-file no-external-import
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser, serviceClient }    from '../_shared/supabase.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  // Stripe's Node SDK defaults to Node-native HTTP which Deno lacks. Use
  // the Fetch-based client instead (it's what esm.sh emits but we set it
  // explicitly so updates don't change the default under us).
  httpClient: Stripe.createFetchHttpClient(),
})

// Plan → Stripe price_id.
// owner        — $97/month recurring
// owner_annual — $970/year recurring (2 months free)
// Agency/Scale aren't self-serve yet.
const PRICE_BY_PLAN: Record<string, string | undefined> = {
  owner:        Deno.env.get('STRIPE_PRICE_ID_OWNER'),
  owner_annual: Deno.env.get('STRIPE_PRICE_ID_OWNER_ANNUAL'),
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  try {
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

    const user = await authedUser(req)

    const body = await req.json().catch(() => ({})) as { plan?: string }
    const plan = body.plan ?? 'owner'

    const priceId = PRICE_BY_PLAN[plan]
    if (!priceId) {
      return json({ error: `No price configured for plan '${plan}'` }, 400)
    }

    const admin = serviceClient()

    // Look up the existing subscription row for this company (if any). We
    // care about stripe_customer_id — reusing it across checkouts keeps the
    // same customer record in Stripe, which matters for unified invoice
    // history + the Stripe Customer Portal.
    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', user.companyId)
      .maybeSingle()

    let customerId = existing?.stripe_customer_id ?? null

    if (!customerId) {
      // First paid checkout for this company — create the Stripe customer.
      // Email + name are just labels for readability in the Stripe dashboard;
      // Stripe doesn't require them.
      const [{ data: profile }, { data: company }] = await Promise.all([
        admin.from('profiles').select('email, name').eq('id', user.userId).maybeSingle(),
        admin.from('companies').select('name').eq('id', user.companyId).maybeSingle(),
      ])

      const customer = await stripe.customers.create({
        email: profile?.email ?? undefined,
        name:  company?.name ?? profile?.name ?? undefined,
        metadata: {
          company_id: user.companyId,
          user_id:    user.userId,
        },
      })
      customerId = customer.id
    }

    // Create the Checkout Session.
    //
    // - client_reference_id: Stripe's designated "your internal id" field,
    //   echoed back on checkout.session.completed. Cheap way to tie a
    //   completed checkout to a company without trusting client state.
    //
    // - subscription_data.metadata: propagates to the Subscription object,
    //   which means every subsequent customer.subscription.* event carries
    //   the company_id. Without this the webhook would need to look up
    //   company_id via customer_id — possible but an extra query.
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      mode:     'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.companyId,
      subscription_data: {
        metadata: {
          company_id: user.companyId,
          plan,
        },
      },
      // Where Stripe sends the user back to. Success lands on Settings
      // (so they can see the subscription took effect). Cancel returns
      // them to Pricing so the page they left from is where they resume.
      success_url: `${appUrl}/settings?checkout=success`,
      cancel_url:  `${appUrl}/pricing?checkout=canceled`,
    })

    if (!session.url) {
      return json({ error: 'Stripe did not return a checkout URL' }, 500)
    }

    return json({ url: session.url })
  } catch (err) {
    console.error('[stripe-checkout]', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401 : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
