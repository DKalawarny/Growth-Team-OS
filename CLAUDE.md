# Eliv8 OS — Claude Code project context

This file is auto-loaded by Claude Code in any session opened in this repo.
It's how the previous session hands the project off to the next one. Keep it
current — when something parked gets done, delete that line; when something
new gets parked, add it.

Deeper product context (features, philosophy) lives in
[`ELIV8OS_OVERVIEW.md`](ELIV8OS_OVERVIEW.md) and [`README.md`](README.md).

---

## What this is

**Eliv8 OS** — React + Vite SPA backed by Supabase
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

⭐ **NO PRICE IS PUBLISHED ANYWHERE RIGHT NOW (22 Aug 2026).**
`SHOW_PUBLIC_PRICE = false` in [`src/lib/pricing.js`](src/lib/pricing.js), kept
deliberately separate from `PAYMENTS_LIVE`: that one answers *can we charge*, this
answers *should we publish a number*.

$147 had been on ~13 indexed pages plus Product / SoftwareApplication JSON-LD
built to be quoted back by AI assistants — while Daniel's own view is that $147 is
probably too low (the reason the questionnaire exists) and Stripe is still wired to
the old $97 prices. So the one channel that has ever brought this product a
stranger was busy caching a number we expect to abandon and would not have charged
anyway. Both schemas now publish **no Offer at all**; every public surface reads
"free while in private pilot"; the monthly/annual toggles are hidden.

⚠️ `PRICE_MONTHLY_USD` is still the single source of truth — this only controls
whether we say it out loud. **Flip to true only when the questionnaire has settled
the price AND two NEW Stripe prices exist at that figure with
`STRIPE_PRICE_ID_OWNER` / `_ANNUAL` pointing at them** (Stripe prices are
immutable, so they must be recreated, not edited).

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
`RESEND_API_KEY`, `APP_URL`, plus the QBO credentials.
⚠️ `OPENAI_API_KEY` is NOT in that list on purpose — OpenAI was removed entirely
(migration 029) and the secret should be **unset**, not rotated. See parked item 3.

## Migrations

Live in `supabase/migrations/` numbered 001–031. Apply with `supabase db push`.

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

## ⭐⭐ SOLOMON'S VOICE — the rule the register turns on (26 Aug)

Daniel on a live reply: convoluted, too much lingo, *"people will want to have
peace when using this"*, *"we need a personality"*. Three causes were mechanical,
one was self-inflicted that same morning: the instruction "say the two or three
things that matter" came back as the literal sentence **"Three things that change
what you do next:"** with a bolded numbered list, reply after reply. ⚠️ **A number
in an instruction becomes a template.**

⭐⭐ **DIRECT ABOUT THE SITUATION. NEVER DIRECTIVE ABOUT THE PERSON.**
His catch, and the whole voice turns on it. He read *"part of that balance was
never yours to spend"* as rude — because it is a **verdict on him**, not a fact
about money. *"Some of that $60k might be GST you're holding"* says the same
thing without correcting him. "The money's not quite there yet" is about the
plan; "you shouldn't hire yet" is about him. Facts stay as hard as they need to
be; the owner is never the one being corrected. This does NOT soften him — the
rule that he be as sharp as the best secular advisor is unchanged.

Also: a new `HOW YOU SOUND` section (the prompt previously said a great deal
about what NOT to sound like and nothing about who he IS — negative rules produce
a competent void, which was the missing personality); FORMAT rewritten to prose,
usually under ~120 words, no bolded lead-ins, no numbered findings; and a hard
rule to **never mention his own machinery** ("the tool flagged…" was the software
narrating its own plumbing).

⚠️ Fixed alongside: numbered lists rendered **"1. 1. 1."** — a blank line between
items ended the `<ol>` and restarted the counter, and Solomon writes exactly that
way, so every numbered answer he ever gave was numbered wrong.

## ⭐ VOICE I/O — built, NOT yet keyed (26 Aug)

`supabase/functions/tts` (ElevenLabs) + `src/lib/voice.js`. **Listen is a button,
never auto-speak**: 30k credits ÷ ~550 chars ≈ **54 spoken replies a MONTH across
all users**. Degrades to the device voice on 401/429 and SAYS so, rather than
letting the owner think the robot is Solomon. Dictation uses the browser's own
recognition — free, no new billing relationship.

🔴 **NEEDS `supabase secrets set ELEVENLABS_API_KEY` then `supabase functions
deploy tts`.**
⚠️ **ITS OWN ELEVENLABS ACCOUNT — not kinwove's.** A shared credit pool means
this product silently drains kinwove's Bible narration; that already happened
once, on 1 Aug.
⚠️ **ElevenLabs FREE FORBIDS COMMERCIAL USE.** Starter ($6/mo, 30k credits) is
the first tier with a commercial licence — verified against their pricing page.
⭐ Cost: ElevenLabs ~5–11¢ a reply vs ~0.08¢ on Google/Deepgram (60–100×). Right
at pilot scale; the vendor lives entirely behind the edge function, so switching
is one file.

## ⭐⭐ THE CREED PRINCIPLE, APPLIED PROPERLY (26 Aug)

⚠️ It had been **HALF-APPLIED**, which is worse than either choice. The "For
Christian business owners" badge came off the landing page on 22 Aug — and the
identical label stayed in the `<title>`, meta description, OG tags, both JSON-LD
schemas, `llms.txt`, and the /pricing, /about and /signup descriptions. Every one
of those is **louder** than the badge: the browser tab, the search result, the
link preview, and the exact text an AI assistant quotes back.

⭐⭐ Daniel then went **further than the 22 Aug decision**: *"it doesn't bring in
non-Christians. I want this open to everyone. It's the fundamentals, the hidden
code, that is Christian."* So all identity targeting is gone from the keyword
arrays too — **sorting by identity is still sorting even where nobody can see
it**, and it selects against exactly the owner this could reach first.

✅ **Nothing underneath was touched, and he asked directly.** Solomon's prompt
keeps THE OWNER'S FRAME, WHAT THE BUSINESS IS FOR (his thesis verbatim), WHEN
FAITH BELONGS IN THE ANSWER, REFERENCING BOOKS and both anti-prosperity halves;
the 13-book canon; onboarding's "why do you run this business" → `solomon_memory`,
read every turn; the landing ConvictionSection; /about; /terms.
**The hidden code is Christian. Nothing announces it at the door.**
⚠️ Do not re-add identity wording to any title, description or keyword — the
reasoning is written into `seo.js` in his words.

## ⭐ RENAMED — GrowthOS / Leadeos → Eliv8 OS (26 Aug 2026)

**Eliv8** — El (God), live, and the eternal 8. Discreet on purpose: a reader
sees "elevate", anyone who looks finds El. The same mechanism as the landing
page's "someone who shares none of your convictions" — findable, never asserted.

Primary domain **eliv8os.com**. `src/lib/seo.js` remains the single source:
SITE_URL, SITE_NAME, ORG_NAME, CONTACT_EMAIL.

⚠️ **THIS FILE USED TO SAY "eliv8-os.com also owned, points at it". IT WAS THE
OTHER WAY ROUND** — and that inverted note cost real time on 27 Aug. GoDaddy held
a **domain forwarding rule `eliv8os.com` → `https://eliv8-os.com` (permanent
301)**, so the good domain was sending every visitor to the hyphenated one, which
serves a **GoDaddy Website Builder "coming soon" page** ("Announcing our website
launch!"), not the product.

⭐ The tell was in the DNS table, not the forwarding tab: the two parking A
records had their **edit and delete icons greyed out**. GoDaddy locks the apex
records while forwarding owns them. Deleting the forwarding rule collapsed both
into one editable `A @ Parked` row. **If apex records are ever un-editable, look
for forwarding before anything else.**

⚠️ **THE 24 LOWERCASE `growthos:` STRINGS ARE localStorage KEYS AND MUST NOT BE
RENAMED.** They carry saved roadmap views, dismissed banners, trajectory
checkboxes and — critically — `growthos:terms-pending`, which ferries terms
consent across the Google OAuth redirect. Renaming them silently wipes every
existing user's state and breaks consent capture. They are deliberately left.

⚠️ Also left alone: the `.ics` UID domain in `icsExport.js`. Changing a UID makes
every previously imported calendar event duplicate on the owner's calendar.

⭐ Fixed in passing: `buildInviteUrl` fell back to `https://app.growthos.com` —
a domain registered to a stranger on NameCheap since 2018.

### Domain repointing — LIVE on eliv8os.com (27 Aug 2026)

⭐ The ordering rule the whole switch ran on: **additive steps first, cutover
steps only once the domain actually serves.** Pointing `APP_URL` or the Supabase
Site URL at a domain that 404s breaks Stripe returns and password resets in the
meantime, for no gain. That ordering held and is why nothing broke.

✅ **Supabase → Auth → URL Configuration.** Four redirect URLs added:
`https://eliv8os.com/**`, `https://www.eliv8os.com/**`, `https://leadeos.com/**`,
`https://www.leadeos.com/**`. ⭐ The list had been **completely empty**, so the
only permitted redirect was ever the bare Site URL — `/reset-password` could not
have worked from an email link on any domain. Fixed as a side effect.
✅ **Site URL** → `https://eliv8os.com`. ✅ `APP_URL` secret → same.

✅ **GoDaddy DNS.** `A @ → 75.2.60.5` (TTL 600), `CNAME www →
fabulous-boba-bd78c9.netlify.app`. Verified at ns69 AND at 8.8.8.8 / 1.1.1.1.
⭐ See the forwarding-rule trap documented in the rename section above — that was
the real blocker, and the greyed-out record icons were the only visible sign.

✅ **Netlify.** Both hostnames added, verified, certs issued, and **eliv8os.com is
now the primary domain**; `www.eliv8os.com` redirects to it; `leadeos.com`
demoted to alias.

🔴 **THE ONE THAT COST THE MOST TIME — A VERIFIED DOMAIN CAN STILL 404, AND ONLY
A REDEPLOY BINDS IT.** After DNS resolved, the certs issued and Netlify cleared
its "Pending DNS verification" warnings, `eliv8os.com` still returned 404 for
**~20 minutes** while `leadeos.com` served 200 from the *same deploy*. It was not
propagation and waiting would not have fixed it.

⭐ **The diagnostic was the response headers, not the status code.** Both are
"404 from Netlify" until you look:
```
leadeos.com   server: Netlify   x-nf-request-id: …   cache-status: "Netlify Edge"; hit
eliv8os.com   server: ip-10-124-4-72.us-west-2.compute.internal   x-request-id: …
```
No `server: Netlify`, no `x-nf-request-id` → the request never reached the site's
edge config at all; it hit Netlify's unmapped-domain handler. **Triggering a
deploy republishes the domain binding and fixed it within one build.** Checked
first that only one project existed, so it was not a domain claimed elsewhere.

✅ **Verified by reading the artifact, not the status code** (the 22 Aug rule):
homepage `<title>` correct, `/about` returns "About Eliv8 OS — why it exists"
(so the prerender still runs), 2 JSON-LD blocks, `/pricing` + `/signup` 200 via
the SPA fallback.

🔴 **`leadeos.com` DID NOT 301 ON ITS OWN — the plan above was wrong about this.**
A Netlify **domain alias serves the same content with no redirect**; only the
www/apex counterpart of the *primary* is redirected automatically. Live proof:
`HTTP/2 200`, no `Location`. Two domains serving byte-identical pages is
duplicate content and the damage lands on the NEW domain. Fixed with four forced
rules in `public/_redirects` — ⚠️ they must stay **above** the SPA fallback, and
the `!` is load-bearing or Netlify serves the existing index.html instead.
⚠️ **NOT YET DEPLOYED** — committed locally, needs a push to take effect.

⭐ **Daniel on 27 Aug: "i dont care for leadeos that can go ill cancel it."** His
call, and the redirect is written so either choice works. The one thing worth
knowing: the 301 only carries the search equity **while the domain is still
registered**. Letting it lapse drops the link — no rule in `_redirects` can
substitute for owning the name.

✅ **RESEND — eliv8os.com added as a sending domain (27 Aug).** Three records
entered at GoDaddy BY HAND and verified at ns69: `TXT resend._domainkey` (DKIM,
218 chars, byte-compared before saving), `TXT send` = `v=spf1
include:amazonses.com ~all`, `MX send` → `feedback-smtp.us-east-1.amazonses.com`
priority 10. Region us-east-1. ✅ **VERIFIED** the same session (it read
Pending for ~25 min first — Resend warns GoDaddy propagation can take hours, so
Pending is not a fault, just wait).

✅ **`RESEND_FROM` = `Eliv8 OS <noreply@eliv8os.com>`**, set only AFTER Verified
appeared. ⚠️ The ordering is not optional: Resend refuses to send from an
unverified domain, so setting it early breaks every outgoing email — welcome
emails, the GBP audit notification, everything — with nothing in the UI saying
why.
⚠️ **`noreply@` is a SENDING identity only; nothing receives there.** Email
*receiving* is off (see below), so a customer who hits reply reaches a black
hole. That is the same gap as the advertised-and-dead `support@` below, and both
close with the same decision.

⭐ **Chose Manual setup over Resend's "Auto configure"** — auto-configure asks for
standing write access to the whole GoDaddy DNS zone via OAuth, which is a far
bigger grant than three records need.
⭐ **Resend truncates DNS values in the UI with a real `[…]` DOM node**, so both
the screenshot AND `innerText` give you a corrupted string. The full value lives
in the copy button's `aria-label`. Guessing the middle of a DKIM key produces a
record that looks right and never verifies.
⚠️ **`Enable Receiving` deliberately left OFF.** Turning it on wants `MX @` →
`inbound-smtp...`, which would occupy the apex MX and collide with whatever
really hosts `support@eliv8os.com`. The apex has NO MX record right now.
⚠️ This is **kinwove's Resend account** (only `kinwove.com` was in it). Same
shared-vendor shape as the ElevenLabs warning above — fine for a pilot, worth
separating before it matters.

🔴 **CORRECTION — IT IS NOT GOOGLE SIGN-IN THAT BREAKS ON THE NEW DOMAIN.**
An earlier hand-off note said Google sign-in would fail until the OAuth origins
were updated. **This repo contains no `signInWithOAuth` at all** — Google sign-in
is kinwove's feature, not this product's. What actually breaks is **Google Drive
import**: `src/lib/googleDriveImport.js` loads Google Identity Services and calls
`initTokenClient` **in the browser**, and GIS validates the page origin.
The client ID is real and shipped in the production bundle
(`170277291780-2945tkdsacfn8j7ctan0t4vvsamrb58g.apps.googleusercontent.com`), so
this is a live break, just a different one. ⭐ The Supabase auth callback is
unchanged and needs nothing.

🔴 **THE PRIMARY FLIP SILENTLY DROPPED `www.leadeos.com`** (found 28 Aug, after
the deploy). Netlify treats the www of the PRIMARY domain as a special
"redirects automatically to primary" entry. Demoting `leadeos.com` to a plain
alias took its www partner off the domain list with it — and the certificate
reissued covering `eliv8os.com`, `www.eliv8os.com`, `leadeos.com` and **not**
`www.leadeos.com`. That host fell back to Netlify's `*.netlify.app` wildcard, so
every visitor got a **full-page browser security warning** — worse than a dead
domain, because it reads as compromised.

⭐ **How it hid, and the lesson:** `curl` just returned `000`, and
`openssl s_client` reported **"Verify return code: 0 (ok)"** — because openssl
validates the CHAIN, not the HOSTNAME. Nothing said "wrong cert". The only thing
that showed it was listing the SANs per hostname:
```
for d in eliv8os.com www.eliv8os.com leadeos.com www.leadeos.com; do
  echo | openssl s_client -connect $d:443 -servername $d 2>/dev/null \
    | openssl x509 -noout -text | grep -A1 "Subject Alternative Name" | tail -1
done
```
Fixed by re-adding `www.leadeos.com` as a domain alias; Netlify auto-reissued.
✅ Verified: one cert now carries all four names, and all three non-primary hosts
301 to eliv8os.com with the path preserved (`www.leadeos.com/about` →
`eliv8os.com/about/`).
⚠️ **Whenever a primary domain changes, re-check the OLD domain's `www`.**

✅ **GOOGLE CLOUD MOVED OFF DECONSTRUCTORS (28 Aug).** Eliv8's credentials came
from a project inside the **deconstructors.ca org** Daniel is exiting. Rebuilt
under his personal gmail (`dannykalawarny88@gmail.com`, **No organization**) as
project **`eliv8os`** — recreated rather than migrated, because moving a project
between orgs needs admin on both, i.e. a favour from whoever keeps the company.

Two API keys, deliberately **not one** — the uses have incompatible restrictions:
| key | used from | application restriction | APIs |
|---|---|---|---|
| `GOOGLE_PLACES_API_KEY` | **server** (edge fn, `X-Goog-Api-Key`) | **None** | Places API (New) |
| `VITE_GOOGLE_API_KEY` | **browser** (`setDeveloperKey`) | HTTP referrers | Picker + Drive |
⚠️ A referrer restriction on the server key breaks it — edge functions send no
referrer. ⚠️ It must be **Places API (New)** (`places.googleapis.com/v1`); the
legacy "Places API" looks enabled and every call still fails.

✅ **Verified in the SHIPPED BUNDLE, not the dashboard** — both values were found
in the live code-split chunk `/assets/Documents-*.js`. ⭐ Grepping the entry
bundle finds nothing; the Drive code is lazily loaded.

⚠️ **The consent screen stays in TESTING with Daniel as a test user.** Drive
scopes are *sensitive*, so publishing triggers a Google verification review.
Fine at pilot scale; a real gate before customers use Drive import.

⚠️ **Do not shut down the old `Growth Os` project** until Drive import has been
seen working once.

🔴 **NETLIFY'S ENV EDITOR SILENTLY DOES NOTHING** — cost five attempts. Entering
an API-key-shaped value pops a **second confirmation modal** ("This looks like a
sensitive value") that renders **below the fold**. The save just… doesn't happen:
timestamp unchanged, no error. ⭐ **Scroll after every submit.** Choose *Save
without marking as secret* — a `VITE_` var is compiled into the public bundle, so
marking it secret hides it from the build, not from users.

🔴 **STILL OPEN — DANIEL'S:**
  1. **Drive import click-through** on eliv8os — the one thing about the Google
     move that has not been exercised end to end.
  2. **`support@eliv8os.com` has no mailbox.** It is in `seo.js` as
     `CONTACT_EMAIL` and printed on live public pages, so it is advertised and
     dead. Needs a provider decision (free forwarder vs paid mailbox); the DNS
     is a session's job once he picks. ⚠️ Whatever he picks adds an **apex MX** —
     Resend's receiving toggle was left OFF on purpose so nothing collides.
     ⚠️ `noreply@eliv8os.com` can send but nothing receives, so a customer hitting
     reply hits a black hole. One mailbox closes both gaps.

Also still open: Stripe product name, Supabase project name (still "Growth Team
OS").

🔴 PRE-EXISTING BUG FOUND: `OG_DEFAULT_IMAGE` points at `/og-default.png` and
**that file does not exist in public/**. Every link preview the site has ever
produced — Slack, iMessage, LinkedIn — has had a broken image.

## What just shipped (2026-08-26)

🔴 **`useAuth` WAS A PLAIN HOOK, NOT A CONTEXT.** 44 components call it, and each
one independently ran `getSession()`, fetched profiles + company_members +
companies + business_profiles, and opened its own `onAuthStateChange`. Measured
on `/settings/business`: **68 Supabase requests per page load, the same profiles
row 18 times**, traffic never settling — which is why that page never reached
idle. Now one `AuthProvider` in App.jsx: **22 requests, profiles 3×** (the rest
is dev StrictMode). ⭐ **All 44 call sites are unchanged** — same export, same
shape, which is the only reason a change this central was safe.
⚠️ Verified pre-existing by stashing and reloading HEAD first. ⚠️ NOT click-tested
on every route; the evidence it works is that authenticated reads still return
200, which needs a resolved session and RLS.

⭐ **THE MODEL WAS THE FIX, NOT THE PROMPT.** Haiku vision misread a quote date
and restated it confidently. Prompt hardening did not help — the identical wrong
date came back on a re-run, which also rules out "run it twice and compare".
Sonnet read it correctly and flagged the genuinely ambiguous field instead of
guessing. `extractImage` is now SONNET. ⚠️ My first prompt fix quoted the correct
date inside the instructions; a test that leaks the answer certifies rather than
checks.

**Images in the Solomon chat** — paperclip + paste, real vision (not a
description), HEIC handled, and "Keep this in my documents" promotes one into the
Library where it is described, chunked and searchable. Image rides on its own
turn only; see `lib/chatImages.js` for why.

**"Show him the business"** — onboarding step 6, after roadmap generation. A list
of what Solomon CANNOT tell you yet, each naming the document that unlocks it.
⚠️ Built but unverified in a browser: only reachable via a fresh signup.

**Drive/OneDrive are an IMPORT, not a sync** — deliberate (a standing
account-wide read grant is a bigger consent and a bigger breach surface, and
indexing everything makes retrieval worse). Migration **032** records provenance;
a **Check Drive** button reports what has changed since. Landing page no longer
claims otherwise.

**Freshness and remittances.** `financials_freshness` does the arithmetic on how
old a QuickBooks sync is (there is no cron, by design — migration 008), and a
refresh strip appears in the Advisor when stale. GST/HST and payroll deductions
are now stored inputs on `financial_settings`, fed in as `remittances`; Solomon
names or subtracts them and never calculates what is owed. 🔴 The conversational
version of that rule did NOT fire on its own — one instruction losing against a
21k-char prompt, which is why it became a stored field instead.

**Library Intelligence** now reports `library_total` and `omitted` alongside
`file_count`; it reads the 12 newest files and used to present that as the whole
library.

⚠️ **The per-tool disclaimer did not reach the chat** — tool pages and the Library
both render it, tools run from the conversation went around both. Fixed.

🔴 **NETLIFY PAUSED THE SITE mid-session** (`usage_exceeded`, 503). Personal plan
is 1,000 credits/month; usage went 1.8 → 739 → 516-and-tripped across three
cycles. ⭐ **Working rule on this repo now: commit locally by default, batch, and
ASK before pushing.** Six deploys in a day is what did it.

## What just shipped (2026-08-24 — Solomon runs the tools)

⭐ **Solomon can now run the tools himself.** He was only ever able to SEED one:
the launcher dropped a sentence into the composer and he answered it in prose.
He could talk about a thirteen-week cash position; he could not produce one.

Two tools, each held to the same test as any other feature — *does it tell
Solomon something true about the business, or does it act on what Solomon said?*

- **`search_library`** — the library, searched again, mid-conversation. The
  advisor context already ran one semantic search per turn, but only ever
  against the owner's own last message; four turns in, retrieval was answering
  a question nobody was asking any more.
- **`run_tool`** — the real tool, the real prompt, the real structured
  artifact, saved to the Library where the existing `tool_id` renderer already
  knows how to draw it. Eight are runnable: cash-flow, cfo-dashboard,
  hiring-scorecard, org-chart, offer-builder, decision, rocks-tracker,
  exit-readiness.

⭐ **The loop runs in the BROWSER, not the Edge Function** (`lib/solomonTools.js`,
driven from `Advisor.jsx`). Every tool is something the app already does with the
owner's own session: RLS scopes it, the existing tool prompts drive it, the
existing caps meter it. Running the loop server-side would mean rebuilding all of
that against the service-role key. The Edge Function only gained tool passthrough
and `tool_use` in its normalized SSE.

A run costs one of the ten monthly runs for that tool, exactly as clicking the
tool page would — the chat is a different door onto the same thing, not a way
around the meter. Three tool rounds max, then the next call goes out with
`tool_choice: {type:'none'}` so the turn always ends in words.

⚠️ **Tools are declared even on that last round.** A conversation whose history
holds `tool_use` blocks must still define the tools they refer to — dropping the
list would 400, and would also change the cached prefix. `tools` renders BEFORE
`system`, so `SOLOMON_TOOLS` must stay a module constant with stable key order or
every Advisor turn re-writes the cache.

Artifacts persist in `chat_messages.source_documents` — the column already
existed, defaulted to `'[]'`, and is exactly the right shape, so the chips
survive a reload with no migration.

**Verified live**, not just built: Solomon announced the run, named the input he
did NOT have rather than inventing a bank balance, called `run_tool`, and the
artifact rendered in the Library through the existing `cash-flow` renderer with
thirteen weeks that reconcile ($60,000 → 63,500 → 61,700 → 53,500 → …) and notes
citing real AR. Chip survived a reload. Two turns cost $0.21.

⚠️ **One of the two runs failed and the cause was never established** — console
and network capture were not armed for it, and it did not reproduce. Solomon
handled it correctly (said so plainly, offered to continue in prose) but the
underlying fault is unknown. Two changes so the next one names itself rather
than needing a diagnosis:
- `runToolCall` now throws on `stop_reason === 'max_tokens'` instead of letting
  the truncated JSON fail at `JSON.parse`, where the message blames the parser
  for our token budget. This is the 22 Aug Library Intelligence lesson made
  structural — the edge function forwards `stop_reason` now, so the condition
  can be named instead of diagnosed.
- Cash flow gets 6000 tokens on the Solomon path. A measured run fills 13 week
  objects each with a sentence-long note plus assessment, key events, risks and
  actions — close enough to 4000 that a wordy month tips over, and truncated
  JSON saves nothing. ⚠️ **The tool PAGE still uses 4000** and carries the same
  risk; left alone because the cause is unproven and changing eight pages on a
  guess is how you break things.

🔴 **Found on the way: every tool generate had been running with NO system
prompt.** `runToolCall` accepted `promptKey` / `stableContext` and never put
them in the request body — it still built from `systemPrompt`, which the tool
pages stopped sending in b3a3b2f when the prompts moved server-side. The Edge
Function fell through to its legacy branch and got `""` plus the respond-in-JSON
suffix. The model still returned parseable JSON and the pages still rendered it,
so nothing looked wrong from either end. Broken 22 Aug → 24 Aug, all eight
promptKey tools; Newsletter was unaffected because its prompt is inline.

⭐ **The only signal was an unused-parameter warning in the linter, not in the
product.** Same shape as the `knowledge_files.milestone_id` column: two sides
each internally coherent, disagreeing with each other, no error in between.
`src/lib/anthropic.test.js` now asserts the WIRE — and the assertions were
verified to FAIL against the old code before being kept.

## What just shipped (2026-08-22 — audit + uploads session)

Everything below was found by RUNNING the product in a browser, not by reading
source. Each one was invisible in review and obvious within seconds of a real file
or a real click. That is the lesson worth carrying, more than any individual fix.

⭐ **WHAT THIS PRODUCT IS — settled.** It is an **advisor, not a CRM.** The
companion CRM depended on a partner's job-management system and **that idea is
dead**, so `/crm` is deleted (page, route, sitemap, robots, and the `/vs/jobber`
row that said "pair with our CRM"). It had been public and indexed with its
internal notes still in it: *"Pricing TBD … replace with real tier pricing once the
market study lands"* and `$XXX / month · placeholder`.

The Board is **not** a half-built CRM: `work_orders` and `staff_members` feed
`buildAdvisorContext`, so it exists to keep Solomon current, same as check-ins.

⭐ **THE TEST FOR ANY NEW FEATURE:** *does it tell Solomon something true about the
business, or does it act on what Solomon said? If neither, it is out.*

🔴 **Every upload in the app had been failing.** `lib/knowledgeFiles.js` writes
`milestone_id` and `listFilesForMilestone()` filters on it, but **no migration ever
created the column**. PostgREST refused the insert, and `uploadKnowledgeFile` treats
that as fatal — it deletes the Storage object it just wrote and throws. The file
uploaded, the text extracted, then the row was refused and the blob rolled back,
leaving no trace anything had been attempted. Migration **031**. Hit both the
Library dialog and the Roadmap's "attach completion evidence".

🔴 **The RAG chunker silently indexed ~7% of any file without blank lines.**
`chunkText` split on `/\n{2,}/` and its overflow branch is guarded on
`current.length > 0` — false for the first paragraph. A CSV has no blank lines, so
the whole file came back as ONE paragraph: a 500-row export measured one chunk,
29,266 chars. `embed` slices at 8,000 and gte-small's window is ~512 tokens, so the
stored vector described the first 7% while it logged "1 text chunk" and looked
indexed. ⚠️ Not a CSV bug — a *no-blank-lines* bug; continuous PDF extractions hit
it identically. Fixed with `splitOversized` (general) + `splitDelimited` (CSVs
chunk by row with the header repeated on every chunk).

**Library Intelligence was never a parser bug — it was a token cap.**
`output_tokens` landed exactly on `maxTokens: 1500` and the JSON stopped mid-word.
Raised to 4,000. ⭐ Diagnosing this: patch `window.fetch` in the page, clone the
response, and read `usage.output_tokens`; equal to `maxTokens` means truncation.

**Uploads rebuilt**: multi-file batches, folder drops expanded via the entries API,
per-file rejections, failed files stay queued for retry, one library analysis at the
end instead of one per file.

**Site audit fixes** (all verified live): `/security` and `/privacy` claimed a
self-serve data export **that does not exist** (`/help` had it right all along);
`/pricing` showed two different annual savings 20px apart ($294 vs a hardcoded
$194); a dead "Upgrade now" CTA that looked live and did nothing; a "Free trial
ends" calendar landmark contradicting the pilot agreement; Settings→Usage rendering
a cap-EXEMPT bucket as a nearly-full `untagged 7 / 10`; the stale "operating system
for service businesses" footer; `BackToTools` on Decision and Safety.

⚠️ **`scripts/prerender.mjs` keeps its OWN route list with `<title>` assertions.**
Deleting `/crm` without removing its entry there failed the Netlify build. Update
it whenever a public page or its title changes.

⚠️ **Verify by exit code and by reading the artifact — never by grepping for a
success string.** `npm run build | grep -E "^error|✓ built"` reported green while
the prerender step was failing, because it matched vite's "✓ built" from the
bundling step above the failure.

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
  `curl -s https://eliv8os.com/about | grep -o "<title>[^<]*</title>"`

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
- **Brand cleanup** — `eliv8os.com` + `support@eliv8os.com` everywhere; old
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
   suspicion that $147 is TOO CHEAP. Against what Eliv8 OS displaces (coach
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

5. **`/free-gbp-audit` promises something nobody may be delivering.** A working
   lead-gen funnel (form → `gbp_audit_requests` → trigger → email) that collects a
   real name and email and promises a scored Google Business Profile audit back —
   while the GBP tool is legacy and surfaced nowhere. **Ask Daniel whether anyone
   fulfils these.** If not, it must stop promising one. Not removed unilaterally
   because it is the only lead capture on the site.

   (`/crm`, formerly listed here, was deleted on 22 Aug — see the 8/22 section.)

5b. **Ten indexed pages still sell the pre-reposition sector wedge:** four
   `/vs/<competitor>` pages comparing Eliv8 OS to field-service CRMs (Jobber,
   Knowify, Housecall Pro, Buildertrend) and six `/for/<trade>` pages. Comparing
   yourself to four CRMs is a claim about what you are, and invites scoring on
   dispatching — which we deliberately do not do. `/about` meanwhile says the buyer
   is defined by conviction, not sector. ⭐ `/pricing`'s "what it replaces" section
   already frames the real alternatives, and they are not software: coach
   $500–2,000, bookkeeper $400–800, fractional CFO $500–1,500. Daniel's call —
   they are real SEO traffic, so do not delete them blind.

6. **`/tools/gbp` still exists as a route** but is surfaced nowhere — not in
   the sidebar, not in SolomonLauncher. All marketing claims about it were
   removed. It is legacy, not deleted. Decide whether it goes.

7. **Delete the old Anthropic API key** at
   https://console.anthropic.com/settings/keys. It was shipped to the browser
   pre-rewrite — assume it is leaked.

8. ~~Offer Builder + Hiring Planner as a partner add-on~~ — **DEAD (22 Aug).**
   This was gated behind "once the partner's job-management system exists", and
   that idea is gone. Both tools are simply part of the product; nothing to gate.
   The same decision is what killed `/crm`.

9. ✅ **Tool-use for Solomon — SHIPPED (24 Aug 2026).** See the section below.
   What is left of it: `team-newsletter` still can't be run (its prompt is
   built inline in `Newsletter.jsx` with the tone interpolated into the
   string, so there is no promptKey to point at — moving it to
   `_shared/prompts.ts` with tone as an input is what unblocks it), and
   `gbp-optimizer` is deliberately excluded while its fate is undecided.

10. ⚠️ **Netlify — over 75% of the monthly credit allowance as of 22 Aug**, after
   six deploys in one day. Personal plan, **1 concurrent build**, and Daniel
   intends to cancel — confirm it ends Sep 13 rather than immediately, or deploys
   stop. Batch changes rather than pushing one fix at a time.
   ⭐ When a deploy probe times out, check app.netlify.com → **Builds** before
   assuming latency: a build can FAIL, not merely be slow. And always `curl -L` —
   marketing routes 301 to their trailing-slash form, so a bare curl returns
   nothing and looks like a stalled deploy.

11. **Three built features are effectively unreachable.** The dashboard rewrite
   left `QuickActions`, `DashboardCalendar`, `TrajectorySection` and `KpiRow`
   rendered nowhere, and they carried the navigation. `/calendar` and `/analytics`
   now have ZERO live inbound links; `/board` — the whole work-order and staff
   portal system — is reachable only from a link inside a `/help` article. Where
   they belong in the nav is a design call.

12. **Sector language survives in core app copy**: Playbooks says "your crew" and
   "work order"; Board is "Work Board" with "Field flags". Fine for a trade, wrong
   for the other 45 industries onboarding now offers.

13. **Sentry is built but NOT live** (no DSN in any production chunk). ⚠️ The moment
   `VITE_SENTRY_DSN` is set, Sentry becomes a data processor and must be added to
   the vendor lists on `/privacy` and `/security` — both of which currently claim
   to be exhaustive ("that's the full list") and promise to notify on change.

14. **Back navigation** exists on only two tool pages (`BackToTools`, on Decision
   and Safety). The other nine still rely on a "Cancel" at the bottom of the form,
   which is below the fold and disappears entirely once a result renders.

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

⭐ **Current location (as of 22 Aug 2026):**
`~/.claude/projects/-Users-danielkalawarny/memory/`

⚠️ Memory is keyed to the worktree the session was opened in, so a session
started somewhere else gets a DIFFERENT directory and will not see this one.
That is why this file exists — CLAUDE.md travels with the repo and memory does
not. **When something important is decided, write it in both.**

The Eliv8 OS-relevant files there:

- `project_growthos.md` — project context + ⭐ **the refreshed open list**
- `project_growthos_audit_2026_08_22.md` — the 8/22 session in full: broken
  uploads, the all-45-route browser audit, the RAG chunker, /crm, the price
  decision, the Teams / CRM-integration / meetings calls, and the verification
  lessons
- `MEMORY.md` — the index loaded at session start
- `user_daniel.md`, `feedback_working_style.md` — how he works

⚠️ Most other files there are **kinwove**, his other product. Do not assume a
memory entry is about Eliv8 OS — see the note at the top of `project_growthos.md`
about the day "growth" was answered with a kinwove strategy.

An older directory exists at
`~/.claude/projects/-Users-danielkalawarny-Desktop-untitled-folder-2/memory/`
from when the repo lived elsewhere. Treat it as historical.
