-- ============================================================================
-- GrowthOS — work_orders table (migration 024)
--
-- This table was previously created by a copy-paste SQL snippet shown in
-- the Board page's "Setup needed" screen. That meant:
--
--   1. Every new tenant had to manually run SQL before /board worked.
--   2. Migrations 020 (work_order_checklists) and 021 (work_order_step_
--      comments) referenced `work_orders` via foreign keys but the
--      table didn't exist in any migration — they could only apply
--      successfully on a DB where the setup-screen SQL had already
--      been run. Fresh DBs would fail at migration 020.
--
-- This migration formalises the schema and adds it to the migration
-- chain. `if not exists` clauses make it idempotent for environments
-- where the setup-screen SQL was already run.
--
-- The Board page's setup-screen fallback is left in place as graceful
-- degradation — if someone DROPs the table by hand, the page still
-- offers a recovery path.
-- ============================================================================

-- ---- Table ----
create table if not exists public.work_orders (
  id              uuid        primary key default gen_random_uuid(),
  company_id      uuid        not null references public.companies(id) on delete cascade,
  created_by      uuid        references public.profiles(id),
  assigned_to     uuid        references public.profiles(id),
  staff_member_id uuid        references public.staff_members(id) on delete set null,
  milestone_id    uuid        references public.milestones(id)     on delete set null,
  title           text        not null,
  description     text,
  status          text        not null default 'backlog',
  priority        text        not null default 'medium',
  due_date        date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes for the common access patterns on the Board page:
--   - "show me this company's work orders" (loadAll)
--   - "show me the WO for this milestone" (roadmap → board jump)
create index if not exists work_orders_company_idx     on public.work_orders (company_id);
create index if not exists work_orders_milestone_idx   on public.work_orders (milestone_id);
create index if not exists work_orders_assigned_idx    on public.work_orders (assigned_to);
create index if not exists work_orders_staff_idx       on public.work_orders (staff_member_id);

-- ---- RLS ----
-- Single FOR ALL policy that scopes every command (SELECT/INSERT/UPDATE/DELETE)
-- to the caller's company_id. Matches the pattern used by staff_members (017).
-- The staff portal Edge Function uses the service-role key, which bypasses
-- these policies — see Board.jsx's setup screen comment for the original
-- design statement.

alter table public.work_orders enable row level security;

-- Drop-and-recreate so re-applying this migration on an environment that
-- already has the setup-screen policy doesn't conflict on policy name.
drop policy if exists "Company members can manage work orders" on public.work_orders;

create policy "Company members can manage work orders"
  on public.work_orders
  for all
  using (
    company_id = (
      select company_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    company_id = (
      select company_id from public.profiles where id = auth.uid()
    )
  );
