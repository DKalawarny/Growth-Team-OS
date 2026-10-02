-- ⭐ One alert email per account per day when it reaches its Unstuck Map
-- spending cap (claude edge function). Daniel, 2 Oct: no top-ups — a genuine
-- user should never hit the cap, so each case is worth a person looking at.
-- Written only by the service role; RLS on with no policies, so no client can
-- read or write it.
create table if not exists public.wayout_cap_alerts (
  company_id uuid not null,
  day        date not null default (now() at time zone 'utc')::date,
  kind       text not null,
  spent_usd  numeric(10, 2),
  created_at timestamptz not null default now(),
  primary key (company_id, day)
);
alter table public.wayout_cap_alerts enable row level security;
