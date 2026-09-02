-- ============================================================================
-- 040 — an office note can point at a job
--
-- Audit, 2 Sep. Daniel's second-ever note was "job starts on test next week" —
-- which is about a job and had no way to say which. The list and the jobs sat
-- side by side with nothing joining them.
--
-- ⚠️ Nullable and staying that way. Most notes genuinely are not about one job
-- ("need a new saw"), and forcing a job onto every note would either produce
-- wrong links or stop people writing them. A note with no job is the normal
-- case, not an incomplete one.
-- ============================================================================

alter table public.office_notes
  add column if not exists work_order_id uuid references public.work_orders(id) on delete set null;

create index if not exists office_notes_job_idx
  on public.office_notes (work_order_id) where work_order_id is not null;

comment on column public.office_notes.work_order_id is
  'Optional. SET NULL on job delete — the note outlives the job, same as work_orders.created_by in 033.';
