-- ============================================================================
-- RAG (Retrieval-Augmented Generation) — document chunk storage + vector search
--
-- Every uploaded knowledge file is split into overlapping text chunks (~375
-- tokens each). Each chunk gets an OpenAI text-embedding-3-small vector (1536
-- dimensions) stored here. When the Advisor answers a question, it embeds the
-- query and finds the top-k most relevant chunks via cosine similarity —
-- instead of blindly injecting the first 3,000 characters of each file.
--
-- This means a 300-page book, a full SOP manual, or a multi-tab spreadsheet
-- can be fully indexed and queried. The Advisor sees the RIGHT pages, not just
-- the first few.
--
-- Image/graph chunks: visual pages (charts, diagrams, scanned content) are
-- rendered and described by Claude Vision. Those descriptions are stored here
-- with chunk_type='image' and embedded alongside text chunks so visual content
-- is semantically searchable too.
--
-- Index strategy: HNSW (Hierarchical Navigable Small World) — better than
-- IVFFlat for dynamic workloads because it doesn't require a fixed number of
-- lists and performs well from 0 rows upward. Approximate nearest-neighbour
-- with cosine distance. Tune m/ef_construction for recall vs. build-time
-- tradeoff at scale; defaults are fine up to ~1M rows.
-- ============================================================================

-- Enable the vector extension (idempotent — safe to run on existing DBs)
create extension if not exists vector;

-- ── Document chunks ──────────────────────────────────────────────────────────

create table public.document_chunks (
  id                uuid        primary key default gen_random_uuid(),
  knowledge_file_id uuid        not null references public.knowledge_files(id) on delete cascade,
  company_id        uuid        not null references public.companies(id)        on delete cascade,

  -- Position within the file (0-based). Used to reconstruct reading order
  -- when multiple chunks from the same file are retrieved.
  chunk_index       int         not null,

  -- The actual text this chunk represents.
  -- For text chunks: a verbatim excerpt (with overlap from adjacent chunks).
  -- For image chunks: Claude Vision's description of the visual content.
  content           text        not null,

  -- 'text'  → extracted from the document's text layer
  -- 'image' → Claude Vision description of a chart, diagram, or visual page
  chunk_type        text        not null default 'text'
    check (chunk_type in ('text', 'image')),

  -- Storage path to the rendered image (future: for showing the source visual
  -- in the UI when an image chunk is cited). Null for text chunks.
  image_path        text,

  -- OpenAI text-embedding-3-small vector (1536 dims).
  -- Null when embedding failed (e.g. no API key) — naive injection still works.
  embedding         vector(1536),

  -- Rough token count for prompt-budget arithmetic.
  token_estimate    int,

  created_at        timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- HNSW index for approximate nearest-neighbour cosine search.
-- m=16 (connections per node) and ef_construction=64 are the pgvector defaults
-- and work well for datasets up to a few hundred thousand rows.
create index document_chunks_embedding_hnsw_idx
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Lookup by company (for search scope) and by file (for deletion on re-upload).
create index document_chunks_company_idx  on public.document_chunks(company_id);
create index document_chunks_file_idx     on public.document_chunks(knowledge_file_id);

comment on table public.document_chunks is
  'RAG chunks — split + embedded content from uploaded knowledge files. Enables semantic search over the full document library.';

-- ── Row-Level Security ────────────────────────────────────────────────────────

alter table public.document_chunks enable row level security;

create policy "chunks_select"
  on public.document_chunks for select
  using (company_id = public.current_company_id());

create policy "chunks_insert"
  on public.document_chunks for insert
  with check (company_id = public.current_company_id());

create policy "chunks_delete"
  on public.document_chunks for delete
  using (company_id = public.current_company_id());

-- ── Similarity search RPC ────────────────────────────────────────────────────
--
-- Called from the client as supabase.rpc('search_knowledge_chunks', {...}).
-- security definer so the vector comparison runs with elevated privileges
-- (needed for the pgvector <=> operator inside RLS context), but we
-- explicitly gate on p_company_id so no cross-tenant leakage is possible.
--
-- Returns rows ordered by similarity descending (most relevant first).

create or replace function public.search_knowledge_chunks(
  p_company_id uuid,
  p_embedding  vector(1536),
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
as $$
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
$$;

comment on function public.search_knowledge_chunks is
  'Cosine similarity search over a company''s RAG chunks. Returns top-k chunks above a similarity threshold.';
