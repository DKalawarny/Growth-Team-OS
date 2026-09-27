-- Purge the audit harness's throwaway accounts.
--
-- ⚠️ KEEPS wayout-audit@example.com — the ONE permanent account every audit now
-- reuses (scripts/lib/testAuth.mjs), which is why this should never be needed
-- again.
--
-- ✅ VERIFIED BEFORE THIS WAS WRITTEN, 26 Sep: 18 accounts, every one created
-- that day by an audit run, 0 wayout_sessions attached, 18 profiles, 18
-- companies, and 0 real users sharing any of those companies.
begin;

create temp table doomed as
  select u.id as user_id, p.company_id
  from auth.users u
  left join profiles p on p.id = u.id
  where u.email like '%@example.com'
    and u.email <> 'wayout-audit@example.com';

-- 🔴 A GUARD, NOT A COMMENT. Membership lives on profiles.company_id — NOT in
-- company_members, which is empty and has misled a cleanup query here before. If
-- any company about to be deleted is shared with a real profile, the transaction
-- dies rather than taking somebody's company with it.
do $$
declare shared int;
begin
  select count(*) into shared
  from profiles p
  where p.company_id in (select company_id from doomed where company_id is not null)
    and p.id not in (select user_id from doomed);
  if shared > 0 then
    raise exception 'ABORTED: % real profile(s) share a company with a test account', shared;
  end if;
end $$;

delete from profiles  where id in (select user_id from doomed);
delete from companies where id in (select company_id from doomed where company_id is not null);
delete from auth.users where id in (select user_id from doomed);

select
  (select count(*) from auth.users where email like '%@example.com') as example_accounts_left,
  (select count(*) from auth.users) as total_users;

commit;

-- ── HOW TO RUN IT ───────────────────────────────────────────────────────────
--   supabase db query --linked -f supabase/maintenance/purge-audit-accounts.sql
--
-- ⚠️ THIS SHOULD BE A ONE-OFF. The leak it cleans up is fixed at source: every
-- audit script now reuses the single account in scripts/lib/testAuth.mjs instead
-- of signing up a throwaway per run. If this file is ever needed a second time,
-- something has started creating accounts again — find that cause before running
-- it, because the file will happily hide the symptom.
