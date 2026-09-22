-- What they'd have paid, and whether they'd say so publicly.
--
-- ⭐⭐ THIS IS THE TIP BUTTON, DONE PROPERLY. A tip jar would have sat beside the
-- subscription ask at the highest-intent moment in the product and let people
-- discharge the gratitude for $5 instead of subscribing — monetising the best
-- conversion moment at about 4% of its value. It also reads as hobby project
-- right before asking for a recurring payment, and tip rates on digital goods
-- run 1-3%, so it is too noisy to learn anything from.
--
-- ⭐ What Daniel actually wanted from it was proof the map is worth something.
-- Asking is a better instrument: no competition with the CTA, no money taken
-- before the entity question is settled, and a far higher response rate.
--
-- ⭐⭐ And the review matters more than the money at this stage. Daniel's own
-- words: "getting someone to try it out for free for feedback and REVIEW IS
-- MORE IMPORTANT and easier to get the ball rolling and then once they are on
-- to tell others who buy you have clients."
create table if not exists public.wayout_worth (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.wayout_sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Null means they answered the review question but skipped the money one.
  would_pay_cents integer,
  -- ⚠️ Their own words, kept verbatim. Never summarised into a score.
  note        text,
  can_quote   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (session_id)
);

alter table public.wayout_worth enable row level security;

-- ⚠️ Read and write their OWN row only. Nobody browses anybody else's answers,
-- including the price they put on it.
create policy wayout_worth_own on public.wayout_worth
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.wayout_worth is
  'What a person would have paid for their map, and whether we may quote them.';
