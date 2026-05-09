/**
 * stripe-webhook
 *
 * Receives subscription lifecycle events from Stripe and mirrors them into
 * our `subscriptions` table. This table is the source of truth that the
 * browser queries; we never call Stripe from the browser.
 *
 * Events we handle (Stripe sends ~200 event types — we silently ignore
 * the ones we don't care about):
 *
 *   checkout.session.completed
 *     Fires when the user finishes the hosted checkout. We resolve the
 *     subscription_id from the session, pull the full subscription object
 *     for status + period_end, and upsert the row.
 *
 *   customer.subscription.created
 *     Usually fires alongside checkout.session.completed. Idempotent upsert
 *     means handling both is safe.
 *
 *   customer.subscription.updated
 *     Fires on EVERY subscription change — status transitions (past_due,
 *     active), period rollover, cancel_at_period_end flips, plan changes
 *     via the portal. Single source of ongoing truth.
 *
 *   customer.subscription.deleted
 *     Terminal cancellation. We set status='canceled' rather than deleting
 *     the row — keeps the stripe_customer_id around so a resubscribe can
 *     reuse it.
 *
 * Auth: no user JWT — this is Stripe → us. The webhook signature verified
 * against STRIPE_WEBHOOK_SECRET is the auth.
 *
 * Retries: if we return 5xx Stripe retries with exponential backoff for up
 * to 3 days. Our upserts are idempotent (unique constraint on company_id
 * with onConflict) so retries don't corrupt state.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY       sk_test_... or sk_live_... (SDK init)
 *   STRIPE_WEBHOOK_SECRET   whsec_... paired with the webhook endpoint
 *
 * Stripe dashboard setup:
 *   Add endpoint at https://<project>.supabase.co/functions/v1/stripe-webhook
 *   Subscribe to: checkout.session.completed, customer.subscription.*
 *   Copy the signing secret into STRIPE_WEBHOOK_SECRET.
 *
 * IMPORTANT: deploy this function with --no-verify-jwt so Stripe (which
 * doesn't know about Supabase JWTs) can reach it. See README.
 */

// deno-lint-ignore-file no-external-import
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { serviceClient } from '../_shared/supabase.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405 })
  }

  // Signature verification requires the raw request body byte-for-byte.
  // Using req.json() would break this — hashing a reserialized object
  // won't match Stripe's HMAC.
  const sig = req.headers.get('stripe-signature') ?? ''
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    // constructEventAsync uses Web Crypto (available in Deno). The sync
    // version uses Node crypto and would throw here.
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret)
  } catch (err) {
    // Stripe doc: return 400 so they stop retrying forgeries. Real sig
    // failures are almost always "the wrong STRIPE_WEBHOOK_SECRET is set."
    console.error('[stripe-webhook] signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const admin = serviceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const companyId = session.client_reference_id
          ?? (session.metadata?.company_id as string | undefined)
          ?? null

        if (!companyId) {
          // Shouldn't happen — stripe-checkout always sets client_reference_id.
          // Log loudly and 200 anyway so Stripe doesn't retry forever.
          console.warn('[stripe-webhook] checkout.session.completed without company_id', session.id)
          break
        }

        // ── AI budget top-up ────────────────────────────────────────────────
        // One-time payment via stripe-topup. Increment monthly_spend_cap by
        // the purchased amount. The cap resets at query time (we compare spend
        // against the cap for the current calendar month), so bumping the cap
        // mid-month gives the user the headroom they paid for right away.
        if (session.metadata?.type === 'spend_topup') {
          const topupUsd = Number(session.metadata?.topup_usd ?? 0)
          if (topupUsd > 0) {
            const { data: company } = await admin
              .from('companies')
              .select('monthly_spend_cap')
              .eq('id', companyId)
              .maybeSingle()
            const current = Number(company?.monthly_spend_cap ?? 10)
            const { error: capErr } = await admin
              .from('companies')
              .update({ monthly_spend_cap: current + topupUsd })
              .eq('id', companyId)
            if (capErr) throw capErr
            console.log(`[stripe-webhook] top-up: company ${companyId} cap ${current} → ${current + topupUsd}`)
          }
          break
        }

        // ── Subscription checkout ───────────────────────────────────────────
        // subscription and customer on Checkout.Session can be either a
        // string (id) or the expanded object, depending on API version.
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id

        // Pull the full subscription so we can store status + period_end
        // in one upsert.
        const sub = subscriptionId
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : null

        await upsertSubscription(admin, {
          company_id:             companyId,
          stripe_customer_id:     customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          status:                 sub?.status ?? 'active',
          plan:                   (sub?.metadata?.plan as string) ?? 'owner',
          current_period_end:     sub ? new Date(sub.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end:   sub?.cancel_at_period_end ?? false,
        })
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const companyId = sub.metadata?.company_id as string | undefined
        if (!companyId) {
          console.warn('[stripe-webhook] subscription event missing company_id metadata', sub.id)
          break
        }
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        await upsertSubscription(admin, {
          company_id:             companyId,
          stripe_customer_id:     customerId,
          stripe_subscription_id: sub.id,
          status:                 sub.status,
          plan:                   (sub.metadata?.plan as string) ?? 'owner',
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end:   sub.cancel_at_period_end,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const companyId = sub.metadata?.company_id as string | undefined
        if (!companyId) break

        // Don't delete the row — keep customer_id for resubscribe. Status
        // flip is enough for the gate logic to block access.
        const { error } = await admin
          .from('subscriptions')
          .update({
            status:                 'canceled',
            cancel_at_period_end:   false,
          })
          .eq('company_id', companyId)
        if (error) throw error
        break
      }

      default:
        // Ignore. Stripe sends a lot of events (invoice.*, payment_intent.*,
        // etc.) that aren't relevant to subscription state.
        break
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[stripe-webhook] handler failed', event.type, err)
    // 500 triggers Stripe retry. Our upserts are idempotent so retries are
    // safe. Alert on repeated failures via the Stripe dashboard.
    return new Response('handler failed', { status: 500 })
  }
})

// ----------------------------------------------------------------------------
// Upsert helper — single place where we shape a row for the subscriptions
// table, regardless of which event produced it. onConflict on company_id
// means re-runs (including Stripe retries) merge cleanly.
// ----------------------------------------------------------------------------
interface SubscriptionRow {
  company_id:             string
  stripe_customer_id:     string | null
  stripe_subscription_id: string | null
  status:                 string
  plan:                   string
  current_period_end:     string | null
  cancel_at_period_end:   boolean
}

async function upsertSubscription(
  admin: ReturnType<typeof serviceClient>,
  row:   SubscriptionRow,
): Promise<void> {
  const { error } = await admin
    .from('subscriptions')
    .upsert(row, { onConflict: 'company_id' })
  if (error) throw error
}
