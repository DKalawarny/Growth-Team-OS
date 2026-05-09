-- ============================================================================
-- QuickBooks Online integration — v0 non-invasive shape.
--
-- Design goal: let the CFO Dashboard (and every other tool that reads
-- BUSINESS_CONTEXT) see live financial data from the owner's books without
-- changing any existing table, prompt, or component. QBO reports get
-- materialised as rows in `financial_snapshots`, then `buildAdvisorContext`
-- fans them into the existing knowledge_files stream as synthetic entries.
--
-- Three tables:
--   1. integrations         — per-company connection metadata (readable by members)
--   2. integration_secrets  — access/refresh tokens (service_role ONLY)
--   3. financial_snapshots  — materialised reports (readable by members)
--
-- Why secrets live in their own table: Postgres RLS can't hide individual
-- columns. If tokens lived on `integrations`, any client SELECT would expose
-- them to anyone with a session for that company. Splitting them into a table
-- with NO policies means the only way to read them is with the service_role
-- key — which is available to Edge Functions and nothing else.
--
-- Why user-triggered sync (not background cron): matches "non-invasive" —
-- the owner clicks Sync, we hit Intuit once, cache the result. No scheduler
-- infra to deploy, no surprise API burn, no stale-data-but-thinks-it's-fresh
-- footgun. Sync latency (2–5s) is acceptable because it only runs when the
-- owner is actively on the dashboard.
-- ============================================================================

-- ---------------- integrations ----------------
-- Per-company row for each connected provider. Metadata only — tokens next.
create table public.integrations (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  provider        text not null check (provider in ('quickbooks','xero')),

  -- Provider identifiers. `realm_id` is QBO's company ID — required on every
  -- API call. Xero has a similar tenant_id concept; we reuse the column.
  realm_id        text,

  -- Lifecycle. 'connected' = tokens valid or refreshable; 'expired' = refresh
  -- token dead, owner must reconnect; 'disconnected' = owner explicitly
  -- revoked. We keep expired/disconnected rows around so audit trails survive.
  status          text not null default 'connected'
    check (status in ('connected','expired','disconnected')),

  connected_at    timestamptz not null default now(),
  last_synced_at  timestamptz,
  last_sync_error text,

  -- One active connection per provider per company. If the owner reconnects
  -- after disconnecting, we UPSERT — no proliferation of rows.
  unique (company_id, provider)
);

create index integrations_company_idx
  on public.integrations(company_id);

comment on table public.integrations is
  'Per-company connection metadata for third-party providers (QBO, Xero). Tokens live in integration_secrets.';

alter table public.integrations enable row level security;

-- Members of the company can read the metadata (to render connect status).
create policy "integrations_read"
  on public.integrations for select
  using (company_id = public.current_company_id());

-- Writes happen from Edge Functions using the service_role key, which bypasses
-- RLS. We intentionally do NOT grant insert/update/delete to authenticated
-- users — token exchange and status transitions are server-owned.


-- ---------------- integration_secrets ----------------
-- Tokens. Split from `integrations` because RLS is row-level, not
-- column-level — if these lived on the parent table, a buggy client-side
-- SELECT could exfiltrate them. Here, no policy means no access for anyone
-- except service_role.
create table public.integration_secrets (
  integration_id  uuid primary key references public.integrations(id) on delete cascade,

  -- Raw tokens. Not encrypted at rest in v0 — the service_role-only barrier
  -- is the security boundary. Upgrade path: wrap with pgcrypto (pgp_sym_*)
  -- once we have a production KMS story.
  access_token    text not null,
  refresh_token   text not null,

  -- Access tokens expire (~1h for QBO); refresh tokens rotate on every use
  -- and expire after ~100 days of inactivity. We track access_token expiry
  -- so qbo-sync can decide whether to refresh before the Intuit call.
  expires_at      timestamptz not null,

  updated_at      timestamptz not null default now()
);

comment on table public.integration_secrets is
  'OAuth tokens. Accessible only via service_role — RLS enabled with no policies.';

alter table public.integration_secrets enable row level security;
-- Intentionally no policies. service_role bypasses RLS and is the only caller.


-- ---------------- financial_snapshots ----------------
-- Materialised reports. Each row is one report (P&L, BS, CF) for one period.
-- The Edge Function writes these; the app reads them via `buildAdvisorContext`.
create table public.financial_snapshots (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,

  -- 'quickbooks' | 'xero' | 'manual' — 'manual' is reserved for a future
  -- "paste your numbers in" UI so we have a unified read path.
  source          text not null
    check (source in ('quickbooks','xero','manual')),

  -- Which Intuit report this came from. Kept as a controlled enum — each
  -- report has a different shape downstream.
  report_type     text not null
    check (report_type in ('profit_and_loss','balance_sheet','cash_flow')),

  -- Human-readable period tag mirroring what the tool will display.
  -- Example: "March 2026", "Q1 2026", "Jan 1 – Mar 31 2026".
  period_label    text not null,

  -- Machine-usable period bounds. Used for "most recent snapshot for period
  -- that ends ≤ today" queries.
  period_start    date,
  period_end      date,

  -- The full Intuit response (or a normalised subset). We keep the raw shape
  -- so downstream consumers can extract any field without a schema change.
  raw_json        jsonb not null,

  -- Pre-rendered summary text — the form Claude actually reads. Generated by
  -- the Edge Function at sync time so the browser never has to normalise.
  -- Format: line-per-metric plain text, ~1–2KB.
  normalized_text text,

  synced_at       timestamptz not null default now()
);

-- "Latest snapshot for this company" and "most recent P&L" are the two hot
-- reads. One compound index covers both cleanly.
create index financial_snapshots_company_type_period_idx
  on public.financial_snapshots(company_id, report_type, period_end desc nulls last, synced_at desc);

comment on table public.financial_snapshots is
  'Materialised financial reports pulled from integrations. Feeds buildAdvisorContext.';

alter table public.financial_snapshots enable row level security;

create policy "financial_snapshots_read"
  on public.financial_snapshots for select
  using (company_id = public.current_company_id());

-- Writes are service_role only — the Edge Function materialises these rows.
-- We deliberately don't grant insert to authenticated clients to prevent
-- "synthetic" snapshots being forged to manipulate the advisor.
