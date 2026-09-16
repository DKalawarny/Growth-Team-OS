-- The way out — count how many times a plan has been rebuilt.
--
-- ⭐⭐ DANIEL: "i dont think it should be unlimited ... you could almost just
-- keep changing things until you get the answer to what you are looking for
-- without a paywall."
--
-- He is right twice over. The cheap reason is cost: every rebuild is a Sonnet
-- call and nothing was counting them. The real reason is that fishing for a
-- plan you like is the exact behaviour this product exists to end. Somebody on
-- their fourth rewrite does not have a planning problem any more, and handing
-- them a fifth plan is helping them avoid the thing they are afraid of.
--
-- ⚠️ THIS IS FRICTION, NOT SECURITY. The column is client-writable like the
-- answers beside it, so a determined person with the console open can reset it.
-- That is deliberate: the money backstop is the per-account spend cap in the
-- claude function, which this does not replace. What this stops is the ordinary
-- case — the honest person quietly re-rolling until the plan tells them what
-- they hoped, which is a worse outcome for them than being told to start.
alter table public.wayout_sessions
  add column if not exists rebuilds integer not null default 0;

comment on column public.wayout_sessions.rebuilds is
  'How many times the map has been regenerated after the first. Capped in the client; see 046 for the columns that are genuinely locked.';
