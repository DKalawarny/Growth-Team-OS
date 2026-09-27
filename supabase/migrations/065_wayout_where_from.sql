-- Where the people arriving are, and which way they came.
--
-- ⭐⭐ Daniel, 26 Sep: "we should track that for marketing purposes." The data
-- was already being collected and there was nowhere to read it — the diagnostic
-- stores a country, the intake stores a written location, and answering "who is
-- finding this" meant hand-writing JSON queries against two tables.
--
-- ⚠️ A VIEW, NOT A NEW TABLE. Nothing here is collected that was not already
-- collected; this only makes it readable. A tracking table would be new data
-- about people who came to type their debts into a form, and that is a bigger
-- ask than a question about marketing deserves.
--
-- ⚠️ AND NOTHING PERSONAL CROSSES INTO IT. No email, no name, no note, no
-- answers — country, climate, which path, and the date. Enough to say where
-- people are coming from and nothing that says who they are.
create or replace view public.wayout_where_from as
select
  'diagnostic'                       as source,
  d.answers ->> 'region'             as country,
  d.answers ->> 'climate'            as climate,
  d.path                             as path,
  (d.answers ->> 'note') is not null  as wrote_something,
  d.user_id is not null               as had_account,
  d.created_at::date                 as day
from public.wayout_diagnostics d
union all
select
  'full intake'                      as source,
  s.answers ->> 'region'             as country,
  null                               as climate,
  null                               as path,
  true                               as wrote_something,
  true                               as had_account,
  s.created_at::date                 as day
from public.wayout_sessions s;

comment on view public.wayout_where_from is
  'Where arrivals are and how far they got. No personal data crosses into it.';

-- ⚠️ The written location is FREE TEXT and often reads "Nanaimo BC · remote,
-- clients in the US". Kept separate and deliberately not parsed — guessing a
-- country out of a sentence somebody wrote about their life is how you end up
-- confidently reporting the wrong thing.
create or replace view public.wayout_locations_written as
select s.answers ->> 'locationText' as written_location,
       s.answers ->> 'region'       as country,
       s.created_at::date           as day
from public.wayout_sessions s
where s.answers ->> 'locationText' is not null;
