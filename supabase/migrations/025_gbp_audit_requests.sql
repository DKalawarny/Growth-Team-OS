-- GBP audit lead-capture table.
-- Marketing page /free-gbp-audit inserts here (anon, no auth required).
-- Daniel reviews rows in the dashboard and runs audits manually.

create table if not exists public.gbp_audit_requests (
  id              uuid        primary key default gen_random_uuid(),
  business_name   text        not null,
  email           text        not null,
  website         text,
  city            text,
  status          text        not null default 'pending',  -- pending | sent | done
  created_at      timestamptz not null default now()
);

-- Allow anyone (anon) to insert a request — this is a public lead-capture form.
alter table public.gbp_audit_requests enable row level security;

create policy "anon_insert_gbp_audit_requests"
  on public.gbp_audit_requests
  for insert
  to anon, authenticated
  with check (true);

-- Only service role can read/update/delete (admin dashboard access only).
create policy "service_role_all_gbp_audit_requests"
  on public.gbp_audit_requests
  for all
  to service_role
  using (true)
  with check (true);
