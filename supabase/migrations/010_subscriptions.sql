-- ============================================================================
-- Stripe subscriptions — paid-plan state per company
--
-- Shape: one row per company (unique). Upserted by the stripe-webhook Edge
-- Function on subscription lifecycle events. The browser reads from here,
-- never from Stripe directly — Stripe rate limits don't survive a real user
-- base, and this table is our cached source of truth for "can this user use
-- the app right now."
--
-- Access model (implemented in src/lib/subscriptions.js, NOT this migration):
--   - Before trial_ends_at  → full access, no subscription row required
--   - After trial ends      → access requires subscriptions.status in
--                             ('active', 'trialing', 'past_due')
--   - past_due is included  → Stripe retries failed charges for up to 3
--                             weeks; locking users out on first failed
--                             charge is hostile. Gate tightens to strict
--                             'active' only if that becomes abusive.
--
-- We DON'T duplicate the free trial here. companies.trial_ends_at keeps
-- driving the no-card 7-day trial (matches the "No credit card required"
-- promise on the Landing page). This table is strictly for the paid
-- relationship post-checkout.
--
-- Why UNIQUE on company_id: one active subscription per company keeps the
-- code simple. Reactivating after cancellation updates the existing row
-- rather than inserting a new one. If we need subscription history later,
-- add a separate `subscription_events` audit table rather than allowing
-- multiple live rows.
-- ============================================================================

-- ---------------- Table ----------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null unique references public.companies(id) on delete cascade,

  -- Stripe identifiers. customer_id is kept even across cancel/resubscribe
  -- cycles; subscription_id changes when a user cancels and later resubs.
  stripe_customer_id     text,
  stripe_subscription_id text unique,

  -- Mirrors Stripe's subscription.status enum verbatim so we never map
  -- vocabularies. Values we expect to see:
  --   trialing | active | past_due | canceled | incomplete
  --   incomplete_expired | unpaid
  status                 text not null default 'trialing',

  -- Our internal plan label (owner | agency | scale). Decoupled from the
  -- Stripe price_id so a price change doesn't break the plan taxonomy.
  -- Set from subscription.metadata.plan which we stuff in at checkout time.
  plan                   text not null default 'owner',

  -- When the current paid period ends. Shown in Settings, used for the
  -- "your plan renews on X" copy. Updated by webhook on each invoice cycle.
  current_period_end     timestamptz,

  -- True if the user clicked "Cancel subscription" in the Stripe portal.
  -- They keep access until current_period_end, then status flips to canceled.
  cancel_at_period_end   boolean not null default false,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.subscriptions is
  'Mirror of Stripe subscription state. One row per company. Written only by stripe-webhook.';

-- ---------------- Indexes ----------------
-- Customer lookup — webhook needs this to find a row by stripe_customer_id
-- when company_id isn't easily derivable (rare but happens on some events).
create index if not exists subscriptions_stripe_customer_idx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

-- Partial index on live subscriptions — the gate check is the hot path and
-- only cares about companies currently on a plan. Dead rows don't bloat it.
create index if not exists subscriptions_active_idx
  on public.subscriptions (company_id)
  where status in ('active', 'trialing', 'past_due');

-- ---------------- updated_at trigger ----------------
-- Generic bump-updated-at helper. CREATE OR REPLACE is idempotent if an
-- earlier migration already defined this; we repeat it here so 010 can be
-- applied standalone.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------- RLS ----------------
alter table public.subscriptions enable row level security;

-- Company members can read their own subscription row. The Settings billing
-- tab reads this; the gate check reads this.
create policy "subscriptions: company members can read"
  on public.subscriptions
  for select
  using (
    company_id in (
      select company_id from public.profiles where id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for users. All writes go through the
-- stripe-webhook Edge Function using the service role key, which bypasses
-- RLS. This keeps the billing state unforgeable from the client.
