-- ============================================================================
-- Reset the Deconstructors workspace into a clean demo workspace
--
-- ⚠️ READ THIS BEFORE RUNNING ANYTHING. THE DELETES ARE PERMANENT.
--
-- Run it in the Supabase SQL editor in FOUR passes, in order. Step 1 deletes
-- nothing — it shows you what you are about to destroy. Do not skip it.
--
-- WHAT PROTECTS YOU IF THIS GOES WRONG
--
-- The project has physical backups (most recent: 2026-08-21 13:20 UTC). That
-- is a real recovery path, but it restores the WHOLE project — it would also
-- roll back migration 030 and the terms acceptance from this afternoon. So
-- treat it as a fire escape, not an undo button.
--
-- ⚠️ I could not take a clean logical dump first: `supabase db dump` needs
-- Docker, and Docker was not running. If you want a proper row-level backup
-- before this, start Docker Desktop and say so — that is the belt-and-braces
-- version and it takes about a minute.
--
-- ⭐ THERE IS A NON-DESTRUCTIVE ALTERNATIVE. See OPTION B at the bottom. It
-- gives you the same clean, renamed workspace without deleting anything, by
-- pointing your profile at a brand-new company. The Deconstructors data stays
-- in the database, invisible, and recoverable if you ever want it. Unless you
-- specifically want the rows gone, B is the better trade.
-- ============================================================================


-- ── STEP 1 — LOOK AT THE TARGET. Deletes nothing. ───────────────────────────
-- Confirm this is the right company and see what would go.

with c as (
  select id, name from public.companies where name ilike '%deconstruct%'
)
select
  (select name from c)                                                      as company,
  (select id   from c)                                                      as company_id,
  (select count(*) from public.milestones      m  where m.company_id  = (select id from c)) as milestones,
  (select count(*) from public.chat_messages   cm where cm.company_id = (select id from c)) as chat_messages,
  (select count(*) from public.documents       d  where d.company_id  = (select id from c)) as generated_docs,
  (select count(*) from public.knowledge_files k  where k.company_id  = (select id from c)) as uploaded_files,
  (select count(*) from public.checkins        ci where ci.company_id = (select id from c)) as checkins,
  (select count(*) from public.work_orders     w  where w.company_id  = (select id from c)) as work_orders,
  (select count(*) from public.staff_members   s  where s.company_id  = (select id from c)) as staff,
  (select count(*) from public.solomon_memory  sm where sm.company_id = (select id from c)) as memories,
  (select count(*) from public.safety_documents sd where sd.company_id = (select id from c)) as safety_docs;

-- ⚠️ If `company` comes back NULL, the name does not match — STOP and check
-- `select id, name from public.companies;` rather than editing this blindly.
-- ⚠️ If more than one row matches '%deconstruct%', STOP. Every statement below
-- would hit both.


-- ── STEP 2 — DELETE THE CONTENT ─────────────────────────────────────────────
-- Everything here is business data. None of it is account plumbing.
--
-- What is deliberately NOT in this list, and why:
--   profiles           — that is YOUR user row. Deleting it locks you out.
--   company_members    — your membership link. Deleting it orphans you.
--   companies          — renamed in step 3, not deleted.
--   terms_acceptances  — keyed to user, not company. Deleting it just makes
--                        the gate ask you again for no reason.
--   subscriptions      — harmless, and payments are off during the pilot.

begin;

with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.document_chunks          where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.chat_chunks              where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.knowledge_files          where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.documents                where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.chat_messages            where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.solomon_memory           where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.checkins                 where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.work_order_step_comments where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.work_orders              where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.work_order_templates     where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.staff_members            where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.safety_incidents         where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.safety_documents         where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.milestones               where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.financial_snapshots      where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.gbp_profiles             where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.qb_sync_log              where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.usage_events             where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.email_log                where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.company_invites          where company_id = (select id from c);

-- ⚠️ QuickBooks. These hold the OAuth tokens and the connection to the real
-- Deconstructors books. For a demo workspace they must go — otherwise the
-- demo pulls live financials from a real company.
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.integration_secrets      where company_id = (select id from c);
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.integrations             where company_id = (select id from c);

-- The business profile holds the real revenue, margin and goals. Removing the
-- row sends you back through onboarding on next load, which is exactly what
-- you want for setting up the demo business.
with c as (select id from public.companies where name ilike '%deconstruct%')
delete from public.business_profiles        where company_id = (select id from c);

commit;


-- ── STEP 3 — RENAME ─────────────────────────────────────────────────────────
-- Change the name to whatever you want the demo business called.

update public.companies
set    name = 'Bridgewater Mechanical'
where  name ilike '%deconstruct%';

select id, name from public.companies;


-- ── STEP 4 — STORAGE, WHICH SQL DOES NOT TOUCH ──────────────────────────────
-- ⚠️ Deleting knowledge_files rows removes the DATABASE records. The actual
-- uploaded PDFs still sit in Supabase Storage and are not affected by anything
-- above. Clear them by hand: Supabase dashboard → Storage → the bucket → select
-- the Deconstructors files → delete.
--
-- Worth doing. Those files include real foreman procedures and an A/R aging
-- report for a real company.


-- ============================================================================
-- OPTION B — the non-destructive version. Run INSTEAD of steps 2 and 3.
--
-- Makes a fresh empty company and points your profile at it. RLS scopes
-- everything by profile.company_id, so the app immediately behaves as a clean
-- workspace — while every Deconstructors row stays in the database, invisible,
-- and recoverable by switching the id back.
--
-- Same visible result. Nothing destroyed. Reversible in one statement.
--
-- ⚠️ Replace the email with the login you actually use.
-- ============================================================================

-- begin;
--
-- insert into public.companies (name)
-- values ('Bridgewater Mechanical')
-- returning id;
--
-- -- paste the returned id below, then:
-- update public.profiles
-- set    company_id = '<the-new-company-id>'
-- where  id = (select id from auth.users where email = 'you@example.com');
--
-- commit;
--
-- -- To undo, set company_id back to the Deconstructors id. That is the whole
-- -- rollback. Nothing was deleted.
