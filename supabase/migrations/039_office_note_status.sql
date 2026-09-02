-- ============================================================================
-- 039 — office notes are really a to-do list
--
-- Daniel, after using it for an hour: "this should have check marks showing if
-- it's completed, working on, etc."
--
-- ⭐ He is describing what the feature turned out to be. The first two notes he
-- ever wrote were "need a new saw" and "job starts on test next week" — neither
-- is an observation, both are things to do. It was built as an observation
-- stream and used as a task list within a day, which is the most reliable kind
-- of design feedback there is.
--
-- Three states rather than a checkbox, because "working on it" is a real answer
-- and a binary forces it into the wrong one.
--
-- ⚠️ Done notes are NOT hidden and NOT deleted. A note that got done is still
-- the record that it needed doing — "need a new saw" ticked off three times in
-- a quarter says something a disappearing checkbox would erase. They stay,
-- greyed, and Solomon still reads them.
-- ============================================================================

alter table public.office_notes
  add column if not exists status text not null default 'open'
    check (status in ('open', 'doing', 'done')),
  add column if not exists done_at timestamptz;

create index if not exists office_notes_open_idx
  on public.office_notes (company_id, status, created_at desc)
  where status <> 'done';

comment on column public.office_notes.status is
  'open | doing | done. Done notes stay visible and are still read by Solomon — a note that got done is the record that it needed doing.';
