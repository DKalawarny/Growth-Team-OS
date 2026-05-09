-- ── Response cache ────────────────────────────────────────────────────────────
-- Stores Claude tool responses keyed by a hash of the inputs. When the same
-- inputs are submitted again (same tool, same form data, same business context)
-- we return the cached text instead of calling Claude — zero tokens, zero cost.
--
-- TTL: 7 days. Expired rows are left in place and filtered out at query time;
-- a nightly Supabase cron (or manual delete) can sweep them periodically.
--
-- Scope: per-company. Two companies with identical inputs still get separate
-- cache entries — the hash includes the full system prompt which contains
-- company-specific context, so cross-contamination is impossible.

create table if not exists response_cache (
  id          uuid        primary key default gen_random_uuid(),
  company_id  uuid        not null references companies(id) on delete cascade,
  query_hash  text        not null,
  tool_id     text        not null,
  response    text        not null,
  hit_count   integer     not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days'
);

-- Fast lookup by company + hash
create unique index response_cache_lookup
  on response_cache (company_id, query_hash);

-- Allows efficient sweeps of expired rows
create index response_cache_expires
  on response_cache (expires_at);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table response_cache enable row level security;

create policy "company members can read response cache"
  on response_cache for select
  using (
    company_id in (select company_id from profiles where id = auth.uid())
  );

create policy "company members can insert response cache"
  on response_cache for insert
  with check (
    company_id in (select company_id from profiles where id = auth.uid())
  );

create policy "company members can update response cache"
  on response_cache for update
  using (
    company_id in (select company_id from profiles where id = auth.uid())
  );
