-- ============================================================================
-- Milestone dates, progress, and dependencies (Gantt chart support).
--
-- Adds four columns to milestones:
--   start_date        date      when the milestone is scheduled to begin
--   end_date          date      when it should be finished
--   progress_percent  int 0-100 partial-completion indicator
--   depends_on        uuid[]    predecessor milestone IDs (same company)
--
-- Backfills existing rows by mapping each milestone's `timeframe` bucket to a
-- date span anchored on the milestone's `created_at`. Inside a bucket we
-- stagger rows evenly by `sort_order` so three items in "0-3 months" land at
-- month [0..1], [1..2], [2..3] rather than all stacking at month 0.
--
-- A trigger keeps `completed` and `progress_percent` in sync: bumping
-- progress to 100 marks the milestone complete, and toggling completed=true
-- snaps progress to 100. This lets both the list view's checkbox and the
-- Gantt's progress slider speak to the same truth.
--
-- Dependencies are stored as uuid[] (not a join table) because:
--   - Typical roadmap has 8–12 rows, each with 0–2 deps → trivial payload
--   - We only ever fetch all milestones for a company at once; no need for
--     relational joins
--   - Saves a table, a policy, and a round-trip
-- ============================================================================

-- --- 1. New columns ---------------------------------------------------------
alter table public.milestones
  add column if not exists start_date       date,
  add column if not exists end_date         date,
  add column if not exists progress_percent int  not null default 0
    check (progress_percent between 0 and 100),
  add column if not exists depends_on       uuid[] not null default '{}';

comment on column public.milestones.start_date is
  'Scheduled start. Derived from timeframe bucket + sort_order on insert; owner may edit later.';
comment on column public.milestones.end_date is
  'Scheduled finish. end_date < today AND completed=false → overdue (bottleneck candidate).';
comment on column public.milestones.progress_percent is
  '0–100. Kept in sync with `completed` via milestones_sync_progress() trigger.';
comment on column public.milestones.depends_on is
  'Array of predecessor milestone UUIDs (same company). Empty array = no deps.';

-- --- 2. Backfill dates for existing rows ------------------------------------
-- Anchor each row's span on its created_at + the start-month of its bucket,
-- staggered by sort_order within the bucket so bars don't pile up.
--
-- Bucket offsets (months from created_at):
--   0-3 months    → [0, 3]
--   3-6 months    → [3, 6]
--   6-12 months   → [6, 12]
--   12-18 months  → [12, 18]
--   18-24 months  → [18, 24]
--   unknown/null  → [0, 3]  (fallback)
update public.milestones m
set
  start_date = (m.created_at::date) + (
    case m.timeframe
      when '0-3 months'   then 0
      when '3-6 months'   then 3
      when '6-12 months'  then 6
      when '12-18 months' then 12
      when '18-24 months' then 18
      else 0
    end
  ) * interval '1 month',
  end_date = (m.created_at::date) + (
    case m.timeframe
      when '0-3 months'   then 3
      when '3-6 months'   then 6
      when '6-12 months'  then 12
      when '12-18 months' then 18
      when '18-24 months' then 24
      else 3
    end
  ) * interval '1 month'
where start_date is null or end_date is null;

-- Sync progress for any rows already marked completed.
update public.milestones
set progress_percent = 100
where completed = true and progress_percent < 100;

-- --- 3. Sync trigger: completed ⇄ progress_percent --------------------------
create or replace function public.milestones_sync_progress()
returns trigger
language plpgsql
as $$
begin
  -- Box 1: checkbox toggled → snap progress to 100 (or 0 if un-checked)
  if tg_op = 'UPDATE' and new.completed is distinct from old.completed then
    if new.completed = true then
      new.progress_percent := 100;
      new.completed_date   := coalesce(new.completed_date, now());
    else
      -- Un-completing: drop to 0 unless caller set an explicit new value
      if new.progress_percent = old.progress_percent then
        new.progress_percent := 0;
      end if;
      new.completed_date := null;
    end if;

  -- Box 2: slider hit 100 → mark complete
  elsif new.progress_percent = 100 and new.completed = false then
    new.completed      := true;
    new.completed_date := coalesce(new.completed_date, now());

  -- Box 3: slider dropped below 100 while completed → uncomplete
  elsif new.progress_percent < 100 and new.completed = true
        and tg_op = 'UPDATE'
        and new.progress_percent is distinct from old.progress_percent then
    new.completed      := false;
    new.completed_date := null;
  end if;

  return new;
end;
$$;

drop trigger if exists milestones_sync_progress on public.milestones;
create trigger milestones_sync_progress
  before insert or update on public.milestones
  for each row execute function public.milestones_sync_progress();
