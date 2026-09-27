-- What the free diagnostic is actually telling people, and what they tell it.
--
-- ⭐⭐ THIS IS THE ONLY PLACE THE PRODUCT LEARNS ANYTHING ABOUT STRANGERS. The
-- map itself is scoped to the person and nothing aggregates it, deliberately.
-- `wayout_diagnostics` holds six enum answers, a country and a free line, with
-- nothing in it that identifies anybody — which is exactly why it is safe to
-- look at, and why it is worth looking at often.
--
-- 🔴 THE NUMBER TO WATCH IS THE SPREAD ACROSS PATHS. The rules are a LADDER —
-- first check that fires wins — so a badly ordered ladder does not fail loudly,
-- it just answers the same thing for everybody. A diagnostic that names one path
-- for most people is not diagnosing, it is guessing with confidence, and the
-- whole promise of the result screen is "why the other three do not fit".
-- ⚠️ As of 27 Sep: 9 of 10 land on cut-delegate. Almost certainly test traffic —
-- but it is the shape a broken ladder makes, so it is the thing to re-check once
-- real people arrive rather than after somebody complains.

-- 1. The spread. Anything above roughly 50% on one path deserves a look at the
--    order of the checks in choosePath().
select
  path,
  count(*)                                                       as people,
  round(100.0 * count(*) / sum(count(*)) over (), 1)             as pct,
  count(*) filter (where answers->>'note' is not null)           as wrote_something,
  min(created_at)::date                                          as first_seen,
  max(created_at)::date                                          as last_seen
from wayout_diagnostics
group by path
order by people desc;

-- 2. Where they are. Decides which crisis numbers are real, and which half of
--    the world's personal-finance advice even applies to them.
select coalesce(answers->>'region', '(not given)') as country, count(*)
from wayout_diagnostics group by 1 order by 2 desc;

-- 3. What they are actually after, which is the marketing answer as much as the
--    product one — "more time" and "more money" are different products.
select g.goal, count(*)
from wayout_diagnostics d
cross join lateral jsonb_array_elements_text(
  case when jsonb_typeof(d.answers->'goalType') = 'array'
       then d.answers->'goalType' else '[]'::jsonb end) as g(goal)
group by 1 order by 2 desc;

-- 4. ⭐ THE MOST VALUABLE COLUMN IN THE TABLE: what people typed in their own
--    words. Every other field is one of our labels. Read these before writing
--    another situation page — they are the questions real arrivals actually ask.
select created_at::date, path, answers->>'note' as in_their_words
from wayout_diagnostics
where answers->>'note' is not null
order by created_at desc
limit 40;

-- ── HOW TO RUN IT ───────────────────────────────────────────────────────────
--   supabase db query --linked -f supabase/maintenance/diagnostic-signal.sql
