-- ============================================================================
-- GrowthOS — Advisor invite system (migration 011)
--
-- Adds two tables:
--   company_invites   pending invitations (token → company)
--   company_members   accepted advisor memberships (user → company, read-only)
--
-- Also extends SELECT policies on the six main data tables so that a user
-- listed in company_members can read that company's data.
--
-- Write access (INSERT / UPDATE / DELETE) is still restricted to the company's
-- own profiles. Advisors can only read.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- company_invites — pending invite links
-- ----------------------------------------------------------------------------
create table public.company_invites (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies(id) on delete cascade,
  invited_by   uuid        not null references public.profiles(id)  on delete cascade,
  email        text,                                  -- optional; for display only
  role         text        not null default 'advisor',
  token        text        not null unique
                           default encode(gen_random_bytes(32), 'hex'),
  status       text        not null default 'pending', -- pending | accepted | revoked
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '30 days')
);

alter table public.company_invites enable row level security;

-- Owners see and manage their own company's invites
create policy "Owners manage invites"
  on public.company_invites for all
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

-- Anyone authenticated can read an invite by its token (needed for the
-- accept-invite page — the caller will filter by token in the WHERE clause).
create policy "Authenticated users read any invite"
  on public.company_invites for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- company_members — accepted advisor memberships
-- ----------------------------------------------------------------------------
create table public.company_members (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies(id) on delete cascade,
  user_id      uuid        not null references auth.users(id)       on delete cascade,
  role         text        not null default 'advisor',
  invited_by   uuid        references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),

  unique (company_id, user_id)
);

alter table public.company_members enable row level security;

-- An advisor can see their own memberships (so useAuth can find which
-- companies they advise)
create policy "Members see own memberships"
  on public.company_members for select
  using (user_id = auth.uid());

-- Company owners can see all advisors linked to their company
create policy "Owners see company advisors"
  on public.company_members for select
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Owners can revoke advisor access (delete the membership row)
create policy "Owners revoke advisor access"
  on public.company_members for delete
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- INSERT is handled by accept_invite() SECURITY DEFINER below — no direct
-- client insert policy exposed.

-- ----------------------------------------------------------------------------
-- accept_invite(p_token) — SECURITY DEFINER RPC
--
-- Called by the advisor after they log in / sign up.
-- Validates the token, creates the company_members row, marks the invite
-- accepted. Returns the company_id so the client can redirect to the portal.
-- Idempotent: safe to call twice (membership UNIQUE constraint handles it).
-- ----------------------------------------------------------------------------
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id   uuid := auth.uid();
  v_invite    record;
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'accept_invite: must be authenticated';
  end if;

  select * into v_invite
    from public.company_invites
    where token = p_token;

  if not found then
    raise exception 'accept_invite: invite not found';
  end if;

  if v_invite.status = 'revoked' then
    raise exception 'accept_invite: this invite has been revoked';
  end if;

  if v_invite.status = 'accepted' then
    -- Already accepted — still return company_id so caller can redirect
    return v_invite.company_id;
  end if;

  if v_invite.expires_at < now() then
    raise exception 'accept_invite: this invite has expired';
  end if;

  -- Create the membership (idempotent via ON CONFLICT DO NOTHING)
  insert into public.company_members (company_id, user_id, role, invited_by)
  values (v_invite.company_id, v_user_id, v_invite.role, v_invite.invited_by)
  on conflict (company_id, user_id) do nothing;

  -- Mark invite accepted
  update public.company_invites
  set status = 'accepted', accepted_at = now()
  where id = v_invite.id;

  return v_invite.company_id;
end;
$$;

revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

-- ----------------------------------------------------------------------------
-- Extend SELECT policies on data tables to include company_members
--
-- Each policy adds a second OR branch: the user is listed in company_members
-- for that company. This gives advisors read-only access to client data
-- without touching the write policies (which remain owner/admin only).
-- ----------------------------------------------------------------------------

-- milestones
drop policy if exists "Own company — read" on public.milestones;
create policy "Own company or advisor — read"
  on public.milestones for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
    or
    company_id in (select company_id from public.company_members where user_id = auth.uid())
  );

-- business_profiles
drop policy if exists "Own company — read" on public.business_profiles;
create policy "Own company or advisor — read"
  on public.business_profiles for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
    or
    company_id in (select company_id from public.company_members where user_id = auth.uid())
  );

-- checkins (read-only for advisors — they cannot log check-ins for the owner)
drop policy if exists "Owners/admins read company checkins" on public.checkins;
create policy "Own company or advisor — read checkins"
  on public.checkins for select
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
    or
    company_id in (select company_id from public.company_members where user_id = auth.uid())
  );

-- documents
drop policy if exists "Own company — all ops" on public.documents;
create policy "Own company — all ops"
  on public.documents for all
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  )
  with check (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Advisors — read documents"
  on public.documents for select
  using (
    company_id in (select company_id from public.company_members where user_id = auth.uid())
  );

-- companies (advisors can read the company row — needed to show client name)
drop policy if exists "Members see own company" on public.companies;
create policy "Members or advisors see company"
  on public.companies for select
  using (
    id in (select company_id from public.profiles where id = auth.uid())
    or
    id in (select company_id from public.company_members where user_id = auth.uid())
  );
