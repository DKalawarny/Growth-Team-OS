-- ============================================================================
-- Eliv8 OS — Initial schema
-- Multi-tenant SaaS. Tenant root = `companies`. Every tenant-scoped table
-- carries `company_id`. RLS (in 002) is a single "Own data" policy per table:
--   company_id in (select company_id from public.profiles where id = auth.uid())
--
-- Tables:
--   companies              tenant root (plan, Stripe, QBO tokens)
--   profiles               1:1 with auth.users (role, company_id)
--   business_profiles      12-question onboarding answers (versioned)
--   milestones             AI-generated roadmap
--   chat_messages          unified chat (advisor | cfo | safety)
--   checkins               weekly progress log
--   documents              tool output library (hiring scorecard, offer, etc)
--   safety_documents       safety vault with pgvector embeddings
--   safety_incidents       WCB / incident log
--   qb_sync_log            QuickBooks pull history (summaries only)
--   gbp_profiles           Google Business Profile optimiser state
--
-- Bootstrap: a new auth.users row has no profile or company until the user
-- completes Signup+Onboarding, which calls public.bootstrap_company() to
-- create the company and profile atomically.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector for safety doc search

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type public.plan_tier as enum (
  'starter_97',       -- $97/mo  · 3 seats
  'growth_247',       -- $247/mo · 15 seats + CFO + Safety
  'scale_497',        -- $497/mo · 50 seats + API/SSO
  'enterprise_997'    -- $997/mo · unlimited + white-label
);

create type public.plan_status as enum (
  'trial',
  'active',
  'past_due',
  'cancelled',
  'expired'
);

create type public.user_role as enum (
  'owner',
  'admin',
  'cfo',
  'safety',
  'manager',
  'member'
);

create type public.chat_surface as enum (
  'advisor',
  'cfo',
  'safety'
);

create type public.message_role as enum (
  'user',
  'assistant',
  'system'
);

create type public.incident_severity as enum (
  'near_miss',
  'minor',
  'serious',
  'critical'
);

-- ----------------------------------------------------------------------------
-- companies — tenant root
-- ----------------------------------------------------------------------------
create table public.companies (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  slug                        text unique,                    -- for white-label subdomain
  plan_tier                   public.plan_tier,
  plan_status                 public.plan_status not null default 'trial',
  trial_ends_at               timestamptz not null default (now() + interval '7 days'),
  -- Stripe
  stripe_customer_id          text unique,
  stripe_subscription_id      text unique,
  current_period_end          timestamptz,
  -- White-label
  logo_url                    text,
  brand_color                 text,
  modules_enabled             jsonb not null default '{}'::jsonb,
  -- QuickBooks Online — tokens encrypted at app/edge layer, never in frontend
  qb_realm_id                 text,
  qb_access_token_encrypted   text,
  qb_refresh_token_encrypted  text,
  qb_token_expires_at         timestamptz,
  qb_connected_at             timestamptz,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.companies is
  'Tenant root. Every tenant-scoped row in other tables references companies.id.';

-- ----------------------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- ----------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  company_id        uuid not null references public.companies(id) on delete cascade,
  role              public.user_role not null default 'member',
  email             text,
  name              text,
  avatar_url        text,
  custom_permissions jsonb not null default '{}'::jsonb,
  last_seen_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index profiles_company_id_idx on public.profiles(company_id);

-- ----------------------------------------------------------------------------
-- business_profiles — 12-question onboarding wizard answers
-- One row per company, updated over time. `version_history` snapshots old states.
-- ----------------------------------------------------------------------------
create table public.business_profiles (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null unique references public.companies(id) on delete cascade,
  business_name      text,
  industry           text,
  location           text,
  team_size          text,
  last_revenue       text,
  current_revenue    text,
  profit             text,
  hours_per_week     text,
  biggest_challenge  text,
  primary_goal       text,     -- Scale | Sell | Get Off Tools | Max Profit | Build Team
  goal_timeline      text,
  vision_3yr         text,
  version_history    jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- milestones — AI-generated roadmap
-- ----------------------------------------------------------------------------
create table public.milestones (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  title           text not null,
  description     text,
  timeframe       text,                                 -- e.g. "0-3 months"
  category        text,                                 -- foundation | systems | team | revenue | exit
  actions         jsonb not null default '[]'::jsonb,
  books           jsonb not null default '[]'::jsonb,   -- ["Traction", "Buy Back Your Time"]
  completed       boolean not null default false,
  completed_date  timestamptz,
  notes           text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create index milestones_company_id_idx on public.milestones(company_id, sort_order);

-- ----------------------------------------------------------------------------
-- chat_messages — unified persistent chat (advisor | cfo | safety)
-- `source_documents` holds citation refs for safety chatbot answers.
-- ----------------------------------------------------------------------------
create table public.chat_messages (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  user_id           uuid not null references public.profiles(id)  on delete cascade,
  chat_type         public.chat_surface not null,
  role              public.message_role not null,
  content           text not null,
  source_documents  jsonb not null default '[]'::jsonb,
  tokens            int,
  created_at        timestamptz not null default now()
);

create index chat_messages_feed_idx
  on public.chat_messages(company_id, user_id, chat_type, created_at);

-- ----------------------------------------------------------------------------
-- checkins — weekly progress log
-- ----------------------------------------------------------------------------
create table public.checkins (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  user_id          uuid not null references public.profiles(id)  on delete cascade,
  revenue_update   text,
  win              text,
  challenge        text,
  mood             int check (mood between 1 and 5),
  hours_this_week  text,
  notes            text,
  created_at       timestamptz not null default now()
);

create index checkins_company_id_idx on public.checkins(company_id, created_at desc);

-- ----------------------------------------------------------------------------
-- documents — tool output library (hiring scorecards, offers, exit scores, etc)
-- ----------------------------------------------------------------------------
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  tool_id      text not null,                         -- 'exit-readiness' | 'hiring-scorecard' | ...
  title        text not null,
  tags         jsonb not null default '[]'::jsonb,
  input_data   jsonb,
  output_data  jsonb,
  created_at   timestamptz not null default now()
);

create index documents_company_id_idx on public.documents(company_id, created_at desc);
create index documents_tool_idx       on public.documents(company_id, tool_id);

-- ----------------------------------------------------------------------------
-- safety_documents — uploaded safety vault docs with pgvector embeddings
-- `embedding` is per-chunk; large docs are split into multiple rows sharing
-- the same `title` + incrementing `chunk_index`.
-- ----------------------------------------------------------------------------
create table public.safety_documents (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id)  on delete cascade,
  uploaded_by      uuid references public.profiles(id) on delete set null,
  title            text not null,
  doc_type         text,                                 -- SWMS | WCB | hazard | cert | ...
  tags             jsonb not null default '[]'::jsonb,
  file_url         text,                                 -- Supabase Storage path
  chunk_index      int not null default 0,
  content          text,                                 -- extracted text for this chunk
  embedding        vector(1536),                         -- OpenAI/Voyage 1536-dim
  token_count      int,
  version          int not null default 1,
  is_current       boolean not null default true,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index safety_documents_company_id_idx on public.safety_documents(company_id);
create index safety_documents_current_idx    on public.safety_documents(company_id, is_current);
create index safety_documents_embedding_idx
  on public.safety_documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ----------------------------------------------------------------------------
-- safety_incidents — WCB / incident log
-- ----------------------------------------------------------------------------
create table public.safety_incidents (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id)  on delete cascade,
  logged_by           uuid references public.profiles(id) on delete set null,
  incident_date       date not null,
  site                text,
  people_involved     text,
  description         text,
  severity            public.incident_severity not null default 'near_miss',
  wcb_claim_number    text,
  wcb_status          text,
  follow_up_actions   jsonb not null default '[]'::jsonb,
  resolved            boolean not null default false,
  created_at          timestamptz not null default now()
);

create index safety_incidents_company_id_idx on public.safety_incidents(company_id, incident_date desc);

-- ----------------------------------------------------------------------------
-- qb_sync_log — QuickBooks pull history (summaries only; no raw PII)
-- ----------------------------------------------------------------------------
create table public.qb_sync_log (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  synced_at       timestamptz not null default now(),
  sync_status     text not null,                       -- ok | error
  data_snapshot   jsonb,                               -- summarised metrics
  error_message   text
);

create index qb_sync_log_company_id_idx on public.qb_sync_log(company_id, synced_at desc);

-- ----------------------------------------------------------------------------
-- gbp_profiles — Google Business Profile Optimiser state
-- ----------------------------------------------------------------------------
create table public.gbp_profiles (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null unique references public.companies(id) on delete cascade,
  business_name        text,
  city                 text,
  industry             text,
  services             text,
  phone                text,
  website              text,
  extra                text,
  generated_content    jsonb,
  sections_completed   jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger companies_set_updated_at          before update on public.companies          for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at           before update on public.profiles           for each row execute function public.set_updated_at();
create trigger business_profiles_set_updated_at  before update on public.business_profiles  for each row execute function public.set_updated_at();
create trigger safety_documents_set_updated_at   before update on public.safety_documents   for each row execute function public.set_updated_at();
create trigger gbp_profiles_set_updated_at       before update on public.gbp_profiles       for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- bootstrap_company(company_name, full_name)
-- Called by Onboarding right after Supabase signUp. Creates the company and
-- the caller's profile (as 'owner') atomically. SECURITY DEFINER so RLS
-- doesn't block the bootstrap (the caller has no profile yet).
-- Idempotent: if a profile already exists, returns its company_id.
-- ----------------------------------------------------------------------------
create or replace function public.bootstrap_company(
  p_company_name text,
  p_full_name    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id    uuid := auth.uid();
  v_user_email text;
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'bootstrap_company: must be authenticated';
  end if;

  select company_id into v_company_id
    from public.profiles where id = v_user_id;
  if v_company_id is not null then
    return v_company_id;
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  insert into public.companies (name)
  values (coalesce(nullif(p_company_name, ''), 'My Company'))
  returning id into v_company_id;

  insert into public.profiles (id, company_id, role, name, email)
  values (v_user_id, v_company_id, 'owner', p_full_name, v_user_email);

  return v_company_id;
end;
$$;

revoke all on function public.bootstrap_company(text, text) from public;
grant execute on function public.bootstrap_company(text, text) to authenticated;
