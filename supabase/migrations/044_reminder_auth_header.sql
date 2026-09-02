-- ============================================================================
-- 044 — the scheduled call needs a gateway header too
--
-- 043 posted to the function with only x-reminder-secret and came back 401
-- UNAUTHORIZED_NO_AUTH_HEADER. Supabase's function gateway checks for an
-- Authorization header BEFORE the function body runs, so our own secret never
-- got looked at.
--
-- ⚠️ The anon key is not a secret — it ships in the browser bundle on every
-- page load. It is the gateway's doorman, not the lock. The real check is
-- still x-reminder-secret, which lives only in the database and is unreadable
-- from any client.
--
-- ⭐ Worth noting how this was caught: net.http_post returns a request id, and
-- net._http_response holds the reply. Firing it once by hand and reading the
-- response is the only way to know a scheduled job works — "the cron row
-- exists" proves nothing about whether the call succeeds.
-- ============================================================================

insert into public.internal_secrets (key, value)
values ('anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmaGR1ZXdiYW1ubW9pa3NxZ2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzg3MTYsImV4cCI6MjA5MTk1NDcxNn0.RcCKtb5BvLmhJ76RW_DJOqBxfU4yDR1-EO7sE9rqJcw')
on conflict (key) do update set value = excluded.value;

select cron.unschedule('daily-log-reminders')
where exists (select 1 from cron.job where jobname = 'daily-log-reminders');

select cron.schedule(
  'daily-log-reminders',
  '0 15 * * *',
  $$
  select net.http_post(
    url     := (select value from public.internal_secrets where key = 'functions_base_url') || '/log-reminders',
    headers := jsonb_build_object(
      'Content-Type',      'application/json',
      'Authorization',     'Bearer ' || (select value from public.internal_secrets where key = 'anon_key'),
      'x-reminder-secret', (select value from public.internal_secrets where key = 'log_reminder')
    ),
    body    := '{}'::jsonb
  );
  $$
);
