-- When a move is actually finished (migration 056)
--
-- ⭐⭐ THIS IS THE LOOP THE WHOLE BUSINESS RESTS ON. The plan's value is the
-- ORDER — three moves, each with a gate saying what has to be true before the
-- next one starts. Until now that was a sentence on a page. The checkbox beside
-- each move was local component state: it vanished on reload, nothing read it,
-- and move two's play-by-play was reachable from the moment the plan existed.
--
-- A gate nothing enforces is a suggestion, and a plan whose order is a
-- suggestion is the list of ideas this product exists not to be.
--
-- ⭐ It is also the recurring mechanism, stated honestly. People do not come
-- back for accountability — nothing here nags. They come back because move two
-- is a different problem they also do not know how to do, and it only becomes
-- relevant once move one has actually landed. Marking it done is the event that
-- makes the next thing worth wanting.
--
-- ⚠️ ON THE PLAYBOOK ROW, NOT THE SESSION. Done-ness belongs to the move as it
-- was written, beside the play that was followed to get there. A session-level
-- array would lose which VERSION of the move was completed, and a rebuilt plan
-- would inherit ticks for work that was done on different moves entirely.
alter table public.wayout_playbooks
  add column if not exists done_at timestamptz;

comment on column public.wayout_playbooks.done_at is
  'When the person said this move was finished. Their claim, not a verification — see 056 for why that is the right call.';

-- ⚠️ NOBODY CHECKS UP ON THEM, AND THAT IS DELIBERATE.
--
-- It would be easy to require evidence — a number entered, a receipt, three
-- named customers. Every version of that turns this into something that audits
-- people, and an audit is the thing they are already avoiding. If somebody
-- ticks move one without doing it, the person they have misled is themselves,
-- and the play-by-play they unlock will plainly not fit. The product does not
-- need to be the one to point that out.
