-- ============================================================================
-- 042 — daily log reminders, on the days a person actually works
--
-- Daniel: "can we add a schedule to send these out — a foreman might not need
-- one every day... maybe he's sometimes not the foreman or has days off."
--
-- ⭐ THE GAP THIS ALSO CLOSES. Adding a crew member already worked, and the
-- welcome email carried NO LINK. A magic link was only ever minted when a task
-- was assigned, so an owner could add his foreman and have given him no way to
-- write anything. You could turn the feature on for a person who could not
-- reach it.
--
-- ⚠️ DAYS OF THE WEEK, NOT A ROTA. A rota needs maintaining and goes stale the
-- first week someone swaps a shift; a nudge on the wrong day costs nothing and
-- is ignored. This is a reminder schedule, not a record of who is working — it
-- must never be read as one, and nothing else should ever consult it.
--
-- log_days uses ISO weekdays: 1 = Monday … 7 = Sunday. Default Mon–Fri.
-- ============================================================================

alter table public.staff_members
  add column if not exists log_enabled boolean not null default true,
  add column if not exists log_days    int[]   not null default '{1,2,3,4,5}';

comment on column public.staff_members.log_days is
  'ISO weekdays (1=Mon..7=Sun) to send a daily-log nudge. A reminder schedule, NOT a record of who works when — see 042.';

-- ── The shared secret the scheduler uses to call the reminder function ──────
-- ⚠️ Deliberately a table rather than a value in this file. A secret committed
-- to git is not a secret, and this way it is generated once, in the database,
-- and never leaves it.
create table if not exists public.internal_secrets (
  key        text primary key,
  value      text not null,
  created_at timestamptz not null default now()
);

alter table public.internal_secrets enable row level security;
-- No policies at all: unreachable from the browser under any key. Only the
-- service role (edge functions) and the scheduler can read it.
revoke all on public.internal_secrets from anon, authenticated;

insert into public.internal_secrets (key, value)
-- Two uuids with the hyphens stripped: 64 hex chars of randomness, and
-- gen_random_uuid() is core rather than needing pgcrypto enabled.
values ('log_reminder', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;
