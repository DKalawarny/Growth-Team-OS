# GrowthOS — Full App Overview

Use this document to give any AI assistant full context about what GrowthOS is, how it's built, and what it does — so you can ask integration or development questions without re-explaining from scratch.

---

## What is GrowthOS?

GrowthOS is a SaaS platform built for small service-business owners (tradespeople, contractors, agencies). It replaces the scattered collection of consultants, spreadsheets, and tools most owners use by putting an AI advisor, financial dashboards, hiring tools, marketing tools, compliance tracking, and a growth planner all in one connected platform.

**Pricing:** $97/month or $970/year (2 months free). 7-day free trial, no credit card required.  
**Target customer:** Owner-operators of service businesses — plumbers, HVAC, landscaping, cleaning, construction, agencies — typically $300k–$5M revenue, 1–20 employees.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v7, Tailwind CSS v4, Vite |
| Backend / Database | Supabase (Postgres + Auth + Edge Functions + Storage) |
| AI | Anthropic Claude (claude-sonnet + claude-haiku via Anthropic SDK) |
| Payments | Stripe (subscriptions + one-time payments) — *not yet live, setup pending* |
| Deployment | Vite build → static hosting (e.g. Netlify/Vercel) + Supabase Edge Functions |
| Search/RAG | Voyage AI embeddings (optional, for document search) |

---

## Architecture Overview

```
Browser (React SPA)
  │
  ├── Supabase Auth          (email/password + magic link)
  ├── Supabase Postgres      (all app data)
  ├── Supabase Storage       (file uploads — financials, proposals)
  │
  ├── Anthropic Claude API   (called directly from browser via VITE_ env vars)
  │   ├── runToolCall()      — structured JSON output for tool pages
  │   └── streamToolCall()   — streaming for Solomon advisor chat
  │
  └── Supabase Edge Functions (Deno/TypeScript)
      ├── stripe-checkout    — creates Stripe checkout session
      ├── stripe-webhook     — handles subscription + top-up events
      ├── stripe-topup       — one-time $5/$10 credit purchases
      └── gbp-fetch          — proxies Google Places API calls
```

**Note:** The Anthropic API key is currently browser-exposed via `VITE_ANTHROPIC_API_KEY`. This is a known security issue to fix before scaling to real customers — the fix is to move Claude calls into Supabase Edge Functions.

---

## Database Tables (Supabase / Postgres)

| Table | Purpose |
|-------|---------|
| `auth.users` | Supabase managed auth |
| `profiles` | One per user — name, role, company_id |
| `companies` | One per business — trial_ends_at, monthly_spend_cap |
| `business_profiles` | Onboarding data — industry, location, revenue stage, goals |
| `subscriptions` | Stripe subscription records |
| `documents` | AI-generated outputs — every tool saves here |
| `usage_events` | Per-call Claude usage tracking (tokens + cost) |
| `roadmap_milestones` | Growth roadmap entries |
| `check_ins` | Weekly reflection log |
| `work_items` | Kanban-style work board tasks |
| `knowledge_files` | Uploaded documents (linked to Supabase Storage) |

---

## Pages & Routes

### Public (no auth required)
| Route | Page |
|-------|------|
| `/` | Landing page |
| `/pricing` | Pricing page |
| `/login` | Login |
| `/signup` | Sign up (starts free trial) |

### App (auth required)
| Route | Page |
|-------|------|
| `/dashboard` | Main dashboard — KPIs, Solomon briefing, quick actions |
| `/advisor` | Solomon AI advisor chat |
| `/roadmap` | Growth roadmap milestones |
| `/checkins` | Weekly check-in log |
| `/board` | Work board (Kanban) |
| `/calendar` | Calendar view |
| `/documents` | Document library (all saved AI outputs + uploads) |
| `/analytics` | Usage analytics |
| `/settings` | Account, billing, integrations |
| `/tools` | Tools index grid |

### Tool Pages (auth + active subscription required)
| Route | Tool |
|-------|------|
| `/tools/cfo` | CFO Dashboard |
| `/tools/cash-flow` | Cash Flow Forecast |
| `/tools/gbp` | Local & AI Visibility Audit |
| `/tools/offer-builder` | Offer Builder |
| `/tools/hiring` | Hiring Planner |
| `/tools/org-chart` | Org Chart Planner |
| `/tools/newsletter` | Team Newsletter |
| `/tools/safety` | Safety & Compliance |
| `/tools/exit-readiness` | Exit Readiness Report |
| `/tools/rocks` | Rocks Tracker (quarterly priorities) |

---

## The Tools — What Each One Does

### Solomon (AI Advisor) — `/advisor`
The core of the platform. A persistent AI advisor powered by Claude that:
- Reads the owner's business profile, roadmap, recent check-ins, and financial data every session
- Opens each morning with a briefing on what needs attention
- Answers strategy, hiring, pricing, operations, and financial questions
- Remembers context across conversations (via stored business profile + check-ins)
- Streaming chat interface

### CFO Dashboard — `/tools/cfo`
- Connects to QuickBooks Online via Intuit OAuth
- Pulls live financial data and generates monthly KPI commentary
- Plain-English analysis — revenue trends, margin, expenses, cash position
- No accountant required to understand it

### Cash Flow Forecast — `/tools/cash-flow`
- 13-week forward-looking cash runway projection
- Inputs: current balance, expected income, fixed expenses, variable expenses
- Flags weeks where cash goes negative before they arrive

### Local & AI Visibility — `/tools/gbp`
- Auto-fetches the business's Google Business Profile via Google Places API
- Runs a full audit: profile completeness, reviews, content, website SEO, citations, backlinks, schema
- **New:** AI search readiness score — how likely the business is to appear when customers ask ChatGPT/Perplexity/Google AI "best [trade] in [city]"
- Generates ready-to-use copy: GBP description rewrites, title tags, meta descriptions, review ask templates
- Post ideas, photo shot list, keyword recommendations

### Offer Builder — `/tools/offer-builder`
- Owner describes a service they sell (or want to sell)
- Claude produces: clear scope (what's in/out), tiered pricing with rationale, objection handlers ("They say / You say" format)
- Designed for tradespeople and service businesses who habitually underprice

### Hiring Planner — `/tools/hiring`
- Input: role they need to hire
- Output: job scorecard, interview questions, red flags to watch for, 30-day onboarding plan

### Org Chart Planner — `/tools/org-chart`
- Maps the team structure the business needs in 12 months
- Identifies hiring priorities and reporting lines

### Team Newsletter — `/tools/newsletter`
- Generates a monthly internal newsletter for the owner's team
- Covers what was built, where the business is heading, key wins

### Safety & Compliance — `/tools/safety`
- Tracks licences, WCB registrations, certifications, compliance documents
- Flags upcoming renewals

### Exit Readiness — `/tools/exit-readiness`
- Scores the business across 8 dimensions a buyer cares about
- Identifies gaps to fix before a sale
- Hidden from the main nav (accessible via direct link)

### Rocks Tracker — `/tools/rocks`
- EOS-style quarterly priority (Rocks) planning
- Company rocks + individual rocks + weekly milestones

---

## AI / Claude Integration

Every tool page follows the same pattern:

1. **Form** — owner answers 4–8 questions about their specific situation
2. **Context build** — `buildAdvisorContext()` pulls their business profile, roadmap, recent check-ins, and any uploaded documents
3. **Claude call** — system prompt (tool-specific) + business context + owner's answers → structured JSON response
4. **Result card** — JSON rendered into a clean UI with copy buttons, tabs, and action items
5. **Refine chat** — owner can iterate with natural language; Claude updates the output in place
6. **Save** — final output saved to `documents` table

**Spend cap:** Each company has a `monthly_spend_cap` (default $10/month). Every Claude call checks and tracks spend. If the cap is hit, a banner appears offering $5 or $10 top-up credits via Stripe one-time payment.

**Tool call cap:** Separate per-tool rate limit (10 runs/tool/month by default) to prevent abuse.

---

## Authentication & Multi-tenancy

- Supabase Auth (email + password)
- Every user belongs to one `company`
- All data is scoped by `company_id` — users within the same company share roadmap, documents, check-ins
- Trial period: 7 days from signup (`companies.trial_ends_at`)
- After trial: subscription required to access tool routes (paywall component swaps in)
- Subscription status derived from `subscriptions` table + `trial_ends_at`

---

## Billing (Stripe — setup pending)

- **Monthly plan:** $97/month (`owner` plan)
- **Annual plan:** $970/year (`owner_annual` plan) — equivalent to 2 months free
- **Top-up credits:** $5 or $10 one-time payments to increase monthly spend cap
- Stripe Customer Portal for managing payment method, viewing invoices, cancelling
- Webhook handles: subscription creation/update/cancellation, payment failure, top-up completion

---

## Onboarding Flow

1. Signup → creates `auth.user` + `profile` + `company`
2. 7-question onboarding form: business name, industry, location, revenue stage, team size, top goals, biggest challenge
3. Stored in `business_profiles` — this becomes the context Solomon and every tool reads
4. Optional: QuickBooks connection, document uploads
5. Lands on dashboard with Solomon morning briefing

---

## Integration Points for an Existing Website

If you want to connect GrowthOS to an existing website, here are the natural touchpoints:

### 1. Sign-up / Login links
The simplest integration — add CTA buttons on your existing site that link to:
- `https://your-growthos-domain.com/signup` — start free trial
- `https://your-growthos-domain.com/login` — existing users
- `https://your-growthos-domain.com/pricing` — pricing page

### 2. Embedded iframe (limited)
GrowthOS is a React SPA that requires auth. Individual tool results can't easily be embedded without extracting them as standalone components. The most practical embed is a sign-up CTA iframe or a hosted widget.

### 3. Shared Supabase backend
If your existing site has its own backend, you can query the same Supabase project using the service role key to read/write data — e.g. pull a user's roadmap milestones to display on your site, or pre-populate their business profile from your site's CRM data.

### 4. SSO / shared auth
If your existing site uses Supabase Auth, users could share a session. If it uses a different auth provider, you'd need to implement a token exchange or use Supabase's third-party auth providers.

### 5. API / webhooks from Supabase
Supabase supports database webhooks — you could trigger events on your existing site when a user completes an onboarding, generates a report, or hits a roadmap milestone.

---

## What's Not Built Yet

| Item | Notes |
|------|-------|
| Stripe live setup | Account, products, webhook, secrets all need to be created |
| Claude calls server-side | API key is browser-exposed — should move to Edge Functions before scaling |
| QuickBooks production | Currently sandbox only; requires Intuit app review for real books |
| Mobile app | Web-only, mobile-responsive but not a native app |
| Team/multi-user | Data is shared per company but no role-based permissions yet |
| White-label / Agency | Infrastructure exists for multi-workspace but not complete |

---

*Built with React, Supabase, Anthropic Claude, and Tailwind CSS.*
