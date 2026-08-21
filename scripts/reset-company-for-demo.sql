-- ============================================================================
-- Point the account at a fresh, empty demo workspace
--
-- ⭐ FILLED IN WITH THE REAL IDS from the 2026-08-21 query. No pattern matching.
--
-- What the database actually had — two companies, both named "Deconstructors":
--
--   2ed1c998-5e9a-4e05-9c87-66ae2bffda49   17 Apr 20:09
--     0 profiles · 12 milestones · 0 messages · 0 documents
--     An ORPHAN. A first onboarding attempt that generated a roadmap and was
--     abandoned two hours later. Nothing points at it.
--
--   c35291b5-4ddb-4e88-b68d-44da6be3e73e   17 Apr 22:11
--     1 profile · 15 milestones · 15 messages · 6 documents
--     THE LIVE ONE. This is where the login points and where the real data is.
--
-- That duplicate is why the first version of this script failed with
-- "21000: more than one row returned by a subquery" — `name ilike
-- '%deconstruct%'` matched both.
--
-- ⚠️ quickbooks_connected is FALSE on both. QuickBooks has never been
-- connected, so there are no tokens to revoke and the QBO flow has never run
-- end to end. The old step 4 is deleted rather than left in as busywork.
-- ============================================================================


-- ── STEP 1 — create the demo company ────────────────────────────────────────

insert into public.companies (name)
values ('Bridgewater Mechanical')
returning id, name;

-- Copy the id it returns into step 2.


-- ── STEP 2 — repoint the profile ────────────────────────────────────────────
-- Targets the live company by id, so it cannot touch the orphan or anything
-- else. Replace NEW_COMPANY_ID with what step 1 returned.

update public.profiles
set    company_id = 'NEW_COMPANY_ID'
where  company_id = 'c35291b5-4ddb-4e88-b68d-44da6be3e73e'
returning id as profile_id, company_id;

-- Expect exactly ONE row back. If it returns zero, the profile is not where
-- step 1's query said it was — stop and re-run the audit rather than guessing.


-- ── STEP 3 — confirm ────────────────────────────────────────────────────────

select p.id as profile_id, c.id as company_id, c.name
from   public.profiles p
join   public.companies c on c.id = p.company_id;

-- Expect one row: your profile against Bridgewater Mechanical.
--
-- Next app load sends you through onboarding, because the new company has no
-- business_profiles row yet. That is the intended path — it is how the demo
-- business gets set up.


-- ── STEP 4 (optional) — bin the orphan ──────────────────────────────────────
-- Safe: 0 profiles, 0 messages, 0 documents. Only 12 milestones from an
-- abandoned onboarding, and the cascade takes them with it.

-- delete from public.companies
-- where  id = '2ed1c998-5e9a-4e05-9c87-66ae2bffda49';


-- ── STEP 5 (optional, and only once you are sure) ───────────────────────────
-- Bin the old live company too. Daniel said he does not care about keeping
-- Deconstructors, so this is available — but there is no need to rush it.
-- Leaving it costs nothing, it is invisible to the app, and while it exists
-- the rollback below still works.
--
-- ⚠️ Run ONLY after step 3 confirms the profile has moved. Deleting a company
-- cascades to every company-scoped row under it: 15 milestones, 15 messages,
-- 6 documents, the check-ins, the uploaded file records.

-- delete from public.companies
-- where  id = 'c35291b5-4ddb-4e88-b68d-44da6be3e73e';


-- ============================================================================
-- ROLLBACK — the whole undo, as long as step 5 has not been run:
--
--   update public.profiles
--   set    company_id = 'c35291b5-4ddb-4e88-b68d-44da6be3e73e'
--   where  id = '<your-profile-id>';
--
-- STORAGE — SQL cannot reach it. The uploaded PDFs stay in the bucket and are
-- invisible to the new workspace, so nothing is broken by leaving them. They
-- do include real foreman procedures and an A/R aging report, so clear them
-- when convenient: dashboard → Storage → bucket → select → delete.
-- ============================================================================
