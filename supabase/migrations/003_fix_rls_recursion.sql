-- ============================================================================
-- Fix RLS recursion.
--
-- The policies in 002 referenced `public.profiles` from inside a policy on
-- `public.profiles` (and from every other table's policy). Each subquery
-- re-evaluates the source policy → "infinite recursion detected in policy
-- for relation profiles".
--
-- Fix: read `profiles` through SECURITY DEFINER helper functions that run
-- with the function owner's privileges and therefore bypass RLS. Every
-- policy then tests against a scalar result, no recursion.
--
-- This migration is idempotent — drop-if-exists before create, so it can be
-- re-run safely if anything is only partially applied.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (RLS-bypassing; owned by postgres implicitly)
-- ----------------------------------------------------------------------------
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Let any authenticated user call the helpers (anon sees NULL — safe).
revoke all on function public.current_company_id()  from public;
revoke all on function public.current_user_role()   from public;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_user_role()  to authenticated;

-- ----------------------------------------------------------------------------
-- Drop the broken policies from 002
-- ----------------------------------------------------------------------------
drop policy if exists "Members see own company"                  on public.companies;
drop policy if exists "Owners update own company"                on public.companies;

drop policy if exists "See profiles in same company"             on public.profiles;
drop policy if exists "Update own profile"                       on public.profiles;

drop policy if exists "Own company — read"                       on public.business_profiles;
drop policy if exists "Own company — write"                      on public.business_profiles;

drop policy if exists "Own company — read"                       on public.milestones;
drop policy if exists "Owners/admins — write"                    on public.milestones;

drop policy if exists "Own chats"                                on public.chat_messages;

drop policy if exists "Own checkins — all ops"                   on public.checkins;
drop policy if exists "Owners/admins read company checkins"      on public.checkins;

drop policy if exists "Own company — all ops"                    on public.documents;

drop policy if exists "Company members — read safety docs"       on public.safety_documents;
drop policy if exists "Safety/admin/owner — manage safety docs"  on public.safety_documents;

drop policy if exists "Company members — read incidents"         on public.safety_incidents;
drop policy if exists "Safety/admin/owner — manage incidents"    on public.safety_incidents;

drop policy if exists "CFO suite — read sync log"                on public.qb_sync_log;

drop policy if exists "Own company — read GBP"                   on public.gbp_profiles;
drop policy if exists "Owners/admins — manage GBP"               on public.gbp_profiles;

drop policy if exists "safety-docs read (company members)"       on storage.objects;
drop policy if exists "safety-docs write (safety/admin/owner)"   on storage.objects;
drop policy if exists "tool-exports (own company)"               on storage.objects;
drop policy if exists "company-assets write (owner/admin)"       on storage.objects;

-- ============================================================================
-- Recreate policies, reading profile data via SECURITY DEFINER helpers
-- ============================================================================

-- ---------------- companies ----------------
create policy "companies_select_own"
  on public.companies for select
  using (id = public.current_company_id());

create policy "companies_update_owner_admin"
  on public.companies for update
  using (
    id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  )
  with check (
    id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

-- ---------------- profiles ----------------
-- Self-lookup: every user must be able to select their own row so the
-- helper functions can resolve it via SECURITY DEFINER contexts.
create policy "profiles_select_self"
  on public.profiles for select
  using (id = auth.uid());

-- Teammate directory: see other profiles sharing my company.
-- Safe because current_company_id() bypasses RLS.
create policy "profiles_select_teammates"
  on public.profiles for select
  using (company_id = public.current_company_id());

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Profile INSERT happens only via public.bootstrap_company() (SECURITY DEFINER),
-- so no client-exposed insert policy.

-- ---------------- business_profiles ----------------
create policy "bp_select_company"
  on public.business_profiles for select
  using (company_id = public.current_company_id());

create policy "bp_write_owner_admin"
  on public.business_profiles for all
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  )
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

-- ---------------- milestones ----------------
create policy "milestones_select_company"
  on public.milestones for select
  using (company_id = public.current_company_id());

create policy "milestones_write_owner_admin"
  on public.milestones for all
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  )
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

-- ---------------- chat_messages ----------------
create policy "chat_own"
  on public.chat_messages for all
  using (user_id = auth.uid() and company_id = public.current_company_id())
  with check (user_id = auth.uid() and company_id = public.current_company_id());

-- ---------------- checkins ----------------
create policy "checkins_own_write"
  on public.checkins for all
  using (user_id = auth.uid() and company_id = public.current_company_id())
  with check (user_id = auth.uid() and company_id = public.current_company_id());

create policy "checkins_owner_admin_read_all"
  on public.checkins for select
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

-- ---------------- documents ----------------
create policy "documents_company"
  on public.documents for all
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- ---------------- safety_documents ----------------
create policy "safety_docs_read_company"
  on public.safety_documents for select
  using (company_id = public.current_company_id());

create policy "safety_docs_write_privileged"
  on public.safety_documents for all
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'safety')
  )
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'safety')
  );

-- ---------------- safety_incidents ----------------
create policy "safety_incidents_read_company"
  on public.safety_incidents for select
  using (company_id = public.current_company_id());

create policy "safety_incidents_write_privileged"
  on public.safety_incidents for all
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'safety')
  )
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'safety')
  );

-- ---------------- qb_sync_log ----------------
create policy "qb_sync_read_finance"
  on public.qb_sync_log for select
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'cfo')
  );
-- Writes come from Edge Functions via service_role, which bypasses RLS.

-- ---------------- gbp_profiles ----------------
create policy "gbp_read_company"
  on public.gbp_profiles for select
  using (company_id = public.current_company_id());

create policy "gbp_write_owner_admin"
  on public.gbp_profiles for all
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  )
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

-- ---------------- storage.objects ----------------
-- Path convention: '<company_id>/<filename>'. First folder segment = company_id.

create policy "safety_docs_storage_read"
  on storage.objects for select
  using (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
  );

create policy "safety_docs_storage_write"
  on storage.objects for all
  using (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'safety')
  )
  with check (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'safety')
  );

create policy "tool_exports_storage"
  on storage.objects for all
  using (
    bucket_id = 'tool-exports'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
  )
  with check (
    bucket_id = 'tool-exports'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
  );

create policy "company_assets_storage_write"
  on storage.objects for all
  using (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  )
  with check (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );
