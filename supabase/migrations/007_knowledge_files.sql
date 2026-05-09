-- ============================================================================
-- Knowledge files — owner-uploaded documents that teach the platform about
-- the business. SOPs, financials, org charts, past proposals, handbooks.
--
-- Feeds into:
--   - buildAdvisorContext (advisor + every tool's BUSINESS_CONTEXT block)
--   - future RAG retrieval (once we add per-chunk embeddings)
--
-- Separate from `public.documents`, which holds tool OUTPUTS (scorecards,
-- offers, plans). Different lifecycle, different shape: uploads have a file
-- in Storage, outputs are pure JSON. Mixing them in one table would force
-- half the columns to be nullable and blur the mental model.
--
-- Text extraction happens client-side on upload for the MVP; `extracted_text`
-- is what gets sent to Claude. When we add background processing + embeddings,
-- the `status` column flips through 'processing' → 'ready' / 'failed'.
-- ============================================================================

create table public.knowledge_files (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  uploaded_by   uuid references public.profiles(id) on delete set null,

  -- Display — the owner types a title on upload; we default to the filename
  -- if they don't bother.
  title         text not null,
  notes         text,                               -- optional: "this is our 2025 hiring SOP"

  -- File in Storage. `file_path` is the object path relative to the
  -- 'knowledge-files' bucket, following the '<company_id>/<uuid>-<name>'
  -- convention so storage RLS can match on the first folder segment.
  file_path     text not null,
  mime_type     text,
  size_bytes    int,

  -- Categorisation — lets the advisor say "looking at your SOPs...".
  -- Kept as a free-text enum (check constraint) rather than a separate
  -- reference table because the set rarely changes.
  kind          text not null default 'general'
    check (kind in ('general', 'sop', 'financial', 'marketing', 'hr', 'legal', 'sales')),

  -- Extracted plain text. Nullable because a failed extraction still leaves
  -- a valid row (the owner can see the file exists even if we couldn't read
  -- the PDF). Cap isn't enforced at the DB layer — the app truncates before
  -- feeding it to Claude.
  extracted_text text,

  status        text not null default 'ready'
    check (status in ('processing', 'ready', 'failed')),

  created_at    timestamptz not null default now()
);

create index knowledge_files_company_id_idx
  on public.knowledge_files(company_id, created_at desc);
create index knowledge_files_kind_idx
  on public.knowledge_files(company_id, kind);

comment on table public.knowledge_files is
  'Owner-uploaded company knowledge — SOPs, financials, handbooks. Feeds advisor context.';

-- ---------------- RLS ----------------
alter table public.knowledge_files enable row level security;

-- Company members can read everything their company has uploaded. Any
-- authenticated member can upload. Only owner/admin/the uploader can delete.
-- (Keeps the common case — "let me pull our playbook into the advisor" —
-- frictionless while protecting against accidental deletes by anyone with a
-- login.)
create policy "knowledge_files_read"
  on public.knowledge_files for select
  using (company_id = public.current_company_id());

create policy "knowledge_files_insert"
  on public.knowledge_files for insert
  with check (
    company_id = public.current_company_id()
    and uploaded_by = auth.uid()
  );

create policy "knowledge_files_update"
  on public.knowledge_files for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "knowledge_files_delete"
  on public.knowledge_files for delete
  using (
    company_id = public.current_company_id()
    and (
      uploaded_by = auth.uid()
      or public.current_user_role() in ('owner', 'admin')
    )
  );

-- ---------------- Storage bucket ----------------
-- Private (not public). Objects are keyed '<company_id>/<uuid>-<sanitized>'
-- so the first path segment gates RLS.
insert into storage.buckets (id, name, public)
values ('knowledge-files', 'knowledge-files', false)
on conflict (id) do nothing;

create policy "knowledge_files_storage_read"
  on storage.objects for select
  using (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
  );

create policy "knowledge_files_storage_write"
  on storage.objects for insert
  with check (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
  );

create policy "knowledge_files_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1]::uuid = public.current_company_id()
  );
