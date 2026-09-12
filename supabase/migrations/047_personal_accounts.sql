-- ============================================================================
-- Personal accounts — the company row that is not a company (migration 047)
--
-- `profiles.company_id` is NOT NULL, so every authenticated user in this schema
-- has a company whether or not they own one. That is what lets the `claude`
-- edge function serve "the way out" unchanged: its spend cap, per-tool cap and
-- usage_events write are all company-scoped.
--
-- 🔴 BUT AN UNMARKED PLACEHOLDER IS A LIE THE REST OF THE SYSTEM BELIEVES.
-- Left as an ordinary company it would:
--   1. be counted as a customer everywhere companies are counted — the admin
--      review lists every company by name, so a few hundred way-out users would
--      read as a few hundred businesses, and every ratio computed off that
--      number would be wrong in the flattering direction;
--   2. send its owner into BUSINESS ONBOARDING. `onboarded` is derived from a
--      business_profiles row, a way-out user has none, and RequireAuth turns
--      that into a redirect to /onboarding. Someone who came here because they
--      feel stuck in their life would be asked their annual revenue and team
--      size, by a product they have never heard of.
--
-- So the row says what it is.
-- ============================================================================

alter table public.companies
  add column if not exists is_personal boolean not null default false;

comment on column public.companies.is_personal is
  'True for the placeholder company behind a personal-product account (the way out). '
  'It is a billing and rate-limiting container, never a customer: exclude it from '
  'every company count, and never route its owner into business onboarding.';

-- Partial index because the interesting query is always "the real companies" —
-- the placeholders are expected to outnumber them.
create index if not exists companies_is_personal_idx
  on public.companies(is_personal) where is_personal = true;

-- ----------------------------------------------------------------------------
-- Provision a personal account.
--
-- ⚠️ A SEPARATE FUNCTION RATHER THAN A FLAG ON bootstrap_company(). That one is
-- called by business onboarding with the real company name, and adding an
-- argument to a SECURITY DEFINER function every existing user depends on, to
-- serve a second product, is how the first product breaks. This one wraps it.
--
-- Idempotent in the same way: bootstrap_company returns the existing company_id
-- if the caller already has a profile, and the update below is guarded so an
-- Eliv8 OS owner who wanders into the way-out intake NEVER has their real
-- company relabelled as personal.
-- ----------------------------------------------------------------------------
create or replace function public.bootstrap_personal_account(p_full_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_company_id uuid;
  v_existed    boolean;
begin
  select company_id into v_company_id
    from public.profiles where id = auth.uid();
  v_existed := v_company_id is not null;

  if not v_existed then
    -- 'Personal' rather than an invented business name. This person does not
    -- own a business, the row is never shown to them, and putting "Jake's
    -- Company" in a product about not having one would be its own small lie.
    v_company_id := public.bootstrap_company('Personal', p_full_name);
  end if;

  -- 🔴 ONLY flag a company we just created, and only one with no business
  -- profile behind it. Without both guards, an existing Eliv8 OS customer who
  -- opens the way-out intake would have their real company marked personal and
  -- quietly dropped out of the customer counts.
  if not v_existed then
    update public.companies
       set is_personal = true
     where id = v_company_id
       and not exists (
         select 1 from public.business_profiles bp where bp.company_id = v_company_id
       );
  end if;

  return v_company_id;
end;
$$;

revoke all on function public.bootstrap_personal_account(text) from public;
grant execute on function public.bootstrap_personal_account(text) to authenticated;
