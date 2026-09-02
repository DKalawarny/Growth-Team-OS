-- ============================================================================
-- 037 — office notes
--
-- Daniel: "they would need a general notes area as well for the day to day
-- things, not just the job."
--
-- ⚠️ DELIBERATELY NOT daily_logs, though it would have fitted. That table has
-- author_profile and a nullable work_order_id, so an office note could have
-- been squeezed in. Two reasons not to:
--
--   1. daily_logs means one thing — the CREW's account of a job, written by
--      someone who was there, and immutable because of it. An office note is a
--      different person writing a different kind of thing, and mixing them
--      would leave Solomon holding one bucket containing two sorts of claim
--      with no reliable way to weigh them.
--   2. The unique index on daily_logs allows one row per person per job per
--      day. That is right for "what happened on this job" and wrong for
--      "things I noticed today", which arrive in threes.
--
-- ⚠️ These ARE editable by their author, unlike a crew log. The reason the crew
-- log is immutable is that the office must not be able to revise it. A note
-- someone wrote about their own day is theirs to correct.
--
-- Owner-scoped like everything else. Crew never touch this table — they have
-- no account and no path to it.
-- ============================================================================

create table if not exists public.office_notes (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  author_profile uuid          references public.profiles(id)  on delete set null,

  note_date      date not null default (now() at time zone 'utc')::date,
  note           text not null check (length(btrim(note)) > 0),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists office_notes_company_date_idx
  on public.office_notes (company_id, note_date desc, created_at desc);

alter table public.office_notes enable row level security;

create policy office_notes_company_read on public.office_notes
  for select using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

-- Insert scoped to the company; author must be the person writing it, so a note
-- cannot be attributed to a colleague.
create policy office_notes_insert on public.office_notes
  for insert with check (
    company_id in (select company_id from public.profiles where id = auth.uid())
    and author_profile = auth.uid()
  );

-- ⚠️ Update and delete are the AUTHOR's only. Anyone in the company can read a
-- note; only the person who wrote it can change or remove it. Same instinct as
-- the immutable crew log — nobody edits somebody else's account of a day.
create policy office_notes_author_update on public.office_notes
  for update using (author_profile = auth.uid()) with check (author_profile = auth.uid());

create policy office_notes_author_delete on public.office_notes
  for delete using (author_profile = auth.uid());

comment on table public.office_notes is
  'Day-to-day observations from whoever runs the office — not tied to a job. Distinct from daily_logs, which is the crew''s account of a specific job and is immutable. See 037 header.';
