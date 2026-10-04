-- ⭐⭐ TEAM ROLES — Eliv8 OS gets a team, and the team sees only its part.
-- 3 Oct 2026. Decisions (Daniel): `admin` = "runs the business"; crews stay on
-- magic links. Mirrors src/lib/access.js — change both together.
--
--   owner  : everything, and the only one who adds/removes people or bills.
--   admin  : runs it — Solomon, roadmap, succession, finances, library.
--   cfo    : office — finances, cash flow, the library. Not Solomon.
--   manager / safety / member : operations — the work board, logs, playbooks.
--
-- 🔴 Before this there was no way to add an employee at all (every account was
-- the sole owner of its own company); the only sharing was the read-only
-- ADVISOR invite through company_members, which this leaves as it was.
-- 🔴 Several tables had TWO permissive read policies; permissive policies OR
-- together, so tightening one while leaving the other changes nothing. Every
-- read policy on a gated table is dropped and replaced, not amended.

-- ─── 1. The one predicate ────────────────────────────────────────────────────
create or replace function public.can_area(p_area text)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select case p_area
    when 'owner'  then r = 'owner'
    when 'lead'   then r in ('owner', 'admin')
    when 'office' then r in ('owner', 'admin', 'cfo')
    when 'all'    then r is not null
    else false
  end
  from (select public.current_user_role() as r) x;
$$;
grant execute on function public.can_area(text) to authenticated;

-- Advisors (company_members) keep the read access the owner gave them.
create or replace function public.is_advisor_of(p_company uuid)
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (select 1 from public.company_members m
                 where m.company_id = p_company and m.user_id = auth.uid());
$$;
grant execute on function public.is_advisor_of(uuid) to authenticated;

-- ─── 2. Money and the business profile: office ──────────────────────────────
drop policy if exists "Own company or advisor — read" on public.business_profiles;
drop policy if exists bp_select_company on public.business_profiles;
create policy bp_read on public.business_profiles for select using (
  (company_id = current_company_id() and can_area('office')) or is_advisor_of(company_id));

drop policy if exists financial_snapshots_read on public.financial_snapshots;
create policy financial_snapshots_read on public.financial_snapshots for select using (
  company_id = current_company_id() and can_area('office'));

-- ─── 3. Solomon: lead, and each person's own conversation ───────────────────
drop policy if exists chat_own on public.chat_messages;
create policy chat_own on public.chat_messages for all
  using (user_id = auth.uid() and company_id = current_company_id() and can_area('lead'))
  with check (user_id = auth.uid() and company_id = current_company_id() and can_area('lead'));

-- 🔴 chat_chunks were readable by the whole company: Solomon's retrieval over
-- past conversations would have handed one person's words to another.
drop policy if exists chat_chunks_select on public.chat_chunks;
drop policy if exists chat_chunks_insert on public.chat_chunks;
drop policy if exists chat_chunks_delete on public.chat_chunks;
create policy chat_chunks_select on public.chat_chunks for select using (
  company_id = current_company_id() and user_id = auth.uid() and can_area('lead'));
create policy chat_chunks_insert on public.chat_chunks for insert with check (
  company_id = current_company_id() and user_id = auth.uid() and can_area('lead'));
create policy chat_chunks_delete on public.chat_chunks for delete using (
  company_id = current_company_id() and user_id = auth.uid() and can_area('lead'));

drop policy if exists "Read own company memory"   on public.solomon_memory;
drop policy if exists "Write own company memory"  on public.solomon_memory;
drop policy if exists "Update own company memory" on public.solomon_memory;
drop policy if exists "Delete own company memory" on public.solomon_memory;
create policy solomon_memory_read on public.solomon_memory for select using (
  company_id = current_company_id() and can_area('lead') and (user_id is null or user_id = auth.uid()));
create policy solomon_memory_insert on public.solomon_memory for insert with check (
  company_id = current_company_id() and can_area('lead') and (user_id is null or user_id = auth.uid()));
create policy solomon_memory_update on public.solomon_memory for update using (
  company_id = current_company_id() and can_area('lead') and (user_id is null or user_id = auth.uid()));
create policy solomon_memory_delete on public.solomon_memory for delete using (
  company_id = current_company_id() and can_area('lead') and (user_id is null or user_id = auth.uid()));

-- The roadmap.
drop policy if exists "Own company or advisor — read" on public.milestones;
drop policy if exists milestones_select_company on public.milestones;
create policy milestones_read on public.milestones for select using (
  (company_id = current_company_id() and can_area('lead')) or is_advisor_of(company_id));

drop policy if exists integrations_read on public.integrations;
create policy integrations_read on public.integrations for select using (
  company_id = current_company_id() and can_area('lead'));

drop policy if exists "usage_events: company members can read" on public.usage_events;
create policy usage_events_read on public.usage_events for select using (
  company_id = current_company_id() and can_area('lead'));

-- ─── 4. Documents and the library: office; Solomon's own outputs: lead ──────
-- Office sees what the finance tools and the library analysis produced; a
-- decision Solomon worked through, a succession score, a hiring plan stay lead.
drop policy if exists documents_company on public.documents;
drop policy if exists "Own company — all ops" on public.documents;
create policy documents_team on public.documents for all
  using (company_id = current_company_id() and (can_area('lead')
         or (can_area('office') and tool_id in ('cfo-dashboard', 'cash-flow', '__library_analysis__'))))
  with check (company_id = current_company_id() and (can_area('lead')
         or (can_area('office') and tool_id in ('cfo-dashboard', 'cash-flow', '__library_analysis__'))));

drop policy if exists chunks_select on public.document_chunks;
drop policy if exists chunks_insert on public.document_chunks;
drop policy if exists chunks_delete on public.document_chunks;
create policy chunks_select on public.document_chunks for select using (
  company_id = current_company_id() and can_area('office'));
create policy chunks_insert on public.document_chunks for insert with check (
  company_id = current_company_id() and can_area('office'));
create policy chunks_delete on public.document_chunks for delete using (
  company_id = current_company_id() and can_area('office'));

drop policy if exists knowledge_files_read   on public.knowledge_files;
drop policy if exists knowledge_files_insert on public.knowledge_files;
drop policy if exists knowledge_files_update on public.knowledge_files;
drop policy if exists knowledge_files_delete on public.knowledge_files;
create policy knowledge_files_read on public.knowledge_files for select using (
  company_id = current_company_id() and can_area('office'));
create policy knowledge_files_insert on public.knowledge_files for insert with check (
  company_id = current_company_id() and uploaded_by = auth.uid() and can_area('office'));
create policy knowledge_files_update on public.knowledge_files for update
  using (company_id = current_company_id() and can_area('office'))
  with check (company_id = current_company_id() and can_area('office'));
create policy knowledge_files_delete on public.knowledge_files for delete using (
  company_id = current_company_id() and can_area('office')
  and (uploaded_by = auth.uid() or can_area('lead')));

-- The uploaded files themselves, not just their rows.
drop policy if exists knowledge_files_storage_read   on storage.objects;
drop policy if exists knowledge_files_storage_write  on storage.objects;
drop policy if exists knowledge_files_storage_delete on storage.objects;
drop policy if exists tool_exports_storage          on storage.objects;
create policy knowledge_files_storage_read on storage.objects for select using (
  bucket_id = 'knowledge-files' and (storage.foldername(name))[1]::uuid = public.current_company_id()
  and public.can_area('office'));
create policy knowledge_files_storage_write on storage.objects for insert with check (
  bucket_id = 'knowledge-files' and (storage.foldername(name))[1]::uuid = public.current_company_id()
  and public.can_area('office'));
create policy knowledge_files_storage_delete on storage.objects for delete using (
  bucket_id = 'knowledge-files' and (storage.foldername(name))[1]::uuid = public.current_company_id()
  and public.can_area('office'));
create policy tool_exports_storage on storage.objects for all
  using (bucket_id = 'tool-exports' and (storage.foldername(name))[1]::uuid = public.current_company_id()
         and public.can_area('office'))
  with check (bucket_id = 'tool-exports' and (storage.foldername(name))[1]::uuid = public.current_company_id()
         and public.can_area('office'));

-- ─── 5. Granting access is the owner's alone ────────────────────────────────
drop policy if exists "Owners manage invites" on public.company_invites;
drop policy if exists "Owners and admins read their own invites" on public.company_invites;
create policy invites_owner on public.company_invites for all
  using (company_id = current_company_id() and can_area('owner'))
  with check (company_id = current_company_id() and can_area('owner'));

drop policy if exists "Owners revoke advisor access" on public.company_members;
drop policy if exists "Owners see company advisors" on public.company_members;
create policy members_owner_read on public.company_members for select using (
  company_id = current_company_id() and can_area('owner'));
create policy members_owner_delete on public.company_members for delete using (
  company_id = current_company_id() and can_area('owner'));

-- An invite is either an advisor (read-only, outside the business) or a
-- teammate with a role. A teammate invite must name the person: a forwarded
-- link should not hand somebody the finances.
alter table public.company_invites drop constraint if exists company_invites_role_check;
alter table public.company_invites add constraint company_invites_role_check
  check (role in ('advisor', 'admin', 'cfo', 'manager'));
alter table public.company_invites drop constraint if exists company_invites_teammate_email;
alter table public.company_invites add constraint company_invites_teammate_email
  check (role = 'advisor' or email is not null);

-- ─── 6. Joining, changing and leaving ───────────────────────────────────────
create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer
set search_path = public, pg_catalog as $$
declare
  v_user   uuid := auth.uid();
  v_inv    record;
  v_email  text;
  v_cur    record;
begin
  if v_user is null then raise exception 'accept_invite: must be authenticated'; end if;
  select * into v_inv from public.company_invites where token = p_token;
  if not found then raise exception 'accept_invite: invite not found'; end if;
  if v_inv.status = 'revoked' then raise exception 'accept_invite: this invite has been revoked'; end if;
  if v_inv.status = 'accepted' then return v_inv.company_id; end if;
  if v_inv.expires_at < now() then raise exception 'accept_invite: this invite has expired'; end if;

  select u.email into v_email from auth.users u where u.id = v_user;
  if v_inv.email is not null and lower(v_inv.email) is distinct from lower(v_email) then
    raise exception 'accept_invite: this invite was sent to a different email address';
  end if;

  if v_inv.role = 'advisor' then
    insert into public.company_members (company_id, user_id, role, invited_by)
    values (v_inv.company_id, v_user, v_inv.role, v_inv.invited_by)
    on conflict (company_id, user_id) do nothing;
  else
    -- ⭐ A teammate joins the company itself. 🔴 Never pull somebody out of a
    -- business of their own: an account that has a business profile, or other
    -- people in its company, is refused rather than silently moved.
    select company_id into v_cur from public.profiles where id = v_user;
    if found then
      if v_cur.company_id is distinct from v_inv.company_id and (
           exists (select 1 from public.business_profiles b where b.company_id = v_cur.company_id)
        or exists (select 1 from public.profiles p where p.company_id = v_cur.company_id and p.id <> v_user)
      ) then
        raise exception 'accept_invite: this email already has its own business on Eliv8 OS — accept with a different email address';
      end if;
      update public.profiles set company_id = v_inv.company_id, role = v_inv.role::public.user_role
       where id = v_user;
    else
      insert into public.profiles (id, company_id, role, email, name)
      values (v_user, v_inv.company_id, v_inv.role::public.user_role, v_email,
              (select u.raw_user_meta_data->>'full_name' from auth.users u where u.id = v_user));
    end if;
  end if;

  update public.company_invites set status = 'accepted', accepted_at = now() where id = v_inv.id;
  return v_inv.company_id;
end $$;

-- The owner changes what someone can see. Never their own role, never to owner.
create or replace function public.set_member_role(p_user uuid, p_role text)
returns void language plpgsql security definer
set search_path = public, pg_catalog as $$
begin
  if not public.can_area('owner') then raise exception 'Only the owner can change what people can see'; end if;
  if p_user = auth.uid() then raise exception 'You cannot change your own role'; end if;
  if p_role not in ('admin', 'cfo', 'manager') then raise exception 'Not a role you can give'; end if;
  update public.profiles set role = p_role::public.user_role
   where id = p_user and company_id = public.current_company_id();
  if not found then raise exception 'That person is not on your team'; end if;
end $$;

-- The owner removes someone. Their account survives, with nothing of this
-- business in it: they are moved to an empty personal workspace of their own.
create or replace function public.remove_member(p_user uuid)
returns void language plpgsql security definer
set search_path = public, pg_catalog as $$
declare v_new uuid;
begin
  if not public.can_area('owner') then raise exception 'Only the owner can remove people'; end if;
  if p_user = auth.uid() then raise exception 'You cannot remove yourself'; end if;
  if not exists (select 1 from public.profiles where id = p_user and company_id = public.current_company_id()) then
    raise exception 'That person is not on your team';
  end if;
  insert into public.companies (name, is_personal) values ('Personal', true) returning id into v_new;
  update public.profiles set company_id = v_new, role = 'owner' where id = p_user;
end $$;

grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
