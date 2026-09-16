-- The way out — who asked for the play-by-play before it existed.
--
-- ⭐⭐ THE OFFER IS ON THE PAGE AND THE THING IT SELLS IS NOT BUILT YET. The
-- honest CTA is therefore not "buy" and not a button that goes nowhere — it is
-- "tell me when this is ready", which is a real answer to a real question and
-- the only one available today.
--
-- ⭐ It is also the number worth having BEFORE building it. Whether people want
-- the how badly enough to ask for it is the whole commercial thesis, and this
-- measures it for the cost of one column instead of the cost of building the
-- paid half and finding out.
alter table public.wayout_sessions
  add column if not exists wants_playbook timestamptz;

comment on column public.wayout_sessions.wants_playbook is
  'When they asked to be told the play-by-play was ready. Null means they did not.';
