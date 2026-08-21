-- ============================================================================
-- Point the account at a fresh, empty demo workspace
--
-- Daniel picked the non-destructive route and does not care about keeping the
-- Deconstructors data. Both of those are true at once, and the second is not a
-- reason to do the first differently: deleting rows nobody minds about is work
-- with no payoff and a real downside if it goes wrong halfway.
--
-- So this creates a new company and repoints the profile at it. RLS scopes
-- every customer table by profile.company_id, so the app is instantly a clean
-- workspace. The old rows stay in the database, invisible to the app, and can
-- be dropped later at leisure — or never.
--
-- ⭐ Reversible in one statement. Set company_id back and everything returns.
--
-- Run STEP 1 and STEP 2. Step 3 is optional but recommended, and step 4 is a
-- reminder about something SQL cannot reach.
-- ============================================================================


-- ── STEP 1 — look first ─────────────────────────────────────────────────────
-- Confirm exactly one company matches, and see whose profile is attached.

select c.id, c.name, c.qb_realm_id is not null as quickbooks_connected,
       (select count(*) from public.profiles p where p.company_id = c.id) as profiles_attached
from   public.companies c
where  c.name ilike '%deconstruct%';

-- ⚠️ Expect ONE row. If you get none, the name does not match — list them all
-- with `select id, name from public.companies;` before going further. If you
-- get more than one, stop: step 2 would repoint profiles on both.


-- ── STEP 2 — new company, profile repointed. This is the whole change. ──────
-- Rename the string below to whatever you want the demo business called.
-- 'Bridgewater Mechanical' matches the example on leadeos.com/demo, so the
-- page and the live workspace tell the same story.

begin;

with newco as (
  insert into public.companies (name)
  values ('Bridgewater Mechanical')
  returning id
)
update public.profiles
set    company_id = (select id from newco)
where  company_id = (select id from public.companies where name ilike '%deconstruct%');

commit;

-- Confirm: this should now show your profile against the new company.
select p.id as profile_id, c.id as company_id, c.name
from   public.profiles p
join   public.companies c on c.id = p.company_id;

-- Next time you load the app it will send you through onboarding, because the
-- new company has no business_profiles row yet. That is the intended path —
-- it is how you set up the demo business.


-- ── STEP 3 — revoke the QuickBooks tokens on the OLD company ────────────────
-- Optional for the demo, worth doing anyway.
--
-- ⚠️ The QBO tokens live on the companies row itself, not only in
-- integration_secrets. The new company has none, so the demo workspace is
-- already clean — but the Deconstructors row still holds working credentials
-- against a real business's books, in a project you are about to hand round as
-- a demo. Clearing them costs nothing and closes that.

update public.companies
set    qb_access_token_encrypted  = null,
       qb_refresh_token_encrypted = null,
       qb_realm_id                = null,
       qb_token_expires_at        = null,
       qb_connected_at            = null
where  name ilike '%deconstruct%';

delete from public.integration_secrets
where  company_id = (select id from public.companies where name ilike '%deconstruct%');


-- ── STEP 4 — storage, which SQL cannot touch ────────────────────────────────
-- The uploaded PDFs live in Supabase Storage and none of the above affects
-- them. They are invisible to the new workspace, so nothing is broken by
-- leaving them — but they include real foreman procedures and an A/R aging
-- report for a real company.
--
-- Clear them when convenient: dashboard → Storage → bucket → select → delete.


-- ============================================================================
-- ROLLBACK, if you ever want the old workspace back
--
--   update public.profiles
--   set    company_id = (select id from public.companies where name ilike '%deconstruct%')
--   where  id = '<your-profile-id>';
--
-- That is the entire undo. Nothing was destroyed.
--
-- CLEANING UP FOR REAL, once you are sure you never want it:
-- delete from public.companies where name ilike '%deconstruct%';
-- ⚠️ Only after profiles no longer points there. Cascades will take the
-- company-scoped rows with it.
-- ============================================================================
