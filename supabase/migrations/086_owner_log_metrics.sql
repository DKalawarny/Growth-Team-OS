-- 7 Oct 2026: owner-defined daily numbers, on top of the universal four
-- (Daniel). Each company sets a short list of its own metrics (e.g. "Units
-- installed") that the crew reports per job; Solomon trends them too.
--   companies.log_metrics : [{ key, label }]  — what to ask
--   daily_logs.metrics    : { key: number }   — what the crew entered
alter table public.companies
  add column if not exists log_metrics jsonb not null default '[]'::jsonb;
alter table public.daily_logs
  add column if not exists metrics jsonb;
