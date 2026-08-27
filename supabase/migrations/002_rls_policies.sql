-- ============================================================================
-- Eliv8 OS — RLS policies
--
-- The pre-existing `rls_auto_enable` event trigger already enables RLS on
-- every newly-created public table, but we `alter ... enable row level
-- security` explicitly as a belt-and-suspenders measure — the statements are
-- idempotent and future-proof this migration if the trigger is ever removed.
--
-- Policy shape (prior-thread standard): one permissive "Own data" policy per
-- table, scoped to rows whose `company_id` is in the caller's profile.
--
-- Special cases:
--   profiles:          users see every profile in their company (teammate
--                      directory) but can only update their own row.
--   companies:         members can see their company row; only owners can
--                      update it.
--   safety_documents:  members can SELECT (workers need to read safety docs).
--                      Only safety/admin/owner roles can INSERT/UPDATE/DELETE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enable RLS explicitly
-- ----------------------------------------------------------------------------
alter table public.companies          enable row level security;
alter table public.profiles           enable row level security;
alter table public.business_profiles  enable row level security;
alter table public.milestones         enable row level security;
alter table public.chat_messages      enable row level security;
alter table public.checkins           enable row level security;
alter table public.documents          enable row level security;
alter table public.safety_documents   enable row level security;
alter table public.safety_incidents   enable row level security;
alter table public.qb_sync_log        enable row level security;
alter table public.gbp_profiles       enable row level security;

-- ============================================================================
-- companies
-- ============================================================================
create policy "Members see own company"
  on public.companies for select
  using (id in (select company_id from public.profiles where id = auth.uid()));

create policy "Owners update own company"
  on public.companies for update
  using (
    id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (
    id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );
-- INSERT is not exposed to clients — companies are created only via the
-- public.bootstrap_company() SECURITY DEFINER RPC.
-- DELETE is not exposed — cancellations are soft (plan_status = 'cancelled').

-- ============================================================================
-- profiles
-- Teammate directory: see everyone in your company. Write only your own row.
-- ============================================================================
create policy "See profiles in same company"
  on public.profiles for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
-- INSERT happens inside bootstrap_company() (SECURITY DEFINER). Additional
-- teammate seats are invited via a separate invite_user RPC (to build later),
-- so no client-facing INSERT policy is exposed.

-- ============================================================================
-- business_profiles  —  full tenant read/write for owners/admins only
-- ============================================================================
create policy "Own company — read"
  on public.business_profiles for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Own company — write"
  on public.business_profiles for all
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================================
-- milestones  —  all company members can read; owners/admins manage
-- ============================================================================
create policy "Own company — read"
  on public.milestones for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Owners/admins — write"
  on public.milestones for all
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================================
-- chat_messages  —  each user sees only their own threads
-- Advisor/CFO chats are personal; safety chat is also per-user but citations
-- come from shared company documents.
-- ============================================================================
create policy "Own chats"
  on public.chat_messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- checkins  —  each user logs their own; owners/admins see the whole company
-- ============================================================================
create policy "Own checkins — all ops"
  on public.checkins for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Owners/admins read company checkins"
  on public.checkins for select
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================================
-- documents (tool output library)  —  company-scoped
-- ============================================================================
create policy "Own company — all ops"
  on public.documents for all
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  )
  with check (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

-- ============================================================================
-- safety_documents  —  all company members can read (workers need access).
-- Only owner/admin/safety roles can upload/modify.
-- ============================================================================
create policy "Company members — read safety docs"
  on public.safety_documents for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Safety/admin/owner — manage safety docs"
  on public.safety_documents for all
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'safety')
    )
  )
  with check (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'safety')
    )
  );

-- ============================================================================
-- safety_incidents  —  same model as safety_documents
-- ============================================================================
create policy "Company members — read incidents"
  on public.safety_incidents for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Safety/admin/owner — manage incidents"
  on public.safety_incidents for all
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'safety')
    )
  )
  with check (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'safety')
    )
  );

-- ============================================================================
-- qb_sync_log  —  financial data; owner/admin/cfo only
-- ============================================================================
create policy "CFO suite — read sync log"
  on public.qb_sync_log for select
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin', 'cfo')
    )
  );
-- Writes to qb_sync_log happen from Edge Functions with the service_role
-- key, which bypasses RLS. No client-side write policy.

-- ============================================================================
-- gbp_profiles  —  owner/admin manage the GBP optimiser state
-- ============================================================================
create policy "Own company — read GBP"
  on public.gbp_profiles for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Owners/admins — manage GBP"
  on public.gbp_profiles for all
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================================
-- Storage buckets (safety vault + company assets + tool exports)
-- Create idempotently. Policies live on storage.objects.
-- Path convention: {company_id}/... — enforced by folder-scoped policies.
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('safety-documents', 'safety-documents', false),
  ('company-assets',   'company-assets',   true),
  ('tool-exports',     'tool-exports',     false)
on conflict (id) do nothing;

-- Helper: the first folder in an object path is the caller's company_id.
-- Storage objects are written as: `<company_id>/<filename>`.

-- safety-documents: read for all company members, write for safety/admin/owner
create policy "safety-docs read (company members)"
  on storage.objects for select
  using (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1]::uuid
        in (select company_id from public.profiles where id = auth.uid())
  );

create policy "safety-docs write (safety/admin/owner)"
  on storage.objects for all
  using (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1]::uuid
        in (
          select company_id from public.profiles
          where id = auth.uid() and role in ('owner', 'admin', 'safety')
        )
  )
  with check (
    bucket_id = 'safety-documents'
    and (storage.foldername(name))[1]::uuid
        in (
          select company_id from public.profiles
          where id = auth.uid() and role in ('owner', 'admin', 'safety')
        )
  );

-- tool-exports: company-scoped, all members
create policy "tool-exports (own company)"
  on storage.objects for all
  using (
    bucket_id = 'tool-exports'
    and (storage.foldername(name))[1]::uuid
        in (select company_id from public.profiles where id = auth.uid())
  )
  with check (
    bucket_id = 'tool-exports'
    and (storage.foldername(name))[1]::uuid
        in (select company_id from public.profiles where id = auth.uid())
  );

-- company-assets bucket is public (logo etc.), but only owners/admins can
-- write. Read is public so <img src> works without auth.
create policy "company-assets write (owner/admin)"
  on storage.objects for all
  using (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1]::uuid
        in (
          select company_id from public.profiles
          where id = auth.uid() and role in ('owner', 'admin')
        )
  )
  with check (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1]::uuid
        in (
          select company_id from public.profiles
          where id = auth.uid() and role in ('owner', 'admin')
        )
  );
