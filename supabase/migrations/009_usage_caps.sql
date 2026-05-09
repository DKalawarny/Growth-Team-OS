-- ============================================================================
-- Usage tracking + per-tool monthly caps
--
-- Two-part shape:
--
--   1. usage_events — one row per billable external API call. Source of truth
--      for cost accounting, cap enforcement, and the Settings usage dashboard.
--      Each row is small (<200 bytes) and append-only. Indexed for the only
--      query that matters: "how many Claude calls has this company made for
--      this tool so far this calendar month?"
--
--   2. companies.monthly_tool_cap — hard cap on Claude calls per tool per
--      calendar month. Default 10. Admins can raise per-tenant via SQL.
--
-- Why per-tool (not a single global cap per company): if we had one cap of
-- 50/month, a client could burn it all on Hiring Planner runs and be locked
-- out of Cash Flow mid-quarter. Per-tool means every tool always has some
-- budget left — "10 of each per month" is the spec.
--
-- Why count Claude calls (generate + refine) as the capped unit: both cost
-- real money (~$0.02–0.08 each), the Places lookup is bundled with the GBP
-- generate so capping Claude implicitly caps Places, and counting events is
-- simpler than tracking dollar spend per tenant (which needs model + price
-- table to stay in sync). We still log cost_usd for the dashboard.
--
-- What's NOT capped:
--   - Refines (see decision above — they ARE counted; cheap, but still paid)
--   - Places API raw lookups outside the GBP flow (none exist right now)
--   - Background jobs (none exist right now)
-- ============================================================================

-- ---------------- Per-company cap config ----------------
-- Single uniform cap for simplicity. If different tools need different caps
-- later (e.g. 20 for CFO, 5 for Exit), extend to a `monthly_tool_caps` jsonb
-- column or a separate `company_tool_caps` table.

alter table public.companies
  add column if not exists monthly_tool_cap int not null default 10;

comment on column public.companies.monthly_tool_cap is
  'Max Claude calls (generate + refine) per tool per calendar month. Default 10. Raise per-tenant via UPDATE.';

-- ---------------- usage_events ----------------
create table if not exists public.usage_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,

  -- What was called. tool_id matches src/lib/tools.js keys:
  --   'hiring-scorecard' | 'exit-readiness' | 'offer-builder' | 'org-chart'
  --   'cash-flow' | 'cfo-dashboard' | 'rocks-tracker' | 'gbp-optimizer'
  -- Nullable because some events (e.g. Places geocoding for location bias)
  -- aren't attributable to a user-facing tool run.
  tool_id     text,

  -- Which paid API provider. Currently 'anthropic' or 'google_places'.
  provider    text not null check (provider in ('anthropic', 'google_places')),

  -- What kind of call. Free-form but we use:
  --   'generate'        — Claude tool generation (capped)
  --   'refine'          — Claude refine turn (capped)
  --   'places_search'   — Places textSearch call (not capped, logged for $)
  --   'places_details'  — Places details call (not capped, logged for $)
  kind        text not null,

  -- Token usage (Claude) or call units (Places). For Places rows, units=1.
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  units       int not null default 1,

  -- Cost in USD, computed at insert time from pricing constants in lib/usage.
  -- Stored so the dashboard doesn't have to re-derive from tokens with a
  -- possibly-outdated pricing table.
  cost_usd    numeric(10,5) not null default 0,

  created_at  timestamptz not null default now()
);

-- The ONE index that matters: "count Claude generate+refine calls for a
-- given company + tool for the current month". Partial index keeps it tight.
create index if not exists usage_events_company_tool_month_idx
  on public.usage_events (company_id, tool_id, created_at desc)
  where provider = 'anthropic';

-- Secondary index for the Settings dashboard: aggregate by company.
create index if not exists usage_events_company_time_idx
  on public.usage_events (company_id, created_at desc);

comment on table public.usage_events is
  'Per-call log for every paid external API call. Drives cap enforcement and the Settings usage dashboard.';

-- ---------------- RLS ----------------
alter table public.usage_events enable row level security;

-- Members can read their company's usage (for the dashboard).
create policy "usage_events: company members can read"
  on public.usage_events
  for select
  using (
    company_id in (
      select company_id from public.profiles where id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies — writes only via service_role (the
-- browser-side tool code uses the anon client's user JWT for the cap-check
-- read, but inserts go through a supabase.from() call using the same
-- authenticated client. To allow authenticated inserts we add a tight INSERT
-- policy below that only lets a user log usage tied to their own company.)

create policy "usage_events: users can log for own company"
  on public.usage_events
  for insert
  with check (
    company_id in (
      select company_id from public.profiles where id = auth.uid()
    )
  );
