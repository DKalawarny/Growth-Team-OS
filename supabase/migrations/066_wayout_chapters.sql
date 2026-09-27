-- Unstuck Map — a second plan after the first one is done.
--
-- ⭐⭐ WHY. Daniel: "once they hit their plan there could be an advanced
-- section", and "what to do next to make this live longer". The product FINISHES
-- — that is its virtue and its commercial problem, because a plan that finishes
-- gives a subscription a 4–6 month lifetime. Today the page after the last move
-- records an outcome and then offers "Back to the plan", which is a dead end for
-- somebody who has just said they got where they were going.
--
-- ⚠️ A CHAPTER IS A NEW SESSION, NOT A MUTATED ONE. The first plan is a record of
-- what somebody was told and what happened, and overwriting it to save a row
-- would destroy the only evidence this product accumulates about whether its
-- advice works. It also makes the second plan worse: the whole reason chapter two
-- is better than chapter one is that it can read chapter one.
alter table wayout_sessions
  -- The session this one continues. Null for a first plan, which is almost all
  -- of them. ⚠️ ON DELETE SET NULL rather than CASCADE: losing the parent must
  -- orphan the chapter, never delete somebody's current plan.
  add column if not exists previous_session_id uuid
    references wayout_sessions(id) on delete set null,
  -- 1 for a first plan. Denormalised on purpose — the alternative is walking the
  -- chain on every read to answer "is this their third?", which the UI asks
  -- constantly and the chain answers slowly.
  add column if not exists chapter int not null default 1,
  -- Which outcome on the previous plan led here: landed | partly | no | changed.
  -- ⚠️ Copied onto the CHILD rather than read from the parent because it is the
  -- single most important input to the new plan, and a join that can silently
  -- return null would produce a chapter-two plan that reads like a chapter one.
  add column if not exists continues_from_outcome text;

-- ⚠️ Chapter must be positive and must agree with the link: a first chapter has
-- no parent, and anything beyond the first must have one. A row that breaks
-- either is the bug that produces a "second plan" with nothing to read.
alter table wayout_sessions
  drop constraint if exists wayout_sessions_chapter_agrees;
alter table wayout_sessions
  add constraint wayout_sessions_chapter_agrees check (
    chapter >= 1
    and (chapter = 1) = (previous_session_id is null)
  );

alter table wayout_sessions
  drop constraint if exists wayout_sessions_continues_from_outcome_valid;
alter table wayout_sessions
  add constraint wayout_sessions_continues_from_outcome_valid check (
    continues_from_outcome is null
    or continues_from_outcome in ('landed', 'partly', 'no', 'changed')
  );

-- Finding somebody's chain, and the one query the UI actually runs: has this
-- session already been continued? Partial because the overwhelming majority of
-- rows are chapter 1 with a null parent and do not belong in the index.
create index if not exists wayout_sessions_previous_idx
  on wayout_sessions (previous_session_id)
  where previous_session_id is not null;

comment on column wayout_sessions.previous_session_id is
  'The session this plan continues. Null for a first plan.';
comment on column wayout_sessions.chapter is
  '1 for a first plan. Denormalised from the previous_session_id chain.';
comment on column wayout_sessions.continues_from_outcome is
  'The outcome recorded on the previous plan that led to this one: landed | partly | no | changed.';
