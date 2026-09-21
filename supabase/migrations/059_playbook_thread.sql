-- Being able to ask (migration 059)
--
-- ⭐⭐ DANIEL: "there is no area here to get more details or ask questions —
-- this seems like just a gated answer platform."
--
-- 🔴 HE IS DESCRIBING THE DIFFERENCE BETWEEN A VENDING MACHINE AND SOMEBODY WHO
-- KNOWS THE WORK. Everything this product has built so far is one-shot: it
-- produces a thing and stops. But the moment anybody actually starts a move
-- they have a question, and it is always the specific one no prompt could have
-- anticipated — what do I say if he asks why, what if the agent won't give me
-- a number, is it still worth it if it's only two customers.
--
-- Answering those is what the paid half is FOR. A play-by-play that cannot be
-- asked about is a document; one that can is the thing somebody pays monthly
-- for, and it is the only honest basis for a subscription this product has.
--
-- ⚠️ ON THE PLAYBOOK ROW, scoped to one move. The question "what do I say if he
-- says no" means something different in week one than in week three, and a
-- single thread spanning the whole plan would drag week one's context into a
-- conversation about something else entirely.
alter table public.wayout_playbooks
  add column if not exists thread jsonb not null default '[]'::jsonb;

comment on column public.wayout_playbooks.thread is
  'Questions asked about this move and the answers, oldest first: [{role, content, at}]. Scoped per move — see 059.';
