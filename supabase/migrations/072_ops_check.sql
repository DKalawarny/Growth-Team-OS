-- ⭐ ops-check (3 Oct 2026): alerts when a site is down or the AI is failing.
-- ops_events: written by the claude function when the AI provider fails —
--   status and the provider's short message only, never anybody's words.
-- ops_alerts: one email per problem per 6 hours.
-- Both service-role only (RLS on, no policies).
create table if not exists public.ops_events (
  id bigserial primary key,
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists ops_events_created on public.ops_events (created_at desc);
alter table public.ops_events enable row level security;

create table if not exists public.ops_alerts (
  key text primary key,
  title text,
  last_sent timestamptz not null default now()
);
alter table public.ops_alerts enable row level security;

insert into public.internal_secrets (key, value)
values ('ops_check', md5(random()::text || clock_timestamp()::text) || md5(random()::text))
on conflict (key) do nothing;

select cron.unschedule('ops-check') where exists (select 1 from cron.job where jobname = 'ops-check');
select cron.schedule('ops-check', '*/15 * * * *', $$
  select net.http_post(
    url     := (select value from public.internal_secrets where key = 'functions_base_url') || '/ops-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ops-secret', (select value from public.internal_secrets where key = 'ops_check')
    ),
    body    := '{}'::jsonb
  );
$$);

-- Old events are not kept beyond a week.
select cron.unschedule('ops-events-prune') where exists (select 1 from cron.job where jobname = 'ops-events-prune');
select cron.schedule('ops-events-prune', '0 4 * * *', $$ delete from public.ops_events where created_at < now() - interval '7 days' $$);
