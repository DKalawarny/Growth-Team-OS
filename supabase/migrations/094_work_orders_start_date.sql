-- A task can now run over a span: it starts on one day and is due on another.
-- due_date stays the end; this adds the start. Optional, so every existing
-- task and every single-day task is unchanged.
alter table work_orders add column if not exists start_date date;
