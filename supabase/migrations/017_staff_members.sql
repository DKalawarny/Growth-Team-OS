-- ============================================================================
-- GrowthOS — staff_members (migration 017)
--
-- Roster of a company's staff so they can be assigned tasks on the Work Board
-- and emailed when work changes hands. TeamSection.jsx is the only UI today.
--
-- RLS: any profile attached to the company can manage staff. This mirrors the
-- spec for the Work Board (assignment is a team-wide action, not owner-only).
-- ============================================================================

create table public.staff_members (
  id          uuid        primary key default gen_random_uuid(),
  company_id  uuid        not null references public.companies(id) on delete cascade,
  name        text        not null,
  email       text,
  role        text,
  created_at  timestamptz not null default now()
);

create index staff_members_company_id_idx on public.staff_members(company_id);

alter table public.staff_members enable row level security;

create policy "Company members can manage staff"
  on public.staff_members for all
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
