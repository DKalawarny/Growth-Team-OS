-- Delete the throwaway accounts the wayout diagnostics and audit harness create.
--
-- Each audit run signs up 12 accounts through the real anon key, because that is
-- the only way to reach the edge function the way the product does. They pile up.
--
-- ⭐ WHY THE @example.com PATTERN IS SAFE: it is an RFC 2606 reserved domain that
-- cannot receive mail, so no real person can hold one. Checked on 22 Sep: 30
-- users, 24 of them @example.com. The six kept are dkalawarny@hotmail.com,
-- danny@deconstructors.ca, two of Emilie's, and two mailinator test accounts.
--
-- ⚠️ Deleting auth.users CASCADES to profiles, wayout_sessions, wayout_playbooks
-- and company_members. Nothing blocks. wayout_diagnostics.user_id is SET NULL,
-- so the telemetry survives without the person — which is what we want.
--
-- 🔴 companies does NOT cascade — bootstrap_personal_account creates one per
-- signup and it is left behind. That is handled separately below, and NARROWLY:
-- only is_personal companies with no profile left. Deconstructors and
-- Bridgewater Mechanical are real and are never in scope.

begin;

-- What is about to go. Read this before committing.
select 'users to delete' as what, count(*) from auth.users where email like '%@example.com'
union all
select 'users kept', count(*) from auth.users where email not like '%@example.com';

delete from auth.users where email like '%@example.com';

-- Personal companies with nobody left in them. `is_personal` is the guard rail:
-- a real company is never personal, so this cannot reach one however it was made.
delete from companies c
where c.is_personal = true
  and not exists (select 1 from profiles p where p.company_id = c.id);

-- What survived. Expect 6 users, and companies down to Bridgewater x2 +
-- Deconstructors x2.
select 'users left' as what, count(*) from auth.users
union all
select 'companies left', count(*) from companies
union all
select 'personal companies left', count(*) from companies where is_personal;

commit;
