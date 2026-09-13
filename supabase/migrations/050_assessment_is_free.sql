-- ============================================================================
-- The assessment is free; the play-by-play is what's paid for (migration 050)
--
-- ⭐⭐ DANIEL'S CALL: "just being straight, first page, no bait and switch —
-- get your assessment and then pay for the plan, the play by play to get there."
--
-- 🔴 THE OLD SHAPE WAS UNDEFENDABLE AND WE HAD ALREADY WRITTEN THE PROMISE WE
-- COULDN'T KEEP. Four screens said "nothing to buy until you've seen your plan"
-- while the flow was finish → paywall → pay → generate. Anyone who suspected a
-- bait-and-switch and then met one had been proved right about us, and there is
-- no copy that recovers from that.
--
-- ⭐ It is also the better business. The map is the PROOF, and proof given away
-- buys more than proof sold — nobody can fear an ambush in a flow where they
-- already have the answer before money is mentioned. The money moves to where
-- the recurring value actually is: how to do the thing, for the move they are
-- standing on.
--
-- So: `complete` may hold a map. `paid` is still required for a play-by-play.
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

  -- Payment status is still the webhook's alone. That has not changed and must
  -- not: it is what a play-by-play is gated on.
  if new.status = 'paid' and old.status <> 'paid' then
    raise exception 'wayout: payment status is set by the payment webhook, not the client';
  end if;

  if new.paid_at is distinct from old.paid_at then
    raise exception 'wayout: paid_at is set by the payment webhook, not the client';
  end if;

  -- ⭐ A finished assessment may keep its map. The only thing still refused is
  -- a map on a session that has not answered the questions — which is not a
  -- paywall, it is just coherence.
  if new.map is distinct from old.map and new.status = 'draft' then
    raise exception 'wayout: finish the questions before there is a plan';
  end if;

  return new;
end;
$$;
