-- ============================================================================
-- The way out — intake sessions and generated maps (migration 046)
--
-- A separately-named front door on the same platform: same Supabase project,
-- same auth, same Solomon proxy. Different product. Someone arrives here
-- because they feel stuck in their own life, not because they own a business.
--
-- ⭐ THE INTERNAL SLUG IS `wayout` AND IT NEVER CHANGES.
-- The user-facing name is not settled (see src/lib/wayout/brand.js). Every
-- route, table, column and prompt key uses the slug so that landing on a name
-- is a one-line change in one file rather than a migration.
--
-- 🔴 THIS IS THE ONLY CUSTOMER-FACING TABLE IN THE SCHEMA NOT SCOPED BY
--    company_id, AND THAT IS DELIBERATE.
--
-- Migration 001 set the rule: "every customer-facing table carries company_id"
-- with a single Own-data policy per table:
--     company_id in (select company_id from profiles where id = auth.uid())
--
-- Applying that rule here would be a privacy bug, not consistency. A company
-- is a SHARED scope — an owner, a GM, a bookkeeper, anyone invited. This table
-- holds a person's money, their custody arrangement, who in their life will
-- fight the plan, and what they are running from. Company-scoping it would
-- show an employee's exit plan to their employer, and the employer's to their
-- staff. The one scope that is correct here is the person.
--
-- So: `user_id references auth.users` and RLS on `auth.uid() = user_id`.
-- Nothing joins this table to companies. If a future feature needs to relate
-- the two, it does so through the user, never by widening this policy.
--
-- ⚠️ The user still HAS a company row — `profiles.company_id` is NOT NULL and
-- `bootstrap_company()` provisions one at first sign-in. That is what lets the
-- existing claude edge function serve these users unchanged: its spend cap,
-- per-tool cap and usage_events write are all company-scoped and keep working
-- with no edit to the one function that guards all AI spend. The company row
-- is a billing container here, nothing more, and is never shown.
-- ============================================================================

-- ── Status ------------------------------------------------------------------
-- draft    → intake started, not finished. Resumable.
-- complete → all six screens answered. NOT paid, so no map has been generated.
-- paid     → the $39 one-time charge cleared; the map is generated and kept.
--
-- ⚠️ `complete` and `paid` are separate on purpose. The promise on screen S0 is
-- "Nothing to buy until you've seen your plan", so a person finishes the whole
-- intake before any charge. Collapsing these into one boolean would lose the
-- ability to tell "abandoned at question four" from "finished and didn't buy" —
-- two completely different problems, and the second is the only one worth
-- fixing with copy.
create type public.wayout_status as enum ('draft', 'complete', 'paid');

create table public.wayout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       public.wayout_status not null default 'draft',

  -- The six screens, as one document. Deliberately jsonb rather than thirty
  -- columns: the intake is a questionnaire whose shape is still moving, every
  -- field is written and read together as a whole, and nothing queries across
  -- users by answer. A schema change here should be a prompt change, not a
  -- migration.
  answers      jsonb not null default '{}'::jsonb,

  -- The generated map. Null until paid. Shape is in the SPEC (§3) and enforced
  -- by the prompt's JSON contract, not by the database — a partially-valid map
  -- is still worth storing so we can see what the model actually returned.
  map          jsonb,

  -- Set when the free diagnostic (§7) fed this session. Lets us see whether the
  -- marketing front door actually converts, which is the whole reason it exists.
  from_diagnostic boolean not null default false,

  -- Stripe's checkout session id for the one-time charge. Kept so a webhook
  -- replay is idempotent and so a support question ("I paid and got nothing")
  -- is answerable without digging through Stripe.
  stripe_checkout_id text,

  paid_at      timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One person can run the intake more than once — life changes, and the v2
-- check-in product is explicitly built on re-running it. So no unique
-- constraint on user_id; the app reads the most recent.
create index wayout_sessions_user_idx on public.wayout_sessions(user_id, created_at desc);

-- Answering "did anyone finish, and did anyone pay" without a table scan.
create index wayout_sessions_status_idx on public.wayout_sessions(status, created_at desc);

create trigger wayout_sessions_set_updated_at
  before update on public.wayout_sessions
  for each row execute function public.set_updated_at();

-- ── RLS ---------------------------------------------------------------------
alter table public.wayout_sessions enable row level security;

-- Read/write your own, and only your own. No company clause anywhere.
create policy "wayout: own sessions"
  on public.wayout_sessions
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 🔴 `status` and `paid_at` MUST NOT be client-writable, or the paywall is a
-- checkbox in the browser console. The policy above deliberately grants full
-- write on the row, which would allow exactly that — so the columns that
-- decide entitlement are locked by a trigger instead, and only the service
-- role (the Stripe webhook) may move a session to 'paid'.
create or replace function public.wayout_guard_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- The service role bypasses RLS and is what the Stripe webhook runs as.
  -- auth.uid() is null in that context, which is how we tell the two apart.
  if auth.uid() is null then
    return new;
  end if;

  -- A user may move their own session draft → complete. Nothing else.
  if new.status = 'paid' and old.status <> 'paid' then
    raise exception 'wayout: payment status is set by the payment webhook, not the client';
  end if;

  if new.paid_at is distinct from old.paid_at then
    raise exception 'wayout: paid_at is set by the payment webhook, not the client';
  end if;

  -- The map is generated server-side against a paid session. A client that
  -- could write it could write itself a map without paying.
  if new.map is distinct from old.map then
    raise exception 'wayout: the map is generated, not submitted';
  end if;

  return new;
end;
$$;

create trigger wayout_sessions_guard_entitlement
  before update on public.wayout_sessions
  for each row execute function public.wayout_guard_entitlement();

-- The same guard on insert, so a client cannot simply create a row that is
-- already paid with a map attached.
create or replace function public.wayout_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.status = 'paid' or new.paid_at is not null or new.map is not null then
    raise exception 'wayout: a new session starts as a draft';
  end if;
  return new;
end;
$$;

create trigger wayout_sessions_guard_insert
  before insert on public.wayout_sessions
  for each row execute function public.wayout_guard_insert();

-- ── Free diagnostic ---------------------------------------------------------
-- The marketing front door (SPEC §7). Six taps, no account required, so this
-- table is written by anonymous visitors and CANNOT be user-scoped.
--
-- ⚠️ It holds no free text by design — six enum-ish answers and a region. That
-- is what makes an anonymous-insert policy safe here and would not be safe on
-- wayout_sessions.
create table public.wayout_diagnostics (
  id          uuid primary key default gen_random_uuid(),
  -- Null until the visitor makes an account. Set when a diagnostic is claimed
  -- and pre-fills a real intake, which is how we measure the front door.
  user_id     uuid references auth.users(id) on delete set null,
  answers     jsonb not null default '{}'::jsonb,
  path        text,            -- which of the four paths was shown
  created_at  timestamptz not null default now()
);

create index wayout_diagnostics_user_idx on public.wayout_diagnostics(user_id)
  where user_id is not null;

alter table public.wayout_diagnostics enable row level security;

-- Anyone may record a diagnostic; nobody may read the table back. A visitor
-- gets their result from the insert's own returning row, so read access buys
-- nothing and would leak every visitor's answers to every other visitor.
create policy "wayout: anyone may record a diagnostic"
  on public.wayout_diagnostics
  for insert
  to anon, authenticated
  with check (true);

create policy "wayout: read your own claimed diagnostic"
  on public.wayout_diagnostics
  for select
  to authenticated
  using (auth.uid() = user_id);
