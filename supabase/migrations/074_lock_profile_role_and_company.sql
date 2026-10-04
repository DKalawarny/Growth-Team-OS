-- 🔴🔴 3 Oct 2026: ANY SIGNED-IN USER COULD MAKE THEMSELVES AN OWNER, OR MOVE
-- THEMSELVES INTO ANOTHER BUSINESS. The only profiles UPDATE policy is
-- `id = auth.uid()`, and `authenticated` held UPDATE on every column — role and
-- company_id included. Every company-scoped policy reads current_company_id(),
-- which reads profiles.company_id, so pointing your own row at another company's
-- id made all of that company readable. Proven on two throwaway accounts before
-- this was written (B set role=owner, moved into A's company, read A's row).
-- Anyone can sign up (Unstuck Map is public), so this was open to the public;
-- the only barrier was knowing a company's uuid.
--
-- Nothing in the app writes these columns from the browser: role and company
-- are set by SECURITY DEFINER functions (bootstrap_company,
-- bootstrap_personal_account, accept_invite), which run as their owner and are
-- unaffected by either lock below.

-- 1. Column privileges: the browser may change only what a person may change.
revoke update on public.profiles from anon, authenticated;
grant update (name, avatar_url, last_seen_at) on public.profiles to authenticated;

-- 2. Belt and braces: even if a grant is widened later, a client role cannot
--    change identity, membership or authority on a profile.
create or replace function public.profiles_lock_authority()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and (
       new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.company_id is distinct from old.company_id
    or new.custom_permissions is distinct from old.custom_permissions
    or new.email is distinct from old.email
  ) then
    raise exception 'role, company and permissions cannot be changed from the app'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_lock_authority on public.profiles;
create trigger profiles_lock_authority before update on public.profiles
  for each row execute function public.profiles_lock_authority();
