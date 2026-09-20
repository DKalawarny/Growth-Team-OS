-- What we asked about this move, and what they said (migration 058)
--
-- ⭐⭐ DANIEL'S CALL, AND IT CHANGES WHAT THE PAID HALF IS: "this is where we
-- need to start asking more detail. This is value added to make this as
-- accurate as possible, not just unlocking the answers."
--
-- 🔴 A PAID THING THAT ONLY UNLOCKS IS A PAYWALL. A paid thing that ASKS is a
-- different product — and it is the honest one, because the intake asked about
-- a LIFE and the play-by-play is about one MOVE. The questions that decide
-- whether the advice is right for that move could not have been asked earlier:
-- they depend on which move the plan chose, which did not exist yet.
--
-- ⭐ The failure that proved it: his own move one was "get the apps to a place
-- where a stranger can pay you". His answer was that for software you prove it
-- first — get people using it, then charge. If it had asked whether anybody
-- can use the apps today, it would never have written that week.
--
-- ⚠️ ON THE PLAYBOOK ROW, beside the play the answers produced. These are
-- answers about THIS move at THIS moment — "nobody can use it yet" stops being
-- true the week after it is fixed, and folding them back into the session's
-- intake would let a stale fact about one move quietly reshape every future
-- plan.
alter table public.wayout_playbooks
  add column if not exists asked jsonb;

comment on column public.wayout_playbooks.asked is
  'The move-specific questions and their answers: {questions:[...], answers:{...}}. Scoped to this move on purpose — see 058.';
