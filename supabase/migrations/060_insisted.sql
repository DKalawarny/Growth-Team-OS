-- The options they chose for themselves (migration 060)
--
-- ⭐⭐ DANIEL: "I think we need to give more than one option and maybe have the
-- person select it and/or change it... I just don't want anyone coming back and
-- saying I lost everything because I went with what this app said."
--
-- ⚠️ THE MENU VERSION OF THAT IDEA WOULD GUT THE PRODUCT. Three equal options
-- is what somebody already had before they arrived; "which one is first" is the
-- entire thing being sold. So the plan still commits to an order — and the
-- options it CROSSED OFF become selectable. The person can say "actually, I
-- want that one", and the plan is rebuilt around their choice.
--
-- ⭐ That is better on both counts. Better product, because the alternatives
-- were always there and were previously only readable. And a better posture,
-- because the person made the call, on a page that showed them the reason it
-- had not been chosen — which is a different thing entirely from being handed
-- an instruction.
--
-- ⚠️ IT DOES NOT MAKE THE PLAN AGREE WITH THEM. The prompt honours the choice
-- and must still say plainly what it costs — a plan that says "good idea" to
-- everything is worth nothing, and this is exactly the moment somebody needs
-- the truth rather than compliance.
alter table public.wayout_sessions
  add column if not exists insisted jsonb not null default '[]'::jsonb;

comment on column public.wayout_sessions.insisted is
  'Options the person crossed back ON, by label. The plan is rebuilt to include them — honestly, not approvingly. See 060.';
