-- Plan history — so a rebuild can always be undone.
--
-- 🔴🔴 A REBUILD WAS ONE CLICK AND IRREVERSIBLE, AND THAT IS THE SHAPE OF THING
-- THAT MAKES SOMEBODY AFRAID TO PRESS A BUTTON. Daniel rebuilt his plan around
-- a change of direction, wanted the previous one back, and there was nothing
-- holding it: "i cant bring back the plan to the kissemme plan."
--
-- ⚠️ THE FIRST ATTEMPT PARKED THE OLD MAP ON A THREAD ENTRY, and that was wrong
-- for a reason worth recording: the thread is something a person can empty. He
-- used "Take that back" twice, the entries went, and the only route home went
-- with them. A safety net that lives inside the thing it is protecting against
-- is not a safety net. It belongs on the session, where nothing in the
-- conversation can reach it.
--
-- ⭐ THREE, NOT ALL OF THEM. This is an undo, not an archive — somebody wants
-- the plan they had ten minutes ago, not the one from August. A cap also keeps
-- the row small: a map is 4–8KB and this column is read on every plan load.
--
-- 🔴 IT MUST NEVER REACH A PROMPT. The rule since 16 Sep is that a person's
-- ANSWERS are theirs and a MAP is ours — merging an old map into a generation
-- would launder every figure the model ever wrote into an established fact.
-- Nothing serialises the session wholesale: generateMap is handed `answers`
-- explicitly and askAboutPlan builds its payload field by field. Keep it that
-- way. This column is for restoring, never for reading back into a model.
--
-- ⚠️ Not covered by the entitlement guard, deliberately. Migration 050 already
-- allows a client to write `map` once the session is past 'draft'; a history of
-- maps that client wrote carries no entitlement the map itself does not.

alter table public.wayout_sessions
  add column if not exists map_history jsonb not null default '[]'::jsonb;

comment on column public.wayout_sessions.map_history is
  'Up to 3 previous maps, newest first, each {map, at, why}. Written when a '
  'rebuild replaces a plan so it can be restored. Never read into a prompt.';

-- ⚠️ A cap in the database as well as in the client. The client slices to three
-- on write; this is what stops a bug or a future caller growing the row without
-- anybody noticing, which is exactly how a jsonb column becomes a performance
-- problem nobody can explain.
alter table public.wayout_sessions
  drop constraint if exists wayout_sessions_map_history_capped;

alter table public.wayout_sessions
  add constraint wayout_sessions_map_history_capped
  check (jsonb_typeof(map_history) = 'array' and jsonb_array_length(map_history) <= 3);
