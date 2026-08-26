-- 032_knowledge_file_source.sql
--
-- Where an imported file CAME FROM, so we can tell the owner when his copy has
-- gone stale.
--
-- Google Drive and OneDrive are a one-time picker import: the chosen files are
-- copied into the Library and nothing ever re-checks them. That is a deliberate
-- design — live sync would need a standing "read all of your Drive, forever"
-- grant, and it would index every holiday photo alongside the estimates, which
-- makes retrieval worse rather than better.
--
-- But "we never look again" and "we cannot tell you it changed" are different
-- promises, and only the first one was intended. These three columns are the
-- difference: with the provider, the file id and the modified time we saw at
-- import, a single metadata call per file answers "has this moved since?"
-- without any standing access and without an LLM call.
--
-- Nullable and unindexed-by-default on purpose: the overwhelming majority of
-- knowledge_files are drag-and-drop uploads with no origin to check.

alter table public.knowledge_files
  add column if not exists source_provider    text,
  add column if not exists source_file_id     text,
  add column if not exists source_modified_at timestamptz;

comment on column public.knowledge_files.source_provider is
  'Origin of an imported file: ''google'' | ''onedrive''. Null for direct uploads.';
comment on column public.knowledge_files.source_file_id is
  'The provider''s own id for the file, used to re-check its modified time.';
comment on column public.knowledge_files.source_modified_at is
  'The file''s modified time AT IMPORT. Newer upstream means our copy is stale.';

-- Partial: only imported rows are ever scanned by the freshness check.
create index if not exists knowledge_files_source_idx
  on public.knowledge_files (company_id, source_provider)
  where source_provider is not null;
