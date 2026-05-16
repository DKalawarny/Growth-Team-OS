# GrowthOS — Claude Code project context

This file is auto-loaded by Claude Code in any session opened in this repo.
It's how the previous session hands the project off to the next one. Keep it
current — when something parked gets done, delete that line; when something
new gets parked, add it.

Deeper product context (features, philosophy) lives in
[`GROWTHOS_OVERVIEW.md`](GROWTHOS_OVERVIEW.md) and [`README.md`](README.md).

---

## What this is

GrowthOS (a **Leadeos** product) — React + Vite SPA backed by Supabase
(Postgres + Auth + Edge Functions). Repo: `github.com/DKalawarny/Growth-Team-OS`.

It's an AI business advisor ("Solomon" — Claude Opus/Sonnet/Haiku via a
server-side Edge Function proxy) plus a suite of tools (CFO dashboard, cash
flow forecasting, hiring planner, GBP audit, AI search visibility, safety
compliance tracker, work order checklists) for owner-operated trades —
plumbing, electrical, HVAC, roofing, demolition, masonry, landscaping.

Target buyer: owner-operators, $500k–$15M revenue, 3–50 people.

## Pricing

- **$97/mo** ([`price_1TWhaTAiDwj4YybG6xnspbRl`](https://dashboard.stripe.com/test/prices/price_1TWhaTAiDwj4YybG6xnspbRl))
- **$970/yr** (`price_1TWhaTAiDwj4YybGHNJic1hY`), positioned as "2 months free"
- 14-day free trial, no credit card required
- Hardcoded as `$97/month` in ~8 places: [Landing.jsx:32](src/pages/Landing.jsx),
  [Pricing.jsx](src/pages/Pricing.jsx), [Comparison.jsx](src/pages/marketing/Comparison.jsx),
  [Paywall.jsx:137](src/components/billing/Paywall.jsx),
  [Help.jsx](src/pages/Help.jsx), [TradePage.jsx](src/pages/marketing/TradePage.jsx),
  [Roadmap.jsx](src/pages/Roadmap.jsx) — if pricing changes, all of these flip
  together with the Stripe price IDs

Stripe currently in **test mode** ("Leados sandbox" account
`acct_1TWhOqAiDwj4YybG`).

## Stack

- **Frontend**: React + Vite, `react-helmet-async` (SEO), Vitest smoke tests,
  Puppeteer-based static prerender for marketing pages
- **Backend**: Supabase Postgres + Auth + Edge Functions (Deno)
- **AI**: Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5, all routed through a
  server-side proxy at [`supabase/functions/claude/`](supabase/functions/claude/index.ts) — the previous browser-side
  `@anthropic-ai/sdk` with `dangerouslyAllowBrowser` leaked the key in every
  customer's network tab, so `VITE_ANTHROPIC_API_KEY` is **retired** (see
  [`.env.example`](.env.example))
- **RAG**: OpenAI `text-embedding-3-small` + Haiku-based context compressor
- **Email**: Resend with a closed template registry in
  [`supabase/functions/send-email/`](supabase/functions/send-email/index.ts)
- **Payments**: Stripe subscriptions (checkout, customer portal, top-ups, webhook)
- **Integrations**: QuickBooks Online OAuth, Google Drive Picker, OneDrive Picker

## Project IDs and URLs

- Supabase project ref: `ufhduewbamnmoiksqgfq`
- Supabase URL: `https://ufhduewbamnmoiksqgfq.supabase.co`
- Stripe webhook endpoint: `we_1TWhbdAiDwj4YybGXffKQRaa` →
  `…/functions/v1/stripe-webhook` (4 events: `checkout.session.completed`,
  `customer.subscription.{created,updated,deleted}`)

## Edge Functions

In `supabase/functions/`. Deploy with `supabase functions deploy <name>`.

| Function | Auth | Purpose |
|---|---|---|
| `claude` | JWT | Server-side Anthropic proxy with cap enforcement |
| `send-email` | JWT | Resend wrapper, closed template registry |
| `staff-portal` | **`--no-verify-jwt`** | HMAC magic-link auth for field crew (uses `STAFF_LINK_SECRET`) |
| `stripe-checkout` | JWT | Hosted checkout session creation |
| `stripe-portal` | JWT | Customer portal session |
| `stripe-topup` | JWT | One-off Solomon credit top-ups |
| `stripe-webhook` | **`--no-verify-jwt`** | Stripe signs the request, not the user |
| `gbp-fetch` | JWT | Google Business Profile scrape |
| `qbo-oauth-{start,callback}` | JWT | QuickBooks OAuth |
| `qbo-sync` | JWT | QuickBooks data pull |

Secrets are set via `supabase secrets set` — **never paste secret values into
chat**; use a separate terminal tab and verify with `supabase secrets list`
(only shows digests). Current secrets that should be set:
`ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_ID_OWNER`, `STRIPE_PRICE_ID_OWNER_ANNUAL`, `STAFF_LINK_SECRET`,
`RESEND_API_KEY`, `OPENAI_API_KEY`, `APP_URL`, plus the QBO credentials.

## Migrations

Live in `supabase/migrations/` numbered 001–024. Apply with `supabase db push`.

Every customer-facing table is RLS-scoped by `company_id`. If a migration
was previously applied manually via the SQL editor (and the cloud history
is out of sync with local), use `supabase migration repair NNN --status applied`
before pushing.

## How Daniel likes to work

(From auto-memory accumulated across sessions.)

- **First-time founder, recent convert.** Needs concrete setup steps, not
  theory. Don't over-explain — answer the question, move forward.
- **Wants to stay in the terminal.** Prefers `gh` / `curl` / `supabase` CLI
  over bouncing between browser dashboards. If you can do a thing via
  `curl https://api.stripe.com/...` instead of clicking through a dashboard,
  do that.
- **Doesn't want to click "allow" for every command.** [`.claude/settings.local.json`](.claude/settings.local.json)
  already has broad allow rules for git/npm/supabase/Read/Edit/Write/Glob/Grep,
  plus deny rules for force-push and `rm -rf /`. Don't break that file.
- **Terse responses.** Skip trailing summaries — he can read the diff.
- **Exploratory questions** ("what should I do about X?") → 2–3 sentences
  with a recommendation and the main tradeoff, not an essay.
- **Pricing decisions are his call.** I (Claude) had recommended $147 at
  launch; he chose $97 to ship and revisit later. Don't re-litigate
  unless he asks.

## What just shipped (2026-05-13 session)

- Wrote [`.env.example`](.env.example) documenting required + optional VITE
  vars (notes that `VITE_ANTHROPIC_API_KEY` is retired)
- Fixed the README header and appended an "Edge Functions" section with
  deploy commands and verification queries
- RLS sanity-checked migrations 016–024
- Staged 39 modified + 39 untracked files across 12 logical commits, pushed
  to GitHub via SSH
- Rotated Anthropic API key (new key called "Growth OS for Lead OS"), set
  as `ANTHROPIC_API_KEY` Supabase secret
- Created Stripe Owner product + $97/mo + $970/yr prices in test mode
- Created Stripe webhook endpoint → `…/functions/v1/stripe-webhook`
- Set all 4 `STRIPE_*` Supabase secrets
- Applied migrations 020–024 to cloud DB (020 and 024 were repaired as
  already-applied because Daniel had run them manually; 021–023 ran fresh)
- Deployed the new `claude`, `stripe-checkout`, and `stripe-portal` Edge
  Functions (the other 8 were already deployed)
- Health-checked Claude + stripe-checkout (401 from anon = auth middleware
  working as intended, not a crash)

## Parked — pick up here

In rough order of priority:

1. ~~**End-to-end signup test**~~ — **DONE (2026-05-14).** Stripe → webhook →
   DB confirmed working. Bug found and fixed: `stripe-webhook` was deployed
   without `--no-verify-jwt` (Supabase was blocking Stripe with a 401).
   Redeployed with the flag; subscription row writes correctly.

2. **Stripe live-mode switchover** — blocked on bank account login (Daniel
   needs credentials). Steps once unblocked: finish Stripe account activation
   (Business details → bank account), then create live product + $97/mo +
   $970/yr prices, create live webhook endpoint, update the 4 `STRIPE_*`
   Supabase secrets to live values, do a real $1 charge + refund.

3. ~~**Set `APP_URL` Supabase secret**~~ — **DONE (2026-05-16).** Set to
   `https://leadeos.com`. Site is live and deployed on Netlify.

4. ~~**Add `supabase/.temp/` to `.gitignore`**~~ — **DONE (2026-05-14).**
   Untracked and ignored.

5. **Delete the old Anthropic API key** at
   https://console.anthropic.com/settings/keys once the new server-side
   key has been live a few days and nothing's broken. The old key was
   shipped to the browser pre-rewrite — assume it's leaked.

6. **Offer Builder + Hiring Planner as partner add-on** — these two tools
   are removed from GrowthOS marketing but kept in the app. Once the
   partner's job-management system is built, gate them behind a second
   subscription tier that requires both GrowthOS + the partner product.
   Hiring Planner needs incoming job data from that system to be fully
   useful; Offer Builder is a natural upsell from their quoting flow.

7. **(After traction)** Bump $97 → $147/mo. Recommended $147 at launch
   based on buyer profile (owner-operators with $500k–$15M revenue
   already spend $500–3k/mo on accountants and ServiceTitan). Trigger to
   revisit: 50+ paying customers, OR named case studies on the landing
   page, OR clear data that conversion isn't price-limited.

## Common commands

```bash
cd /Users/danielkalawarny/growthOS

# Dev
npm run dev

# Migrations
supabase db push                                  # apply pending migrations
supabase db push --include-all                    # if out-of-order numbering
supabase migration repair NNN --status applied    # if a migration was run manually
supabase migration list                           # local vs remote
supabase inspect db table-stats                   # see remote tables

# Edge Functions
supabase functions list
supabase functions deploy <name>
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy staff-portal --no-verify-jwt
supabase secrets list                             # digests only, values stay hidden
```

## Where Daniel's auto-memory lives

`~/.claude/projects/-Users-danielkalawarny-Desktop-untitled-folder-2/memory/`

That memory is keyed to the worktree path it was created in — a fresh
Claude Code session opened directly in `/Users/danielkalawarny/growthOS`
will get its **own** memory directory and won't see the prior one
automatically. The relevant project memories from that location:

- `project_growthos.md` — GrowthOS project context (mirror of much of this file)
- `growthos_parked_followups.md` — the parked list above
- `user_profile.md` — Daniel's working style
- `feedback_invite_copy_tone.md` — copy tone for invites/shares
- `project_the_way.md`, `project_deconstructors.md` — his other projects

If you need to pull those into this session's memory, read them once and
write equivalent entries here.
