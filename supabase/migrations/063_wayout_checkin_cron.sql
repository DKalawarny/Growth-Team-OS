-- Run the check-in once a day.
--
-- ⚠️ DAILY, NOT WEEKLY, AND THE VIEW DECIDES WHO IS DUE. A weekly job would
-- check everybody in on the same morning regardless of when they last did
-- something; running daily against `wayout_checkin_due` means each person is
-- chased on their OWN seven-day quiet period. It also means a day the job fails
-- costs one day, not one week.
--
-- ⭐ The secret is read out of internal_secrets inside the command rather than
-- written into the schedule — same as daily-log-reminders. internal_secrets has
-- RLS on with no policies, so anon and authenticated cannot read it at all.
insert into public.internal_secrets (key, value)
values ('wayout_checkin', gen_random_uuid()::text)
on conflict (key) do nothing;

select cron.unschedule('wayout-checkin') where exists (
  select 1 from cron.job where jobname = 'wayout-checkin'
);

select cron.schedule(
  'wayout-checkin',
  '0 17 * * *',
  $$
  select net.http_post(
    url     := (select value from public.internal_secrets where key = 'functions_base_url') || '/wayout-checkin',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-checkin-secret', (select value from public.internal_secrets where key = 'wayout_checkin')
    ),
    body    := '{}'::jsonb
  );
  $$
);
