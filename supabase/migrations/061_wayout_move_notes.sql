-- Their own words, attached to one move.
--
-- ⭐⭐ Daniel: "each section should have a description box beside it to change
-- or add things to that section, its more interactive." Two different things
-- live in one box, and the difference is the whole point:
--   PIN IT ON  — their note sits beside ours. The plan does not change.
--   REDO       — the note goes into the next generation and the plan does.
-- Both store the same text here; only the second triggers a rebuild.
--
-- ⚠️ Shaped { "1": "...", "2": "..." } — keyed by move_order, which is 1-based
-- everywhere in this product. Not an array: moves are addressed by their order
-- and a sparse array would invite the off-by-one that already cost a day.
--
-- ⭐ It rides in the generation payload as free text, which means a figure they
-- type in here counts as THEIRS for the invention guards — correctly, because
-- they typed it. That falls out of `freeText(answers)` and needs no new rule.
alter table public.wayout_sessions
  add column if not exists move_notes jsonb not null default '{}'::jsonb;

comment on column public.wayout_sessions.move_notes is
  'Their own words against a move, keyed by 1-based move_order.';
