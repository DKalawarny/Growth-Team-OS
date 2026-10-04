-- ⭐ Where people came from (utm tags + referring domain, nothing personal),
-- so the funnel can be measured by source in our own database. 3 Oct 2026.
alter table public.wayout_diagnostics add column if not exists source jsonb;
alter table public.wayout_sessions   add column if not exists source jsonb;

-- Keep the anonymous insert bounded: source must be small too.
drop policy if exists "wayout: anyone may record a diagnostic" on public.wayout_diagnostics;
create policy "wayout: anyone may record a diagnostic" on public.wayout_diagnostics
  for insert with check (
    (user_id is null or user_id = auth.uid())
    and pg_column_size(answers) < 8192
    and (source is null or pg_column_size(source) < 1024)
    and (path is null or length(path) < 64)
  );

-- For Daniel: by source, how many did the free check, how many finished a plan.
create or replace view public.wayout_funnel_by_source as
with d as (
  select coalesce(source->>'utm_source', source->>'referrer', 'direct') as src, count(*) as free_checks
  from public.wayout_diagnostics group by 1
), s as (
  select coalesce(source->>'utm_source', source->>'referrer', 'direct') as src,
         count(*) filter (where status <> 'draft') as finished_plans,
         count(*) filter (where status = 'paid') as paid
  from public.wayout_sessions group by 1
)
select coalesce(d.src, s.src) as source, coalesce(free_checks, 0) as free_checks,
       coalesce(finished_plans, 0) as finished_plans, coalesce(paid, 0) as paid
from d full join s on s.src = d.src
order by free_checks desc;
revoke all on public.wayout_funnel_by_source from anon, authenticated;
