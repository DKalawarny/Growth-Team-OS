-- ============================================================================
-- Let a paid session actually keep its plan (migration 049)
--
-- 🔴 THE BUG THIS FIXES WOULD HAVE BROKEN THE VERY FIRST REAL RUN.
--
-- Migration 046 locked `map` against the client — "the map is generated, not
-- submitted" — to stop someone writing themselves a plan they had not paid for.
-- Correct intent, wrong mechanism: the generation happens IN THE BROWSER by
-- design (it reuses the person's own session, RLS and spend caps, the same
-- architecture as Solomon running tools), so the client is exactly who writes
-- the result. The guard therefore rejected every legitimate save too, and a
-- generated map could never be stored by anyone. Nobody had generated one yet,
-- so nothing had failed out loud.
--
-- ⚠️ It was also invisible in review: Plan.jsx carried a confident comment
-- saying the write "goes through the same guard", which was true and was the
-- problem. A comment asserting a thing works is not the thing working.
--
-- The real rule was never "the client may not write it". It is "only a session
-- that has been paid for may have one" — so that is what is enforced now. A
-- client writing its own map into a session it has already paid for gains
-- nothing; a client writing one into an unpaid session still cannot.
-- ============================================================================

create or replace function public.wayout_guard_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    return new;                       -- service role: the payment webhook
  end if;

  if new.status = 'paid' and old.status <> 'paid' then
    raise exception 'wayout: payment status is set by the payment webhook, not the client';
  end if;

  if new.paid_at is distinct from old.paid_at then
    raise exception 'wayout: paid_at is set by the payment webhook, not the client';
  end if;

  -- ⭐ The paywall lives HERE, on the entitlement, not on the column. A paid
  -- session may store the plan it paid for; an unpaid one may not, whatever the
  -- browser sends.
  if new.map is distinct from old.map and new.status <> 'paid' then
    raise exception 'wayout: a plan belongs to a paid session';
  end if;

  return new;
end;
$$;

-- Same correction for the play-by-play, before it can bite the same way.
create or replace function public.wayout_playbook_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_paid boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select (s.status = 'paid') into v_paid
    from public.wayout_sessions s
   where s.id = new.session_id;

  if new.play is not null and not coalesce(v_paid, false) then
    raise exception 'wayout: a play-by-play belongs to a paid session';
  end if;

  return new;
end;
$$;
