-- Unstuck Map: where people come from and how far they get (18 Oct 2026).
-- Run: supabase db query --linked -f scripts/sql/unstuck-funnel.sql
-- ⭐ The one number to watch: out of every 100 people who start, how many make
-- a plan, and (once payments are live) how many pay. Test accounts excluded.
-- On the INVITE LINKS row: started = joined from a link, last column = link opens.
with real as (
  select s.* from public.wayout_sessions s
  join auth.users u on u.id = s.user_id
  where u.email not like '%@example.com' and u.email not like '%@example.invalid'
    and u.email not like '%@resend.dev'
)
select
  coalesce(source->>'utm_source', source->>'referrer', 'direct or unknown') as came_from,
  count(*)                                         as started,
  count(*) filter (where map is not null)          as made_a_plan,
  round(100.0 * count(*) filter (where map is not null) / nullif(count(*), 0)) as plan_pct,
  count(*) filter (where created_at > now() - interval '30 days') as started_last_30_days
from real
group by 1
union all
select 'INVITE LINKS (all)', 
  (select count(*) from public.wayout_referrals),
  (select count(*) from public.wayout_referrals r where exists (select 1 from public.wayout_sessions s where s.user_id = r.friend_id and s.map is not null)),
  null,
  (select coalesce(sum(opened), 0) from public.wayout_invites)
order by started desc;
