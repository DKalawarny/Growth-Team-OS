-- Files that ride along with a task (a floor plan, special instructions for a
-- one-off job). Deliberately NOT knowledge_files: these are not indexed for
-- Solomon and never enter the RAG library — just a file attached to the task,
-- downloadable from the app. Stored in the existing knowledge-files bucket
-- under the company's folder, so the same storage RLS applies.
create table if not exists work_order_attachments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id)   on delete cascade,
  work_order_id uuid not null references work_orders(id)  on delete cascade,
  title         text,
  file_path     text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index if not exists work_order_attachments_wo_idx on work_order_attachments (work_order_id);

alter table work_order_attachments enable row level security;

create policy work_order_attachments_read on work_order_attachments
  for select using (company_id = current_company_id() and can_area('office'));
create policy work_order_attachments_insert on work_order_attachments
  for insert with check (company_id = current_company_id() and uploaded_by = auth.uid() and can_area('office'));
create policy work_order_attachments_delete on work_order_attachments
  for delete using (company_id = current_company_id() and can_area('office') and (uploaded_by = auth.uid() or can_area('lead')));

grant select, insert, delete on work_order_attachments to authenticated;
