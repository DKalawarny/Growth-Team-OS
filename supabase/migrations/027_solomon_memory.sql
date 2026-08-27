-- ============================================================================
-- Eliv8 OS — Solomon's memory (migration 027)
--
-- Until now Solomon had retrieval, not memory. `search_chat_history` finds
-- past exchanges that resemble the current question, top-k above a similarity
-- floor, recomputed every turn. That means a constraint the owner stated once
-- in March never surfaces in August unless the new question happens to sound
-- like the old one. It also silently returns nothing when the embeddings key
-- is unset, which is the state the app has actually been running in.
--
-- Retrieval answers "what did we talk about that resembles this?"
-- Memory answers "what do I know about this business?"
--
-- Those are different questions, and only the second one makes an advisor
-- feel like part of the team. This table is the second one: a small set of
-- durable, human-readable statements that go into EVERY turn rather than
-- being searched for. Small on purpose — a few dozen lines the owner could
-- read in a minute, not a transcript.
--
-- Correctness matters more than completeness here. A confidently remembered
-- wrong fact is worse than a forgotten one, which is why every row records
-- where it came from, when it was last confirmed, and can be corrected or
-- dismissed by the owner from /context.
-- ============================================================================

create table if not exists public.solomon_memory (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies(id) on delete cascade,

  -- Null = true of the business, so every teammate sees it. Set = personal to
  -- that user (their own working hours, how they like to be talked to). Keeps
  -- one person's private constraints out of another person's advice.
  user_id      uuid        references public.profiles(id) on delete cascade,

  kind         text        not null check (kind in (
                             'constraint',   -- a line the owner has drawn: hours, no debt, no weekend work
                             'decision',     -- something settled, and why — so it isn't relitigated blind
                             'person',       -- who someone is and what they carry
                             'commitment',   -- something the owner said they would do
                             'preference',   -- how they want to be advised
                             'context'       -- durable background: seasonality, a major customer, history
                           )),

  -- One plain sentence, in the owner's own terms where possible. This is what
  -- gets injected, so it has to read well on its own with no surrounding text.
  statement    text        not null check (char_length(statement) between 3 and 400),

  -- Optional nuance: the "why" behind a decision, the caveat on a constraint.
  detail       text        check (detail is null or char_length(detail) <= 1200),

  source       text        not null default 'conversation'
                           check (source in ('conversation','checkin','tool','owner','onboarding')),
  source_ref   uuid,       -- chat_messages.id / checkins.id / documents.id where known

  status       text        not null default 'active'
                           check (status in ('active','superseded','dismissed')),
  -- When a fact is replaced rather than deleted we keep the old row and point
  -- at the new one. "You told me 50 hours in June and 45 in August" is a more
  -- useful thing for an advisor to be able to say than either fact alone.
  superseded_by uuid       references public.solomon_memory(id) on delete set null,

  first_seen     timestamptz not null default now(),
  last_confirmed timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- The hot path: every active row for a company, on every turn.
create index if not exists solomon_memory_active_idx
  on public.solomon_memory (company_id, status, kind);

-- Cheap duplicate guard. The extractor proposes freely; this stops the same
-- sentence landing twice for the same company.
create unique index if not exists solomon_memory_dedupe_idx
  on public.solomon_memory (company_id, lower(statement))
  where status = 'active';

alter table public.solomon_memory enable row level security;

-- Everything is scoped by company, like every other customer-facing table.
-- Personal rows (user_id set) are visible only to that user; company rows to
-- everyone in the company.
create policy "Read own company memory"
  on public.solomon_memory for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
    and (user_id is null or user_id = auth.uid())
  );

create policy "Write own company memory"
  on public.solomon_memory for insert
  with check (
    company_id in (select company_id from public.profiles where id = auth.uid())
    and (user_id is null or user_id = auth.uid())
  );

-- Owners correct and dismiss their own memory — that is the whole trust model.
create policy "Update own company memory"
  on public.solomon_memory for update
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
    and (user_id is null or user_id = auth.uid())
  );

create policy "Delete own company memory"
  on public.solomon_memory for delete
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
    and (user_id is null or user_id = auth.uid())
  );

comment on table public.solomon_memory is
  'Durable facts Solomon has learned about a business. Injected into every advisor turn, unlike chat retrieval which is searched per-question. Owner-correctable from /context.';
