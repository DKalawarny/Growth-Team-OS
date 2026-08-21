-- ============================================================================
-- Point the account at a fresh, empty demo workspace
--
-- ⚠️ REWRITTEN AFTER IT FAILED IN THE REAL DATABASE.
--
-- The first version matched the company by name:
--
--     where company_id = (select id from companies where name ilike '%deconstruct%')
--
-- and died with "21000: more than one row returned by a subquery used as an
-- expression". More than one company matches that pattern. The statement is
-- atomic so nothing was written — but a name pattern was the wrong tool for
-- picking a row that must be exactly one, and a guard in a comment is not a
-- guard. This version makes you paste real ids, so it cannot hit the wrong
-- company or several at once.
--
-- The change itself is unchanged in spirit: create a company, repoint
-- profiles.company_id at it. RLS scopes every customer table by that column,
-- so the app becomes a clean workspace immediately and setting the id back is
-- a complete undo. Nothing is deleted.
-- ============================================================================


-- ── STEP 1 — see what is actually there. Deletes nothing. ───────────────────
-- Run this ALONE first and read the output. This is the step that failed to
-- happen last time.

select
  c.id,
  c.name,
  c.created_at,
  c.qb_realm_id is not null                                              as quickbooks_connected,
  (select count(*) from public.profiles       p  where p.company_id  = c.id) as profiles,
  (select count(*) from public.milestones     m  where m.company_id  = c.id) as milestones,
  (select count(*) from public.chat_messages  cm where cm.company_id = c.id) as messages,
  (select count(*) from public.documents      d  where d.company_id  = c.id) as documents
from public.companies c
order by c.created_at;

-- Read it like this:
--   • The row with profiles > 0 is the one your login currently points at.
--     That is the one that matters — the others are strays.
--   • Strays with 0 profiles and 0 of everything else are empty shells, almost
--     certainly from a half-finished onboarding. Harmless. Ignore them, or
--     clean them up at the very bottom.
--   • If 'Bridgewater Mechanical' already appears, a previous attempt got
--     further than you think — use its id in step 2b instead of creating
--     another one.


-- ── STEP 2a — create the demo company, and note the id it returns ───────────
-- Skip this if Bridgewater Mechanical already exists in step 1's output.

insert into public.companies (name)
values ('Bridgewater Mechanical')
returning id, name;


-- ── STEP 2b — repoint your profile ──────────────────────────────────────────
-- Paste both ids. No pattern matching, no subquery that can return two rows.
--   NEW_COMPANY_ID = the id returned by 2a (or the existing Bridgewater row)
--   YOUR_PROFILE_ID = the profile id from step 1's row where profiles > 0
--
-- If you would rather not hunt for the profile id, use the email form below
-- instead — it is exact, because emails are unique in auth.users.

update public.profiles
set    company_id = 'NEW_COMPANY_ID'
where  id = 'YOUR_PROFILE_ID';

-- ── or, by email (pick ONE of these two, not both) ──
-- update public.profiles
-- set    company_id = 'NEW_COMPANY_ID'
-- where  id = (select id from auth.users where email = 'dkalawarny@hotmail.com');


-- ── STEP 3 — confirm ────────────────────────────────────────────────────────
-- Should show one row: your profile against Bridgewater Mechanical.

select p.id as profile_id, c.id as company_id, c.name
from   public.profiles p
join   public.companies c on c.id = p.company_id;

-- Next app load sends you through onboarding, because the new company has no
-- business_profiles row. That is the intended path for setting the demo up.


-- ── STEP 4 — revoke QuickBooks tokens on the OLD company ────────────────────
-- Optional, recommended. Paste the OLD company id from step 1.
--
-- ⚠️ QBO tokens live on the companies row itself, not only in
-- integration_secrets. The new company has none, so the demo workspace is
-- already clean — this closes the old door, which still holds working
-- credentials against a real business's books.

update public.companies
set    qb_access_token_encrypted  = null,
       qb_refresh_token_encrypted = null,
       qb_realm_id                = null,
       qb_token_expires_at        = null,
       qb_connected_at            = null
where  id = 'OLD_COMPANY_ID';

delete from public.integration_secrets
where  company_id = 'OLD_COMPANY_ID';


-- ── STEP 5 — storage, which SQL cannot reach ────────────────────────────────
-- Uploaded PDFs live in Supabase Storage and none of the above touches them.
-- They are invisible to the new workspace so nothing is broken by leaving
-- them, but they include real foreman procedures and an A/R aging report.
-- Dashboard → Storage → bucket → select → delete, when convenient.


-- ============================================================================
-- ROLLBACK — the entire undo, because nothing was destroyed:
--
--   update public.profiles set company_id = 'OLD_COMPANY_ID'
--   where id = 'YOUR_PROFILE_ID';
--
--
-- OPTIONAL — remove the empty stray companies step 1 revealed.
-- ⚠️ Only ids with 0 profiles AND 0 of everything else. Deleting a company
-- cascades to its company-scoped rows, so do not guess here.
--
--   delete from public.companies where id in ('stray-id-1', 'stray-id-2');
-- ============================================================================
