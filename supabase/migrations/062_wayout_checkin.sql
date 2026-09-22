-- The check-in. What the subscription actually is.
--
-- ⭐⭐ THE PROBLEM IT SOLVES, AND IT IS A PRICING PROBLEM BEFORE IT IS A FEATURE.
-- The gates are deliberately long — "the sale has closed", "three people have
-- paid you", "two full months on days only". Weeks to months apart. If the
-- subscription's job is UNLOCKING THE NEXT MOVE, the person pays and has
-- nothing to open for eight weeks, and churns by week three.
--
-- ⭐⭐ So the subscription's job is not the unlock, it is KEEPING UP WITH THEM
-- between gates. That turns the long gaps from dead weeks into the product, and
-- it is the only thing that makes "it walks the move with you" true — before
-- this, nothing in the way out ever contacted anybody.
--
-- ⚠️ IT SENDS A LINK. It does not decide, generate, or write to the plan. If it
-- fails silently for a week the worst case is that nobody was nudged and the
-- plan is still there, unchanged. That is the right blast radius for something
-- running unattended on a schedule — same rule as log-reminders.
alter table public.wayout_sessions
  add column if not exists checkin_at        timestamptz,
  add column if not exists checkin_count     integer not null default 0,
  -- ⚠️ Opt-out is its OWN column and governs ONLY this. A single switch that
  -- silently unsubscribes somebody from everything is a bug we already have
  -- elsewhere and are not repeating here.
  add column if not exists checkin_opted_out boolean not null default false;

comment on column public.wayout_sessions.checkin_at is
  'When we last checked in. Null means never.';
comment on column public.wayout_sessions.checkin_opted_out is
  'Governs check-ins ONLY. Never a master switch for other mail.';

-- ⭐ Who is due. A view rather than logic in the function, so the rule is
-- readable, testable from SQL, and cannot drift between the two.
--
-- ⚠️ "Due" deliberately EXCLUDES anyone who has just done something. Being
-- chased about a thing you did yesterday is how people learn to ignore mail.
create or replace view public.wayout_checkin_due as
select
  s.id                as session_id,
  s.user_id,
  u.email,
  s.answers ->> 'name' as name,
  s.checkin_count,
  greatest(
    coalesce(s.checkin_at,   'epoch'::timestamptz),
    coalesce(s.updated_at,   'epoch'::timestamptz)
  )                   as last_touch
from public.wayout_sessions s
join auth.users u on u.id = s.user_id
where s.status = 'complete'
  and s.checkin_opted_out = false
  and u.email is not null
  and s.map is not null
  -- Nothing has happened for a week: no tick, no note, no ask, no check-in.
  and greatest(
        coalesce(s.checkin_at, 'epoch'::timestamptz),
        coalesce(s.updated_at, 'epoch'::timestamptz)
      ) < now() - interval '7 days'
  -- ⚠️ STOPS ITSELF. Six unanswered check-ins is somebody telling us something,
  -- and mail that never stops is how a sender earns a spam complaint.
  and s.checkin_count < 6;

comment on view public.wayout_checkin_due is
  'Sessions quiet for 7 days, not opted out, fewer than 6 check-ins sent.';
