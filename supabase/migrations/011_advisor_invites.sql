-- ============================================================================
-- Eliv8 OS — Advisor invite system (migration 011)
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
  -- ⚠️ This was `encode(gen_random_bytes(32), 'hex')`, which is why this
  -- migration never actually ran: gen_random_bytes lives in pgcrypto, which is
  -- not on the search path here, so the whole file failed with
  -- "function gen_random_bytes(integer) does not exist" and was marked applied
  -- by hand to get past it. The tables have therefore never existed in
  -- production, and the advisor-invite feature has been silently dead.
  --
  -- Two concatenated UUIDs give the same 256 bits of randomness using
  -- gen_random_uuid(), which is core Postgres and needs no extension.
  token        text        not null unique
                           default (
                             replace(gen_random_uuid()::text, '-', '') ||
                             replace(gen_random_uuid()::text, '-', '')
                           ),
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

-- ⚠️ THIS POLICY USED TO BE `using (true)` WITH THIS COMMENT:
--   "Anyone authenticated can read an invite by its token (needed for the
--    accept-invite page — the caller will filter by token in the WHERE clause)."
--
-- The comment was the bug. RLS does not care what the caller filters by.
-- `using (true)` meant every authenticated user could read every row of this
-- table — including `token`, which is the secret that grants advisor access to
-- a company. Combined with accept_invite() not checking who was accepting,
-- any signed-up user could list pending tokens and join any company that had
-- one outstanding, gaining sight of their books, documents and conversations.
--
-- Caught in the 22 Aug audit before this migration had ever actually run.
--
-- Reads are now limited to the people who own the invite. The accept page does
-- not read this table at all — it calls get_invite_by_token() below, which
-- returns display fields and never the token.
create policy "Owners and admins read their own invites"
  on public.company_invites for select
  to authenticated
  using (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

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

  -- ⚠️ Verify WHO is accepting. This check did not exist: the function
  -- confirmed the token was valid and nothing about the caller, so whoever
  -- held a token could redeem it. The token is no longer readable from the
  -- client, but a leaked or forwarded link should still only work for the
  -- person it was addressed to.
  --
  -- When email is null the invite is a bare link by the owner's choice, and
  -- the token alone is the credential — the normal model for a share link.
  if v_invite.email is not null then
    if lower(v_invite.email) is distinct from
       lower((select u.email from auth.users u where u.id = v_user_id)) then
      raise exception 'accept_invite: this invite was sent to a different email address';
    end if;
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

-- ----------------------------------------------------------------------------
-- get_invite_by_token — what the accept page reads instead of the table.
--
-- Returns only what the page needs to say "X invited you to Y". Deliberately
-- does NOT return the token: the page already has it (it is in the URL) and
-- nothing else should ever receive it.
--
-- SECURITY DEFINER so it can look up a single invite by token without the
-- caller needing read access to the table. That is the whole point — the
-- lookup is scoped to one row the caller already holds the secret for, rather
-- than granting a select policy broad enough to enumerate every invite.
-- ----------------------------------------------------------------------------
create or replace function public.get_invite_by_token(p_token text)
returns table (
  id           uuid,
  company_id   uuid,
  company_name text,
  email        text,
  role         text,
  status       text,
  expires_at   timestamptz,
  created_at   timestamptz
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $fn$
  select i.id, i.company_id, c.name, i.email, i.role, i.status,
         i.expires_at, i.created_at
  from public.company_invites i
  join public.companies c on c.id = i.company_id
  where i.token = p_token
  limit 1;
$fn$;

revoke all on function public.get_invite_by_token(text) from public;
grant execute on function public.get_invite_by_token(text) to authenticated;

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
