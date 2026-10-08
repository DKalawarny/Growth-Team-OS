-- 7 Oct 2026: the daily log's reason for being — cost + schedule signals
-- Solomon can trend (Daniel, research-backed). Universal across trades: every
-- job has a schedule and costs, so no industry-specific units. Per-job (each
-- daily_logs row is one job-day). Hours already exist on the row.
alter table public.daily_logs
  add column if not exists schedule_status text,          -- 'ahead' | 'on' | 'behind'
  add column if not exists percent_complete smallint,     -- 0-100, roughly how far along the job is
  add column if not exists unplanned_cost boolean,        -- extra material / rework / equipment / standby today
  add column if not exists unplanned_cost_note text;      -- what the unplanned cost was
