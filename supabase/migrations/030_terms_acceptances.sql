-- ============================================================================
-- Eliv8 OS — recorded acceptance of the pilot agreement (migration 030)
--
-- WHY THIS EXISTS
--
-- Signup.jsx has been telling every new user "By creating an account you agree
-- to our terms" since the beginning. There were no terms. No page, no route,
-- no file — the sentence pointed at nothing. That is worse than silence: it
-- asserts an agreement exists, and the first question anyone asks when
-- something goes wrong is "show me what I agreed to."
--
-- Eliv8 OS tells owners when to hire, how to price, and what their cash
-- position is. Someone acts on that and loses money — free pilot or not — and
-- the only thing standing between that and the operator is what they accepted
-- and what the product said at the time. So acceptance has to be RECORDED,
-- not assumed.
--
-- ⭐ WHY (user_id, version) AND NOT JUST user_id
--
-- Terms change. An acceptance of v1 is not an acceptance of v2, and the
-- version that matters in a dispute is the one in force when the thing
-- happened. Keeping every acceptance row — rather than updating one — means
-- the history is intact: who accepted what, when.
--
-- This is also how the operator name gets fixed later without lying about the
-- past. The pilot runs pre-incorporation, so v1 names Daniel personally. When
-- the BC company exists, v2 names the company, TERMS_VERSION bumps, and every
-- user re-accepts under the new entity. The v1 rows stay exactly as they were,
-- because that IS what those users agreed to at the time.
--
-- ⚠️ company_id is nullable ON PURPOSE. Acceptance happens at signup, which is
-- before onboarding creates a company. A NOT NULL here would make the gate
-- impossible to satisfy for the exact users it most needs to cover.
-- ============================================================================

create table if not exists public.terms_acceptances (
  id           uuid        primary key default gen_random_uuid(),

  user_id      uuid        not null references public.profiles(id) on delete cascade,

  -- Null until onboarding runs. See the note above.
  company_id   uuid        references public.companies(id) on delete set null,

  -- Matches TERMS_VERSION in src/lib/terms.js. Free text rather than an enum
  -- so shipping new terms never needs a migration.
  version      text        not null check (char_length(version) between 1 and 40),

  -- Where the acceptance came from, for evidence quality. 'signup' is the
  -- checkbox; 'gate' is the in-app modal shown to users who predate the terms
  -- or who signed up through a flow that returned no session.
  source       text        not null default 'signup'
                           check (source in ('signup','gate','import')),

  accepted_at  timestamptz not null default now()
);

-- One acceptance per user per version. A double-click, a re-render, or the
-- gate racing the signup checkbox must not write two rows.
create unique index if not exists terms_acceptances_user_version_idx
  on public.terms_acceptances (user_id, version);

create index if not exists terms_acceptances_user_idx
  on public.terms_acceptances (user_id, accepted_at desc);

alter table public.terms_acceptances enable row level security;

-- A user can see and create their OWN acceptances, and nothing else.
--
-- ⚠️ There is deliberately no UPDATE and no DELETE policy. An acceptance
-- record that the accepting party can edit or erase is not evidence of
-- anything. Removal is a service-role operation.
create policy "own acceptances readable"
  on public.terms_acceptances for select
  using (user_id = auth.uid());

create policy "own acceptances insertable"
  on public.terms_acceptances for insert
  with check (user_id = auth.uid());

comment on table public.terms_acceptances is
  'Immutable record of which user accepted which version of the pilot agreement, and when. No update/delete policy on purpose — see migration 030.';
