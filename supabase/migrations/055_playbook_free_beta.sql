-- The play-by-play is free while it is being built (migration 055)
--
-- 🔴 THE GUARD FROM 048/049 REQUIRES `status = 'paid'` BEFORE A PLAY CAN BE
-- STORED, AND NOTHING CAN EVER BE PAID: `WAYOUT_PAYMENTS_LIVE` is false, there
-- is no live Stripe price, and `paid` is writable only by the payment webhook.
-- So the paid half of this product is currently unreachable by construction —
-- not gated, impossible.
--
-- ⭐ The page already says the true thing — "Free while this is being built" —
-- so this migration makes the database agree with the promise on the screen
-- rather than the other way round.
--
-- ⚠️ WHAT IS NOT RELAXED, AND MUST NOT BE: `paid` and `paid_at` are still the
-- webhook's alone (049), and a play still requires a session that has finished
-- the intake. Somebody cannot get a play-by-play without answering the
-- questions; they can only get one without paying, which is the current offer.
--
-- 🔴 TO CLOSE IT AGAIN WHEN PAYMENTS GO LIVE: change the one condition below
-- back to `v_status = 'paid'`. That is the whole change, and it belongs in the
-- same commit that flips WAYOUT_PAYMENTS_LIVE — a paywall that goes up while
-- the button still says free is worse than either state on its own.
create or replace function public.wayout_playbook_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_status public.wayout_status;
begin
  if auth.uid() is null then
    return new;                       -- service role: the payment webhook
  end if;

  select s.status into v_status
    from public.wayout_sessions s
   where s.id = new.session_id
     and s.user_id = auth.uid();      -- and it has to be theirs

  if v_status is null then
    raise exception 'wayout: no such session';
  end if;

  -- FREE BETA: finishing the intake is the entitlement. Restore to
  -- `v_status <> 'paid'` on the day payments go live.
  if new.play is not null and v_status = 'draft' then
    raise exception 'wayout: a play-by-play belongs to a finished intake';
  end if;

  return new;
end;
$$;
