-- ============================================================================
-- 043 — actually run the reminders, once a day
--
-- pg_cron fires; pg_net makes the HTTP call; the function checks the secret
-- from 042 and sends the links.
--
-- ⚠️ 15:00 UTC = 8am Pacific. Deliberately MORNING, not end of day: the point
-- is that the link is sitting in the inbox when the foreman finishes, not that
-- it lands while he is still on a roof and gets forgotten by six.
--
-- ⚠️ The URL and the secret are read from the database at call time rather than
-- written into this file. A secret in a migration is a secret in git.
--
-- ⚠️ Safe to run twice. The function skips anyone who already wrote today, so a
-- double fire sends nothing extra. That matters for something running
-- unattended: the failure everybody notices is the one that nags.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

insert into public.internal_secrets (key, value)
values ('functions_base_url', 'https://ufhduewbamnmoiksqgfq.supabase.co/functions/v1')
on conflict (key) do nothing;

-- Drop first so re-running this migration re-points rather than duplicating.
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
      'x-reminder-secret', (select value from public.internal_secrets where key = 'log_reminder')
    ),
    body    := '{}'::jsonb
  );
  $$
);
