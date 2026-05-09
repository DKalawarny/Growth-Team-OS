-- ============================================================================
-- Multi-goal + website analysis.
--
-- Changes:
--   1. primary_goal text → primary_goal text[]     (owners pick multiple goals)
--   2. Add website          text                    (user's public URL)
--   3. Add website_content  text                    (scraped readable text,
--                                                    capped ~10k chars by app)
--
-- Idempotent: existing single-string primary_goal values are wrapped into a
-- 1-element array. Null/empty values become null.
-- ============================================================================

-- --- 1. primary_goal → text[] -----------------------------------------------
alter table public.business_profiles
  alter column primary_goal type text[]
  using case
    when primary_goal is null or primary_goal::text = '' then null
    else array[primary_goal]
  end;

-- --- 2 + 3. New columns ------------------------------------------------------
alter table public.business_profiles
  add column if not exists website          text,
  add column if not exists website_content  text;

comment on column public.business_profiles.primary_goal    is
  'Array of owner-selected goals (Scale, Sell, Get Off Tools, Max Profit, Build Team). Multi-select.';
comment on column public.business_profiles.website         is
  'Public website URL the owner provides during onboarding. Optional.';
comment on column public.business_profiles.website_content is
  'Cached readable text scraped from the website (via Jina Reader). Capped ~10k chars.';
