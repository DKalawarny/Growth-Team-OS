# GrowthOS

The operating system for owner-operated trades and service businesses. A
[Leadeos](https://leadeos.com) product.

GrowthOS is a React + Vite SPA backed by Supabase (Postgres + Auth + Edge
Functions). Owners and their teams use it to plan growth roadmaps, run their
work board, capture playbooks, and ask **Solomon**, the in-app Claude-powered
advisor, for help on hiring, cash flow, exit readiness, and the rest of the
tool suite.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Copy env template and fill in the required keys (see .env.example for
#    what's required vs optional)
cp .env.example .env.local

# 3. Run the dev server
npm run dev

# 4. Run the test suite
npm test
```

For the full server setup (database migrations, Edge Function secrets,
Stripe dashboard configuration), keep reading.

## Usage caps & costs

Every AI-powered tool in GrowthOS is rate-limited per company per calendar month to keep runaway spend off the table while we're still pre-billing. The cap is enforced at the point of each paid call:

- **Default cap:** 10 Claude runs per tool per company per month. A "run" is either a fresh generate or a refine — they cost the same at the API level, so they deplete the cap the same way.
- **Reset:** The 1st of each calendar month (UTC). No rolling window.
- **Coverage:** Every tool that hits Anthropic (`hiring-scorecard`, `exit-readiness`, `offer-builder`, `cash-flow`, `cfo-dashboard`, `org-chart`, `rocks-tracker`, `gbp-optimizer`).
- **Places API** (used by GBP Optimizer) is logged for cost visibility but does not have its own cap — it's implicitly bounded by the Claude cap on the GBP tool that calls it.

When a user hits the cap, the tool returns a `CapExceededError` (see `src/lib/usage.js`) and the UI renders an amber `CapExceededNotice` with the reset date and a contact link. Nothing is silently eaten — every paid call is logged in `usage_events` with its computed USD cost at time-of-call, so a future price change doesn't retroactively re-value historical rows.

### Viewing usage

Owners see this month's per-tool counts + aggregate cost in **Settings → This month's usage**.

### Raising a cap (admin only, via SQL)

There's no in-app upgrade flow yet. To raise an individual company's cap:

```sql
UPDATE companies
   SET monthly_tool_cap = 100
 WHERE id = '<company-uuid>';
```

The next call the user makes re-reads the cap — no deploy, no cache invalidation.

### Pricing constants

The per-call prices live in two places that must stay in sync:

- `src/lib/usage.js` — `CLAUDE_INPUT_PER_M`, `CLAUDE_OUTPUT_PER_M`, `PLACES_SEARCH_COST`, `PLACES_DETAILS_COST`
- `supabase/functions/gbp-fetch/index.ts` — `PLACES_SEARCH_COST`, `PLACES_DETAILS_COST`

Update both when Anthropic or Google change their pricing.

## Stripe subscriptions

Paid plans are Stripe-backed. The browser never calls Stripe directly — two Edge Functions (`stripe-checkout`, `stripe-webhook`) handle the round trip and maintain the `subscriptions` table, which is the source of truth for "is this company on a paid plan right now."

### How it fits together

```
Browser                   Edge Function              Stripe                 DB
-------                   -------------              ------                 --
[Upgrade now]  ─POST──▶  stripe-checkout    ─API─▶  CheckoutSession
                                                          │
                                             ◀───URL──────┘
     │
     └─redirect─▶   Stripe Hosted Checkout
                             │
                    (user enters card)
                             │
     ◀──redirect────── success_url / cancel_url
                             │
                    (meanwhile)
                             ▼
                       Stripe  ──webhook──▶  stripe-webhook  ──upsert──▶  subscriptions
```

### Required env vars

Set all of these in **Supabase → Project Settings → Edge Functions → Secrets**:

| Name | Example value | Where it comes from |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` / `sk_live_...` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe → Developers → Webhooks → your endpoint → Signing secret |
| `STRIPE_PRICE_ID_OWNER` | `price_...` | Stripe → Products → GrowthOS Owner → the **monthly** recurring price |
| `STRIPE_PRICE_ID_OWNER_ANNUAL` | `price_...` | Stripe → Products → GrowthOS Owner → the **annual** recurring price (used when the user picks the yearly plan; checkout falls back to monthly if unset) |
| `APP_URL` | `https://growthos.com` (prod) / `http://localhost:5173` (dev) | Where Stripe sends the user back to |

The `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` are already used for all Edge Function calls — no extra browser env is needed.

### One-time Stripe dashboard setup

1. **Create the Owner product**
   - Stripe → Products → Add product
   - Name: `GrowthOS — Owner`
   - Pricing: add **two** recurring prices on the same product:
     - **Monthly:** $97/month USD → copy the price ID into `STRIPE_PRICE_ID_OWNER`
     - **Annual:** $970/year USD (2 months free vs. monthly) → copy the price ID into `STRIPE_PRICE_ID_OWNER_ANNUAL`
   - The `/pricing` page surfaces both; checkout reads the right one off the `plan` field on the session (`owner` → monthly, `owner_annual` → annual)

2. **Create the webhook endpoint**
   - Stripe → Developers → Webhooks → Add endpoint
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events to subscribe to:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

### Deploying the Edge Functions

```bash
# Apply migration 010 first
supabase db push

# Deploy the Stripe functions. stripe-webhook MUST deploy with --no-verify-jwt
# because Stripe doesn't know about Supabase JWTs — the signature check
# inside the function IS the auth. The others use the standard JWT gate.
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy stripe-portal
supabase functions deploy stripe-topup
```

### Customer Portal setup

The `stripe-portal` function returns a short-lived URL to Stripe's hosted
Customer Portal — where users update their card, cancel, view invoices, or
reactivate. You have to turn it on once:

1. **Enable the portal**
   - Stripe → Settings → Billing → Customer portal
   - Toggle "Enable" — Stripe walks you through the defaults
   - Under "Functionality", enable: update payment method, view invoice
     history, cancel subscription, reactivate subscription
   - Under "Cancellation", choose "At end of billing period" (matches
     our access model — `cancel_at_period_end` keeps users in until their
     current period ends)
   - Save

2. **(Optional) Products the user can switch to**
   - Only matters once we add more than the Owner tier. Skip for now.

The portal doesn't need a webhook of its own — any change the user makes
there triggers a `customer.subscription.updated` event that our existing
`stripe-webhook` already handles.

### Access model

`src/lib/subscriptions.js` exports `hasActiveAccess({ subscription, trialEndsAt })`:

- Before `companies.trial_ends_at` → full access (no subscription row required)
- After trial ends → access requires `subscriptions.status` in `('active', 'trialing', 'past_due')`

`past_due` is deliberately allowed. Stripe retries failed charges for up to 3 weeks; locking users out on the first failed charge causes preventable churn. Tighten to strict `active` only if this becomes abused.

### What the gate actually blocks

The paywall is **scoped to `/tools/*`**. Everything else — dashboard, roadmap, advisor, check-ins, documents, settings — stays reachable for users without an active subscription, because:

- They need `/settings` to upgrade / manage billing in the first place.
- Their existing content (roadmap, documents, check-ins) is theirs to read regardless.
- The thing we're selling is the AI-powered tools; that's what gets gated.

Implementation:

- `src/hooks/useSubscription.js` — the single hook that resolves `{ subscription, hasAccess, status }` for a company. Every billing-aware surface (guard, paywall, banner, Settings billing card) consumes it.
- `src/components/billing/RequireActiveSubscription.jsx` — layout route that wraps the tool subtree in `App.jsx`. Renders `<Outlet />` on access, `<Paywall />` otherwise. **Does not redirect** — the URL stays at `/tools/hiring` (or wherever) so bookmarks survive.
- `src/components/billing/Paywall.jsx` — what the user sees when blocked. Copy + primary CTA vary by why access was denied (`expired` → upgrade, `past_due` → portal, `canceled` → reactivate).
- `src/components/billing/TrialBanner.jsx` — sticky top banner inside `AppLayout`. Self-hides except for the last 3 days of a no-paid-sub trial. Dismissal is per-session (sessionStorage) so re-show works as the countdown shrinks.
- `src/components/settings/BillingSection.jsx` — the authoritative billing surface. Renders plan + renewal + "Manage billing" button for paying users, "Upgrade" for trial / expired, "Update payment" for past_due.

### Testing end to end

1. Point Stripe to test mode (`sk_test_...`).
2. Sign up for a new account, finish onboarding.
3. Go to `/pricing` — you should see "Upgrade now" on the Owner tier (not "Start trial" — that's the logged-out state).
4. Click it. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.
5. Check `select * from subscriptions where company_id = '<your-uuid>';` — a row with `status = 'active'` should exist within a few seconds of completing checkout.
6. Check the Stripe dashboard → Webhook logs to confirm events are arriving with 200 responses.
7. Go to `/settings` → Billing → click **Manage billing**. You should land on Stripe's Customer Portal. Cancel the sub there, then return — the Settings page should reflect `Canceling — access ends <date>`.
8. Expire the trial manually to verify the paywall: `update companies set trial_ends_at = now() - interval '1 day' where id = '<uuid>';`. With no active sub, `/tools/*` should now show the Paywall component instead of the tool body. `/settings` should still load.
9. Fast-forward the trial to 2 days from expiry to see the TrialBanner: `update companies set trial_ends_at = now() + interval '2 days' where id = '<uuid>';`. Any authed page should show the amber "2 days left" banner at the top.

### Troubleshooting

- **"Stripe portal configuration not found"** when clicking Manage billing: you haven't enabled the Customer Portal yet. See "Customer Portal setup" above.
- **Webhook returns 400 "Invalid signature"**: the `STRIPE_WEBHOOK_SECRET` secret doesn't match the signing secret on the Stripe endpoint. Copy it again from Stripe → Developers → Webhooks → your endpoint → Signing secret.
- **Paywall shows for a user who just subscribed**: the webhook hasn't landed yet. Check Stripe → Webhooks → your endpoint for the event status. A refresh is enough once it's 200.

## Edge Functions

GrowthOS leans on Supabase Edge Functions for anything that requires a
secret key, signing, or server-authoritative checks. The browser never holds
an Anthropic, Stripe, Resend, or Google Places key — those all live in
Supabase secrets and only flow through the functions below.

### Function-by-function reference

| Function | Purpose | Required secrets | JWT? |
|---|---|---|---|
| `claude` | Server-side proxy for every Claude call (Solomon, all tools). Replaces the in-browser SDK that leaked the Anthropic key in the bundle. Enforces spend + per-tool caps authoritatively and writes `usage_events` server-side. Supports both JSON and SSE streaming. | `ANTHROPIC_API_KEY` | yes |
| `send-email` | Thin wrapper over Resend. Browser callers pass `{ template, to, data }`; subject/HTML are rendered server-side from a closed template registry (no arbitrary subject/body from the browser — that would turn this into a spam relay). Logs each send to `email_log`. | `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`, `STAFF_LINK_SECRET` (used to embed signed staff portal links in `staff-welcome` template) | yes |
| `staff-portal` | Token-authenticated endpoint backing `/staff/{token}` — the field-crew view that opens from a magic link in an assignment email. No Supabase Auth, no RLS — the HMAC-signed token (verified via `STAFF_LINK_SECRET`) IS the auth, and the function uses the service-role key internally. Operations: `load`, `updateStatus`, `updateChecklistItem`, `addStepComment`. | `STAFF_LINK_SECRET` | no (`--no-verify-jwt`) |
| `stripe-checkout` | Creates a Stripe Checkout Session for the Owner monthly or annual plan. See "Stripe subscriptions" above. | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_OWNER`, `STRIPE_PRICE_ID_OWNER_ANNUAL`, `APP_URL` | yes |
| `stripe-portal` | Returns a short-lived URL into Stripe's hosted Customer Portal so users can update card / cancel / view invoices. | `STRIPE_SECRET_KEY`, `APP_URL` | yes |
| `stripe-topup` | One-time payment for buying extra Claude-run credits on top of the monthly cap. | `STRIPE_SECRET_KEY`, `APP_URL` | yes |
| `stripe-webhook` | Receives Stripe events, verifies the signature, and upserts the `subscriptions` table. Must deploy with `--no-verify-jwt` — Stripe doesn't know about Supabase JWTs; the Stripe signature check inside the function is the auth. | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | no (`--no-verify-jwt`) |
| `gbp-fetch` | Server-side Google Places lookup powering the GBP Optimizer tool. Logs each Places hit (search vs. details) for cost visibility — there's no separate Places cap; it's bounded implicitly by the Claude cap on the GBP tool. | `GOOGLE_PLACES_API_KEY` | yes |
| `qbo-oauth-start` | Begins the QuickBooks Online OAuth handshake. Signs the `state` param so the callback can verify it. | `QBO_CLIENT_ID`, `QBO_REDIRECT_URI`, `QBO_ENVIRONMENT` (`sandbox` or `production`), `QBO_OAUTH_STATE_SECRET` | yes |
| `qbo-oauth-callback` | Completes the QBO OAuth handshake — verifies the `state` signature, exchanges the code for tokens, persists them. | `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`, `QBO_OAUTH_STATE_SECRET`, `APP_URL` | yes |
| `qbo-sync` | Pulls the company's QBO data (P&L, balance sheet) on demand so Solomon's cash-flow tool can read real numbers instead of asking the user. | `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_ENVIRONMENT` | yes |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by
the Supabase Edge Functions runtime — you don't set those manually.

### Setting Edge Function secrets

```bash
# Set each secret once per project. Run from the repo root with the
# Supabase CLI logged in to the right project (`supabase link --project-ref <ref>`).

# Anthropic — used by the `claude` proxy
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Stripe — see "Stripe subscriptions" section for where to find these
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID_OWNER=price_...
supabase secrets set STRIPE_PRICE_ID_OWNER_ANNUAL=price_...

# Resend — transactional email
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM="GrowthOS <hello@your-verified-domain>"

# Staff magic-link signing secret. Generate a fresh random value — this is
# the only thing standing between a stolen link and arbitrary field-portal
# access, so rotate it any time you suspect a leak. `openssl rand -hex 32` is
# fine.
supabase secrets set STAFF_LINK_SECRET=$(openssl rand -hex 32)

# Google Places — only needed if you want the GBP Optimizer to actually fetch
# real Google data instead of stubbing.
supabase secrets set GOOGLE_PLACES_API_KEY=AIza...

# QuickBooks Online — only needed if you want the QBO connector to work
supabase secrets set QBO_CLIENT_ID=...
supabase secrets set QBO_CLIENT_SECRET=...
supabase secrets set QBO_REDIRECT_URI=https://<your-app-domain>/integrations/qbo/callback
supabase secrets set QBO_ENVIRONMENT=sandbox   # or `production`
supabase secrets set QBO_OAUTH_STATE_SECRET=$(openssl rand -hex 32)

# App URL the functions redirect users back to (Stripe success URLs, QBO
# callback redirects, email links). Use http://localhost:5173 for local dev.
supabase secrets set APP_URL=https://your-app-domain.com
```

You can confirm what's set with `supabase secrets list`.

### Deploying every function

```bash
# Push the database schema first so any FK references the functions
# rely on already exist.
supabase db push

# JWT-gated functions — standard deploy. The Supabase runtime enforces
# that the caller's Authorization header carries a valid GrowthOS JWT
# before the function code runs.
supabase functions deploy claude
supabase functions deploy send-email
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-topup
supabase functions deploy gbp-fetch
supabase functions deploy qbo-oauth-start
supabase functions deploy qbo-oauth-callback
supabase functions deploy qbo-sync

# Public functions — MUST deploy with --no-verify-jwt because the caller
# isn't a logged-in GrowthOS user (Stripe webhooks, field crew on a magic
# link). Each function's own internal auth (Stripe signature, HMAC token)
# is what actually protects the endpoint.
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy staff-portal   --no-verify-jwt
```

### Verifying after deploy

- `supabase functions logs <name>` — tail server-side errors
- Settings → Edge Functions → each function's "Invocations" tab in the Supabase dashboard gives request-level traces
- For `claude`: hit any AI-powered tool from the app and confirm `select count(*) from usage_events where created_at > now() - interval '5 minutes'` increases
- For `send-email`: trigger a staff add and confirm a row appears in `email_log` with a non-null `resend_id`
- For `staff-portal`: open the most recent staff invite link and confirm `staff_members.last_seen_at` updates
