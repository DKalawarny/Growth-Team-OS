-- ============================================================================
-- GrowthOS — drop OpenAI, embed locally (migration 029)
--
-- Embeddings were the only thing in this product using OpenAI. Supabase runs
-- `gte-small` natively inside Edge Functions via Supabase.ai.Session — no API
-- key, no external request, no vendor. So the dependency goes away entirely,
-- and with it an account, a key to rotate, and a billing relationship sitting
-- on an email Daniel is walking away from.
--
-- ⭐ WHY NOW AND NOT LATER
--
-- Changing embedding model normally means re-embedding an entire corpus. Here
-- it costs nothing: the browser-side key was never set, so embed() has
-- returned null since April and NOT ONE VECTOR HAS EVER BEEN STORED. The
-- OpenAI dashboard confirms it independently — that key's last-used column
-- reads "Never". These columns are empty. This is the cheapest this decision
-- will ever be.
--
-- gte-small is 384 dimensions against text-embedding-3-small's 1536. Smaller
-- model, smaller index, faster search. For one business's document library —
-- tens of files, not millions — the retrieval difference is unlikely to show.
-- If it ever does, going back is a re-embed of a few dozen documents.
--
-- ⚠️ The guard below refuses to run if any embedding exists, rather than
-- silently destroying data. If it fires, stop and re-embed deliberately.
-- ============================================================================

do $guard$
declare
  n bigint;
begin
  select
    (select count(*) from public.document_chunks   where embedding is not null)
  + (select count(*) from public.chat_chunks       where embedding is not null)
  + (select count(*) from public.safety_documents  where embedding is not null)
  into n;

  if n > 0 then
    raise exception
      'Refusing to run: % existing embeddings would be destroyed. Re-embed deliberately instead.', n;
  end if;
end
$guard$;

-- ── Indexes go before the column type changes ──────────────────────────────
drop index if exists public.document_chunks_embedding_hnsw_idx;
drop index if exists public.chat_chunks_embedding_hnsw_idx;
drop index if exists public.safety_documents_embedding_idx;

-- ── Functions depend on the column type, so they go too ────────────────────
drop function if exists public.search_knowledge_chunks(uuid, vector(1536), int, float);
drop function if exists public.search_chat_history(uuid, uuid, vector(1536), int, float);
drop function if exists public.search_safety_documents(uuid, vector(1536), int, float);

-- ── Columns: 1536 → 384 ────────────────────────────────────────────────────
alter table public.document_chunks  alter column embedding type vector(384);
alter table public.chat_chunks      alter column embedding type vector(384);
alter table public.safety_documents alter column embedding type vector(384);

-- ── Indexes back ───────────────────────────────────────────────────────────
create index document_chunks_embedding_hnsw_idx
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

create index chat_chunks_embedding_hnsw_idx
  on public.chat_chunks
  using hnsw (embedding vector_cosine_ops);

-- safety_documents was on ivfflat, which needs training rows to be useful and
-- is poor on a table this size. hnsw builds fine from empty.
create index safety_documents_embedding_hnsw_idx
  on public.safety_documents
  using hnsw (embedding vector_cosine_ops);

-- ── Functions back. Bodies are byte-identical to the originals; only the
--    p_embedding type changes. Defaults preserved exactly (5/0.30, 6/0.30,
--    8/0.30) — changing a threshold here would silently alter retrieval.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.search_knowledge_chunks(
  p_company_id uuid,
  p_embedding  vector(384),
  p_limit      int     default 8,
  p_threshold  float   default 0.30
)
returns table (
  id                uuid,
  knowledge_file_id uuid,
  content           text,
  chunk_type        text,
  image_path        text,
  similarity        float
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    dc.id,
    dc.knowledge_file_id,
    dc.content,
    dc.chunk_type,
    dc.image_path,
    1 - (dc.embedding <=> p_embedding) as similarity
  from public.document_chunks dc
  where
    dc.company_id = p_company_id
    and dc.embedding is not null
    and 1 - (dc.embedding <=> p_embedding) > p_threshold
  order by dc.embedding <=> p_embedding
  limit p_limit;
$fn$;

comment on function public.search_knowledge_chunks is
  'Cosine similarity search over a company RAG chunk set. Top-k above a threshold. 384-dim, Supabase gte-small.';


create or replace function public.search_chat_history(
  p_company_id uuid,
  p_user_id    uuid,
  p_embedding  vector(384),
  p_limit      int     default 5,
  p_threshold  float   default 0.30
)
returns table (
  id          uuid,
  content     text,
  occurred_at timestamptz,
  similarity  float
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    cc.id,
    cc.content,
    cc.occurred_at,
    1 - (cc.embedding <=> p_embedding) as similarity
  from public.chat_chunks cc
  where
    cc.company_id = p_company_id
    and cc.user_id = p_user_id
    and cc.embedding is not null
    and 1 - (cc.embedding <=> p_embedding) > p_threshold
  order by cc.embedding <=> p_embedding
  limit p_limit;
$fn$;

comment on function public.search_chat_history is
  'Cosine similarity search over one user past Advisor Q&A pairs. Powers long-term recall. 384-dim, Supabase gte-small.';


create or replace function public.search_safety_documents(
  p_company_id uuid,
  p_embedding  vector(384),
  p_limit      int     default 6,
  p_threshold  float   default 0.30
)
returns table (
  id           uuid,
  title        text,
  doc_type     text,
  content      text,
  chunk_index  int,
  similarity   float
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    sd.id,
    sd.title,
    sd.doc_type,
    sd.content,
    sd.chunk_index,
    1 - (sd.embedding <=> p_embedding) as similarity
  from public.safety_documents sd
  where
    sd.company_id  = p_company_id
    and sd.is_current = true
    and sd.embedding is not null
    and 1 - (sd.embedding <=> p_embedding) > p_threshold
  order by sd.embedding <=> p_embedding
  limit p_limit;
$fn$;

comment on function public.search_safety_documents is
  'Cosine similarity search over a company safety vault. Filters is_current so retired SOP versions do not resurface. 384-dim, Supabase gte-small.';
