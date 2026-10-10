-- Marks a task that was sent from Daily logs as a one-off job (a single day
-- job, a one-off clean, a set of plans), so the office can look back on what
-- was sent, to whom, and with which files. A flag, not a new kind of record:
-- everything else about the task is unchanged.
alter table work_orders add column if not exists one_off boolean not null default false;
