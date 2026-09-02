-- ============================================================================
-- 036 — the PM's layer on a daily log
--
-- Daniel: "a section where the PM makes notes and can send off the daily
-- foreman form or have it auto send, but PM can review as well, and the
-- uploaded form stores so Solomon can read it."
--
-- ⚠️ THE FOREMAN'S WORDS ARE IMMUTABLE. The PM adds a note ALONGSIDE the log;
-- nothing here lets anyone edit what_happened or blockers. That is the whole
-- point of the table: it is the one input in BUSINESS_CONTEXT the owner did
-- not write. A PM who can revise a log before it reaches Solomon turns ground
-- truth back into a filtered report, which is exactly what the owner already
-- has — people telling him what they think he wants to hear.
--
-- ⚠️ AND REVIEW IS NOT A GATE. The log is readable by Solomon the moment it is
-- submitted, reviewed or not. "Auto-send" is therefore not a setting: the data
-- is already there, and review is a pass over it rather than a queue in front
-- of it. If review ever became a prerequisite, an unreviewed week would look
-- identical to a week where nothing went wrong — silence would be mistaken for
-- calm, which is the failure this whole feature exists to prevent.
--
-- Only the foreman may correct his own log, via the upsert in staff-portal.
-- ============================================================================

alter table public.daily_logs
  add column if not exists pm_note     text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists daily_logs_unreviewed_idx
  on public.daily_logs (company_id, log_date desc)
  where reviewed_at is null;

comment on column public.daily_logs.pm_note is
  'The PM/office note ADDED ALONGSIDE the crew account. Never overwrites what_happened or blockers — see 036 header.';
comment on column public.daily_logs.reviewed_at is
  'When someone in the office read it. Purely informational: Solomon reads the log whether or not this is set, so an unreviewed backlog can never hide a problem.';
