# Edge Functions — setup runbooks

Two integrations have their own setup stories:

- **[QuickBooks integration](#quickbooks-integration--setup-runbook)** —
  `qbo-oauth-start`, `qbo-oauth-callback`, `qbo-sync`. Powers the CFO
  Dashboard and Cash-Flow tools with real P&L / Balance Sheet numbers.
- **[Google Business Profile auto-fetch](#google-business-profile-auto-fetch--setup-runbook)** —
  `gbp-fetch`. Powers the GBP Optimizer tool — resolves the owner's business
  name into a Google Places snapshot so they don't paste every field.

---

# QuickBooks integration — setup runbook

Everything needed to stand up the `qbo-*` Edge Functions end-to-end.

All code is shipped. What's left is the stuff that can't live in a repo:
1. Create an Intuit Developer app
2. Set env vars on the Supabase project
3. Run the migration
4. Deploy the Edge Functions
5. Test the OAuth flow against Intuit's sandbox

Estimated time the first time: ~30 minutes. Subsequent deploys: ~2 minutes.

---

## 1. Intuit Developer app

1. Sign in at https://developer.intuit.com/app/developer/dashboard
2. **Create an app** → "QuickBooks Online and Payments" → **Accounting** scope
3. In the app's **Keys & credentials** tab, flip to the **Development** environment
   (also called "Sandbox") and grab:
   - **Client ID**
   - **Client Secret**
4. Under **Redirect URIs**, add your Supabase callback URL:
   ```
   https://<your-project-ref>.supabase.co/functions/v1/qbo-oauth-callback
   ```
   Replace `<your-project-ref>` with your Supabase project ref (it's in the
   Supabase dashboard URL). Save.
5. Create a **sandbox company** (Intuit gives you one free):
   - Top right → sandbox → "Add a sandbox company"
   - You'll log into this company when you test the OAuth flow

Moving to production QuickBooks accounts requires Intuit app review — usually
2–3 weeks. Until then everything below uses the sandbox credentials.

---

## 2. Supabase env vars (project secrets)

From the Supabase dashboard → **Edge Functions** → **Secrets**, add:

| Key                       | Value                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| `QBO_CLIENT_ID`           | From Intuit app → Keys & credentials                                  |
| `QBO_CLIENT_SECRET`       | From Intuit app → Keys & credentials                                  |
| `QBO_REDIRECT_URI`        | `https://<project-ref>.supabase.co/functions/v1/qbo-oauth-callback`   |
| `QBO_ENVIRONMENT`         | `sandbox` (switch to `production` after Intuit review)                |
| `QBO_OAUTH_STATE_SECRET`  | Any random 32+ char string. Generate with `openssl rand -hex 32`      |
| `APP_URL`                 | Your app origin. Dev: `http://localhost:5173`. Prod: your domain.     |

The Supabase client URL (`SUPABASE_URL`) and service-role key
(`SUPABASE_SERVICE_ROLE_KEY`) are auto-available to Edge Functions — no need
to set those.

---

## 3. Run the migration

```bash
# Local dev
supabase db push

# Or apply to a specific remote
supabase db push --linked
```

Expected output mentions `008_quickbooks_integration.sql` applying cleanly.

Verify:
```sql
-- In the Supabase SQL editor
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('integrations', 'integration_secrets', 'financial_snapshots');
-- Should return all three.
```

---

## 4. Deploy the Edge Functions

```bash
supabase functions deploy qbo-oauth-start
supabase functions deploy qbo-oauth-callback --no-verify-jwt
supabase functions deploy qbo-sync
```

**Important:** `qbo-oauth-callback` gets `--no-verify-jwt` because Intuit
redirects to it publicly (no user JWT). The function does its own auth via
the signed state token. The other two require a valid Supabase JWT.

Verify deployment:
```bash
supabase functions list
```

---

## 5. Test the flow (sandbox)

1. Start the app locally: `npm run dev`
2. Sign in as a user with `owner` / `admin` / `cfo` role
3. Go to `/settings/integrations`
4. Click **Connect QuickBooks**
5. You'll bounce to Intuit → sign in with a **sandbox** account
   (create at https://developer.intuit.com/app/developer/sandbox)
6. Choose your sandbox company → **Connect**
7. Intuit redirects back to `/settings/integrations?qbo=connected`
8. Click **Sync now** — should complete in 2–5s
9. Check the **Integrations** card — it should list 2 snapshot chips
   (P&L, BS) with the period label
10. Go to `/tools/cfo`, type a period, generate a dashboard
11. The result should cite real numbers from your sandbox company

### Troubleshooting

| Symptom                                    | Likely cause                                                     |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `?qbo=error&reason=missing_params`         | Intuit didn't send `realmId` — redirect URI misconfigured         |
| `?qbo=error&reason=state%3A+signature...`  | `QBO_OAUTH_STATE_SECRET` differs between start/callback functions |
| `qbo token exchange failed: 401`           | `QBO_CLIENT_ID` or `QBO_CLIENT_SECRET` wrong                      |
| `qbo ProfitAndLoss fetch failed: 403`      | Access token expired and refresh failed — reconnect               |
| Sync works but CFO dashboard still says estimate | Snapshots saved but `buildAdvisorContext` didn't pick them up — check `financial_snapshots` row has `normalized_text` set |

Check Edge Function logs:
```bash
supabase functions logs qbo-sync --limit 50
```

---

## What each function does

| Function              | Trigger                     | Auth                | Does                                                |
| --------------------- | --------------------------- | ------------------- | --------------------------------------------------- |
| `qbo-oauth-start`     | Browser (Settings button)   | Supabase JWT        | Mints signed state → returns Intuit authorize URL   |
| `qbo-oauth-callback`  | Intuit redirect (public)    | Signed state token  | Exchanges code → saves tokens to `integration_secrets` |
| `qbo-sync`            | Browser (Sync now button)   | Supabase JWT        | Refreshes token if needed → pulls P&L + BS → saves snapshots |

---

## Security notes

- **Tokens never reach the browser.** They live in `public.integration_secrets`,
  which has RLS enabled but no policies — only the service-role key can read
  or write. Edge Functions are the only callers.
- **OAuth state is HMAC-signed** with `QBO_OAUTH_STATE_SECRET` (10 min TTL).
  Without the secret an attacker can't forge a callback.
- **Refresh tokens rotate** on every use; `qbo-sync` saves the new one
  atomically or flips `integrations.status = 'expired'` on failure.
- **Role gate** is enforced both at the route (`RequireRole` in App.jsx) and
  in the Edge Functions (`owner` / `admin` / `cfo` only).

## Known v0 limitations (promoted to v1 backlog)

- Tokens in plaintext at rest. Upgrade: wrap with `pgcrypto` + a KMS key.
- No background refresh — sync is always user-triggered. Upgrade: scheduled
  sync via `pg_cron` calling the edge function on a schedule.
- No Xero / Wave / FreshBooks. Table schema is ready (`provider` enum) —
  clone `qbo-sync` per provider.
- Single period per sync call. Multi-period ("sync last 12 months") would
  change the normaliser contract — worth doing later for trend analysis.

---

# Google Business Profile auto-fetch — setup runbook

Powers the GBP Optimizer tool. When the owner clicks **Find my listing**, the
browser calls the `gbp-fetch` Edge Function, which hits the Google Places API
(New) to resolve their business name into a structured snapshot (categories,
hours, reviews, photos, website, phone). That snapshot becomes the input to
the audit — the owner only fills in the 3 fields Places doesn't expose
(recent posts, photo count on GBP, services listed).

Estimated time first setup: ~15 minutes. Subsequent deploys: ~1 minute.

## 1. Google Cloud project + Places API key

1. Sign in at https://console.cloud.google.com/
2. Create (or select) a project dedicated to this — billing must be enabled
   because Places is a paid API. Free tier covers ~10k searches/month which
   is plenty for v0.
3. **APIs & Services → Library** → enable **Places API (New)**
   (NOT the legacy "Places API" — we use the v1 endpoints, field masks,
   and Enterprise SKU pricing. The legacy API is being phased out.)
4. **APIs & Services → Credentials → Create credentials → API key**
5. Copy the key. Then **Restrict key**:
   - **Application restrictions:** None (called from the Edge Function,
     which has no stable IP. If you're paranoid, restrict by IP once you
     have the Supabase Functions IP range.)
   - **API restrictions:** restrict to **Places API (New)** only.
6. Save.

**Cost sanity check** (as of April 2026 — verify in Google Cloud Pricing):

| Call                            | SKU         | Approx cost |
| ------------------------------- | ----------- | ----------- |
| `places:searchText` (essentials)| Essentials  | $0.005      |
| `places/{id}` with full mask    | Enterprise  | $0.020      |
| Location bias geocode (optional)| Enterprise  | $0.017      |

Per audit: ~$0.04 (no location bias) or ~$0.06 (with bias). Cheap enough
that we don't cache in v0 — add a `gbp_snapshots` table if audits get
frequent.

---

## 2. Supabase env vars

From the Supabase dashboard → **Edge Functions → Secrets**, add:

| Key                     | Value                                          |
| ----------------------- | ---------------------------------------------- |
| `GOOGLE_PLACES_API_KEY` | From Google Cloud → Credentials → API key      |

The existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already
available to Edge Functions — the function uses them to look up the
owner's location from `business_profiles` for location biasing.

---

## 3. Deploy the function

```bash
supabase functions deploy gbp-fetch
```

No `--no-verify-jwt`: the function requires a signed-in user. There's no
public redirect flow like the QBO callback.

Verify:
```bash
supabase functions list
```
Should include `gbp-fetch` in the list.

---

## 4. Test the flow

1. `npm run dev`
2. Sign in (any role — GBP audits aren't role-gated; owners, managers,
   marketers all need access)
3. Go to `/tools/gbp`
4. Type your business name in **Find my listing** (add city if common name)
5. Click **Find listing**
6. If Places matches: a green "is this your listing?" card should appear
   with the category, star rating, hours, website, phone.
7. Fill in the 3 extras (recent posts, total photos, services) + targets
8. Generate the audit

### Troubleshooting

| Symptom                                               | Likely cause                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| "We couldn't find that business on Google"            | Common name + no `business_profiles.location` — add a location in onboarding, or search with more disambiguator (city/suburb) |
| `places: GOOGLE_PLACES_API_KEY not set`               | Env var missing on the Supabase project — add under Edge Functions → Secrets |
| `places searchText failed (403)`                      | Key exists but Places API (New) not enabled, or API restrictions exclude it  |
| `places searchText failed (429)`                      | Hit daily quota — raise in Google Cloud or wait for quota reset              |
| Correct listing but wrong city                        | Location bias failed — probably a typo in `business_profiles.location`       |

Check function logs:
```bash
supabase functions logs gbp-fetch --limit 50
```

---

## What `gbp-fetch` does

| Stage | Call                                                        | Cost        |
| ----- | ----------------------------------------------------------- | ----------- |
| 1     | (Optional) Geocode owner's saved location via Places search | ~$0.005 + ~$0.017 details |
| 2     | Text search for the owner's business name (+ bias)          | ~$0.005      |
| 3     | Place details with full audit mask                          | ~$0.020      |

Stage 1 is skipped when `business_profiles.location` is empty. Stages 2+3
run every audit — no caching in v0.

---

## Security notes

- **API key never reaches the browser.** Only the Edge Function reads
  `GOOGLE_PLACES_API_KEY`. The browser talks to Supabase, Supabase talks
  to Google.
- **Auth-gated.** `gbp-fetch` requires a valid Supabase JWT. Anonymous
  callers get 401.
- **No raw Places shape leaked.** The function returns the stable
  `GBPSnapshot` type defined in `_shared/places.ts`. If we swap providers
  (Apple Business, Bing Places) the browser contract doesn't change.

## Known v0 limitations

- No caching. Each audit re-fetches. If audits become hourly (unlikely for
  SMB owners), add a `gbp_snapshots` table keyed on `company_id` + TTL.
- No multi-location businesses. Owners with 3 storefronts have to run
  the audit 3 times with different queries. Upgrade: let them pick from a
  list of matches rather than just the top hit.
- No location pulled from address components — we only surface
  `formatted_address`. Could enrich by splitting into city/postcode if the
  audit prompt needs it.
- Places editorial summary isn't always present for smaller businesses —
  the prompt handles the null case, but the owner may see thinner context.
