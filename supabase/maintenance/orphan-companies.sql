-- Orphan companies: rows nobody's profile points at any more.
--
-- ⚠️ PRE-EXISTING, NOT CAUSED BY THE AUDIT PURGE. Five companies against two
-- profiles, dating from demo signups in May that never completed onboarding —
-- bootstrap_personal_account creates the company, and the profile row was never
-- written or was removed later.
--
-- 🔴 HARMLESS BUT WORTH CLEARING BEFORE A STRANGER ARRIVES, because every
-- customer-facing table in this schema is RLS-scoped by company_id, and rows
-- with no owner are exactly the shape that makes a permissions audit ambiguous.

begin;

-- What is about to go, so it can be read before it goes.
select c.id, c.name, c.created_at::date
from companies c
where not exists (select 1 from profiles p where p.company_id = c.id)
order by c.created_at;

-- 🔴 A GUARD, NOT A COMMENT. Membership lives on profiles.company_id — NOT in
-- company_members, which is empty and has misled a cleanup query here before.
-- If anything at all still references one of these, the transaction dies rather
-- than leaving a dangling row behind it.
do $$
declare held int;
begin
  select count(*) into held
  from wayout_sessions s
  where s.user_id in (
    select p.id from profiles p
    where p.company_id in (
      select c.id from companies c
      where not exists (select 1 from profiles p2 where p2.company_id = c.id)
    )
  );
  if held > 0 then
    raise exception 'ABORTED: % session(s) belong to an orphan company', held;
  end if;
end $$;

delete from companies c
where not exists (select 1 from profiles p where p.company_id = c.id);

select
  (select count(*) from companies) as companies_left,
  (select count(*) from profiles)  as profiles;

commit;

-- ── HOW TO RUN IT ───────────────────────────────────────────────────────────
--   supabase db query --linked -f supabase/maintenance/orphan-companies.sql
