-- ⭐⭐ THE RUNNING THREAD THAT BELONGS TO THE PLAN, NOT TO A MOVE.
--
-- Daniel, 28 Sep: "after that new form is done it acts the same but also has a
-- chat part of it — thought is to have people keep it as a guide, a way to
-- retain people."
--
-- 🔴 THERE WAS ALREADY A CHAT AND IT DIED WITH THE MOVE. `askAboutMove` stores
-- its thread on the playbook row, capped at twelve, scoped to one move. It
-- produces the most specific writing in the product — and when the move is
-- ticked, the conversation is over.
--
-- ⭐⭐ WHAT WAS ACTUALLY MISSING IS SOMEWHERE TO SAY WHAT CHANGED. The buyer
-- pulls out. A job is offered. The rental sits empty two months. Today the only
-- ways to tell this product are a move note and the single rebuild — neither of
-- which is a conversation, and both of which arrive after the plan is already
-- wrong. This column is that surface.
--
-- ⚠️ DELIBERATELY CLIENT-WRITABLE, unlike `map`. It is the person's own
-- conversation about their own plan, scoped by the same RLS as the rest of the
-- row (auth.uid() = user_id, migration 046). Nothing about entitlement is
-- decided here, so the guard trigger has no opinion on it.
--
-- ⚠️ PER SESSION, WHICH MEANS PER CHAPTER. A new chapter is a new situation and
-- starts a fresh thread — carrying the last one forward would mean answering
-- this quarter's question with last quarter's context, which is the same
-- provenance mistake as inheriting the old map.
alter table public.wayout_sessions
  add column if not exists plan_thread jsonb not null default '[]'::jsonb;

comment on column public.wayout_sessions.plan_thread is
  'The running conversation about this plan: [{role, content, at}]. Client-writable, RLS-scoped to the owner. Per chapter, never inherited.';
