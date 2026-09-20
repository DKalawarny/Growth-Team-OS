-- Did it actually work? (migration 057)
--
-- ⭐⭐ THIS IS THE ONLY NUMBER THAT TELLS DANIEL WHETHER THE BUSINESS IS REAL.
-- Everything else measured so far is interest: diagnostics started, intakes
-- finished, plans generated, play-by-plays opened. All of it is people
-- BELIEVING it might work. None of it is evidence that it did.
--
-- Somebody who has worked three moves and says where they landed is the first
-- honest signal this product has ever been able to produce — and the negative
-- answers are worth more than the positive ones, because a plan that gets
-- followed and does not land is a fixable problem and nobody has ever been
-- able to see it.
--
-- ⚠️ ASKED, NEVER INFERRED. It would be easy to treat "all three ticked" as
-- success and count it. Ticking three boxes is not the same as being out, and
-- a product that congratulates somebody who is still stuck has stopped
-- listening — which is the one failure this thing cannot survive.
create type public.wayout_outcome as enum (
  'landed',      -- they are where they were trying to get to
  'partly',      -- better than before, not there
  'no',          -- did the work, it did not land
  'changed'      -- they want something different now
);

alter table public.wayout_sessions
  add column if not exists outcome     public.wayout_outcome,
  add column if not exists outcome_at  timestamptz,
  -- ⚠️ Free text, and it is the part worth reading. The enum is countable; the
  -- sentence is the only place somebody can say the thing the four options do
  -- not cover, which is usually the thing that matters.
  add column if not exists outcome_note text;

comment on column public.wayout_sessions.outcome is
  'What the person said happened after working the plan. Their answer, never inferred from ticked boxes — see 057.';
