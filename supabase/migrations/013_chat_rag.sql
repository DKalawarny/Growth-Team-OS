-- ============================================================================
-- Chat history RAG — semantic memory over past Advisor conversations.
--
-- Problem the old system had:
--   Solomon only ever saw the last 20 messages (HISTORY_TURNS_SENT). A
--   conversation about hiring from 3 months ago was invisible. A pricing
--   discussion from last year? Gone. The owner had to re-explain context
--   they'd already covered.
--
-- How this fixes it:
--   Every completed Q&A exchange (user message + Solomon reply) is embedded
--   as a single chunk and stored here. When the owner asks a new question,
--   we do a cosine search over ALL past exchanges and surface the top-k most
--   relevant ones — even if they happened a year ago. Solomon reads the
--   retrieved exchanges as "relevant past conversations" alongside the recent
--   message window, giving it genuine long-term memory without blowing the
--   prompt budget with every message ever sent.
--
-- Schema note: this is separate from document_chunks (which holds knowledge
-- file content) because chat exchanges have different metadata (user_id,
-- occurred_at) and a different deletion lifecycle — we never bulk-delete
-- chat history the way we re-index a file on re-upload.
-- ============================================================================

create table public.chat_chunks (
  id          uuid        primary key default gen_random_uuid(),
  company_id  uuid        not null references public.companies(id) on delete cascade,
  user_id     uuid        references public.profiles(id) on delete set null,

  -- The Q&A pair formatted as plain text:
  -- "Q: <user message>\nA: <solomon reply>"
  -- Stored verbatim so retrieved chunks are readable in the prompt.
  content     text        not null,

  -- OpenAI text-embedding-3-small vector (1536 dims).
  embedding   vector(1536),

  -- When the exchange actually happened (for temporal context in the prompt).
  occurred_at timestamptz not null,

  created_at  timestamptz not null default now()
);

-- HNSW index for fast cosine similarity search.
create index chat_chunks_embedding_hnsw_idx
  on public.chat_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index chat_chunks_company_idx on public.chat_chunks(company_id);
create index chat_chunks_user_idx    on public.chat_chunks(company_id, user_id);

comment on table public.chat_chunks is
  'Embedded Advisor Q&A pairs — enables semantic long-term memory over chat history.';

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.chat_chunks enable row level security;

create policy "chat_chunks_select"
  on public.chat_chunks for select
  using (company_id = public.current_company_id());

create policy "chat_chunks_insert"
  on public.chat_chunks for insert
  with check (company_id = public.current_company_id());

create policy "chat_chunks_delete"
  on public.chat_chunks for delete
  using (company_id = public.current_company_id());

-- ── Similarity search RPC ────────────────────────────────────────────────────

create or replace function public.search_chat_history(
  p_company_id uuid,
  p_user_id    uuid,
  p_embedding  vector(1536),
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
as $$
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
$$;

comment on function public.search_chat_history is
  'Cosine similarity search over a user''s past Advisor Q&A pairs. Powers long-term memory.';
