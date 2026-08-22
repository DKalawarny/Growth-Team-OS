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
server-side Edge Function proxy) plus the tools to act on the advice: finances,
cash flow forecasting, hiring, decisions, playbooks, safety compliance,
succession.

⭐ **REPOSITIONED (Aug 2026).** The buyer is no longer defined by SECTOR
(a plumber, a roofer) but by CONVICTION — a Christian business owner who wants
the business run a particular way. The thesis, in Daniel's words: not everyone
of God needs to be a minister; some are called to be that person inside an
ordinary business. That axis cuts across every industry.

⭐ **POSITIONING DECISION, 22 Aug 2026 — "the Creed principle".** Marketing stays
aimed at the Christian market. The product must NOT push out non-Christians, and
Daniel sees genuine upside in a non-Christian owner encountering it.

The line that matters: **attraction, not persuasion.** The product never steers
anyone toward anything. It behaves with conviction — refuses to flatter, cares
how people are treated, asks what the business is for — and where that comes
from is FINDABLE (About, the pilot agreement) but never pushed. A paying user is
in an asymmetric relationship with the software; the same reasoning that bans
Solomon from helping an owner press faith on employees applies to the product's
own relationship with its user.

Practically this means almost nothing changes: Solomon's scripture rule is
already gated on two triggers and brevity-capped, so a non-Christian user simply
never trips it, and the refusals and anti-prosperity section read as integrity to
anyone. The onboarding "why do you run this business?" step is the mechanism —
the owner states his own frame and Solomon meets him there.

⚠️ Do not add anything that nudges, witnesses, or converts. It would cost the
truthfulness the entire brand runs on.

**Hard product rules, from Daniel, non-negotiable:**
- This must NEVER read like a wealth-preacher app. No prosperity gospel in any
  dilution. Never imply faithfulness produces profit.
- No gimmicks. "It's still business."
- Solomon must be as sharp as the best secular advisor available first —
  what differs is the posture, not the arithmetic.
- Never advise an owner to press faith on employees (power imbalance + legal
  exposure).
- The founder story on /about is DANIEL'S OWN WORDS ONLY. It is currently
  absent on purpose. Do not fill the gap with plausible narrative.

Target buyer: owner-operators, $500k–$15M revenue, 3–50 people.

## Pricing

- **$147/mo**, **$1,470/yr** (positioned as "2 months free")
- 14-day free trial, no credit card required
- [`src/lib/pricing.js`](src/lib/pricing.js) is the single source of truth for
  the human-readable price. `src/lib/seo.js` now imports from it too — the
  JSON-LD schemas used to hardcode `97` / `CAD` and went on advertising that
  long after the price changed, which is what an AI assistant quotes when
  someone asks what this costs. **Never write a price literal anywhere else.**

⚠️ **THE PAGE SAYS $147 AND STRIPE STILL CHARGES $97.** Stripe prices are
immutable, so going live at $147 means creating two NEW prices and updating
`STRIPE_PRICE_ID_OWNER` and `STRIPE_PRICE_ID_OWNER_ANNUAL`. Until that happens
the site advertises one number and bills another. This is the top open item.

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
- **RAG**: `gte-small` via `Supabase.ai.Session` inside the `embed` Edge
  Function (384-dim) + Haiku-based context compressor. ⭐ **OpenAI is gone
  entirely** — no key, no vendor, no billing relationship (migration 029).
  `VITE_OPENAI_API_KEY` and `VITE_VOYAGE_API_KEY` are retired; a `VITE_`
  prefix ships the key to every browser, so never reintroduce one.
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

## What just shipped (2026-08 reposition)

- **Solomon rewritten** — `src/lib/prompts.js` `ADVISOR_SYSTEM_PROMPT` grew from
  ~4.7k to ~21k chars: the vocation thesis, six convictions, an explicit
  anti-prosperity-gospel section (including "would this sentence still be
  honest if the business failed anyway?"), when faith belongs in an answer,
  and a crisis-referral clause that outranks the brevity rule.
- **Memory** — migration 027 `solomon_memory` + `src/lib/memory.js`. Durable
  statements (constraint / decision / person / commitment / preference /
  context) read on every turn. Editable at `/context`.
- **Prompt caching** — `src/lib/anthropic.js` splits the system payload into a
  stable cached block (1h TTL) and a volatile tail. ~90% input saving, measured.
- **OpenAI removed entirely** — migration 029, `supabase/functions/embed`.
- **Design converted dark → light** to match the approved canvas.
- **Marketing surface repositioned** and two live falsehoods removed: JSON-LD
  advertising $97 CAD, and an /about page telling a fabricated first-person
  founder story. See those commits — the reasoning is in the messages.
- **Prerender was silently skipping on Netlify** — fixed in `netlify.toml`.
  Every marketing page had been shipping as an empty SPA shell. Verify with:
  `curl -s https://leadeos.com/about | grep -o "<title>[^<]*</title>"`

## What just shipped (2026-05-17 session — continued)


- **GBP audit form fully wired** — `FreeGbpAudit.jsx` inserts into `gbp_audit_requests`
  (migration 025). Postgres trigger (migration 026) fires `gbp-audit-notify` Edge Function
  via `pg_net` on every insert. Daniel gets an email at `dkalawarny@hotmail.com` with
  the prospect's name, email, city, and website. Both deployed and live.
- **llms.txt fixed** — trial was "7 days" in two places (now 14), price said "CAD" (now USD).
- **Sitemap lastmod updated** — all entries bumped to 2026-05-17.

## What just shipped (2026-05-17 session)

- **Pricing constants fully centralized** — `src/lib/pricing.js` is now the
  single source of truth for all prices and trial duration. Every page
  (Landing, Pricing, Comparison, TradePage, Help, Signup, Paywall, BillingSection,
  TrialBanner, About, FreeGbpAudit) imports from it. One file change = everywhere updates.
- **Solomon branding pass** — replaced all user-facing "Claude" with "Solomon"
  across 15+ files (tools, library components, Roadmap, Onboarding, settings).
  Intentional exceptions: About.jsx founder story, Security/Privacy tech-stack
  disclosures, competitor comparisons ("ChatGPT, Claude, Perplexity").
- **Advisory saves** (Advisor.jsx) — hover-reveal "Save" button on advisor messages
  writes to `documents` table (tool_id: 'solomon'). Solomon entries render in
  Documents Library → Generated tab via new `SolomonSave` renderer.
- **Budget indicator** (Advisor.jsx Header) — monthly spend pill shows remaining
  budget, turns amber at ≥80% usage.
- **Annual billing toggle** (BillingSection) — `BillingToggle` component shows
  monthly/annual choice in trial/expired states.
- **Trial banner** — link fixed to `/settings/billing`, mentions annual savings.
- **PWA support** — `public/manifest.json` added, linked from `index.html`.
- **Welcome email** — `user-welcome` template in `send-email` Edge Function,
  triggered fire-and-forget from Onboarding on completion.
- **Brand cleanup** — `leadeos.com` + `support@leadeos.com` everywhere; old
  `growthos.ca` and `dkalawarny@hotmail.com` removed sitewide.
- **Integrations section** — Google Drive and OneDrive cloud-source cards added
  at bottom of Settings → Integrations.
- **ResetPassword page** — new `/reset-password` route for Supabase email flow.

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

In rough order of priority.

1. ⏸️ **Stripe prices — DELIBERATELY PARKED (21 Aug 2026).** The site says
   $147; Stripe still charges $97. This is NOT urgent while the pilot is free:
   nothing is charged, no card is collected, and Stripe prices are immutable —
   so creating them now just locks in a number Daniel may not want.

   ⭐ He is running a pricing questionnaire with pilot users first, on the
   suspicion that $147 is TOO CHEAP. Against what GrowthOS displaces (coach
   $500–2,000/mo, bookkeeper $400–800, fractional CFO $500–1,500) that is a
   reasonable suspicion.

   ⚠️ Do not create the Stripe prices until that lands, and do not re-litigate
   the number — it is his call. When it is decided: create two new prices, then
   `supabase secrets set STRIPE_PRICE_ID_OWNER=…` and
   `STRIPE_PRICE_ID_OWNER_ANNUAL=…`, and update `src/lib/pricing.js` (the only
   place a price literal may live — three copies had already drifted once).

2. ⏸️ **PRICING QUESTIONNAIRE — drafted, not built, not sent (21 Aug 2026).**
   To go to pilot users before any price is set. Daniel will send it himself
   when ready; do not build or send anything until he says so.

   ⚠️ Do NOT ask "what would you pay?" — the least reliable pricing question
   there is. People under-report willingness to pay, and friends distort it
   both ways (lowball so as not to look like an easy mark, or inflate to be
   encouraging). The set below is Van Westendorp plus behavioural anchors.

   Lead with behaviour, because it beats stated opinion every time:
     1. What did you actually use it for this month?
     2. What would you stop paying for, or stop doing yourself, if you kept it?
     3. What do you currently spend on that thing?

   Then Van Westendorp (four points, not one number):
     4. At what monthly price would this be so expensive you would not consider it?
     5. At what price would it be expensive, but still worth considering?
     6. At what price would it be a bargain?
     7. At what price would it be so cheap you would question whether it was any good?

   Then one direct check:
     8. At $147/month, would you sign up today — yes / no / maybe, and why?

   ⭐ Q7 is the one that answers Daniel's actual question. If a meaningful
   number name something at or above $147, the price is too low.

   ⭐ Weight the behavioural answers over the stated numbers. Someone who says
   they would pay $300 but logged in twice has given a $0 answer.

3. 🔴 **Revoke two exposed keys.**
   - The OpenAI key typed on the command line during the Aug 2026 session
     (it appeared in a screenshot). OpenAI is no longer used at all, so also
     `supabase secrets unset OPENAI_API_KEY`.
   - The Voyage key, leaked into a chat transcript by a grep. dash.voyageai.com.

4. **Stripe live-mode switchover** — blocked on bank account login. Then:
   finish account activation, create the LIVE product and prices (at $147 /
   $1,470, not $97), create the live webhook endpoint, update the four
   `STRIPE_*` secrets, and do a real $1 charge + refund.

5. **Two marketing pages are still on the old positioning, deliberately left
   for Daniel to decide rather than deleted:**
   - `/crm` — markets a companion operations CRM at $699 that does not exist
     yet (it depends on the partner's job-management system, item 6).
     Currently indexed and in the sitemap.
   - `/free-gbp-audit` — a working lead-gen funnel (form → `gbp_audit_requests`
     → trigger → email). It promises a GBP audit deliverable, and the GBP tool
     is no longer part of the product story. If nobody is fulfilling those
     audits, it is a promise being made and not kept.
   Neither was removed unilaterally. Both are live right now.

6. **`/tools/gbp` still exists as a route** but is surfaced nowhere — not in
   the sidebar, not in SolomonLauncher. All marketing claims about it were
   removed. It is legacy, not deleted. Decide whether it goes.

7. **Delete the old Anthropic API key** at
   https://console.anthropic.com/settings/keys. It was shipped to the browser
   pre-rewrite — assume it is leaked.

8. **Offer Builder + Hiring Planner as partner add-on** — kept in the app,
   gated behind a second tier once the partner's job-management system exists.

9. **Tool-use for Solomon.** He currently SEEDS a conversation from the
   launcher rather than running tools himself. This is the biggest remaining
   product gap.

10. **Netlify**: Daniel is on the Personal plan and intends to cancel — confirm
   it ends Sep 13 rather than immediately, or deploys stop. Deploys are
   credit-metered (300/mo free ≈ 20 deploys at 15 credits each), so batch
   changes rather than pushing one fix at a time.

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
