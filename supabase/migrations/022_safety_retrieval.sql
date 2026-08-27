-- ============================================================================
-- Eliv8 OS — Solomon-grade safety retrieval (migration 022)
--
-- Two pieces of plumbing so Solomon can answer safety questions by reading
-- the owner's actual documents AND citing the right regulatory authority,
-- instead of his current behaviour (blanket "go ask WorkSafe BC").
--
--   1. search_safety_documents()  — RPC that does cosine search over the
--                                   per-company safety_documents vault.
--                                   Mirrors search_knowledge_chunks() but
--                                   on the safety vault, not the general
--                                   knowledge_files chunks.
--
--   2. regulatory_sources          — small reference table mapping
--                                   (jurisdiction, topic) → canonical
--                                   regulation URL + authority. Lets Solomon
--                                   cite a real link instead of paraphrasing
--                                   training data. Shared across all tenants
--                                   (it's public reference data).
--
-- ----------------------------------------------------------------------------
-- Why this is the right shape
--
-- The Safety page (/tools/safety) already does compliance Q&A on uploaded
-- docs — but it does it by stuffing the full doc text into a Haiku prompt.
-- That works at small vaults; it breaks when a company has 30+ SDS sheets
-- and SOP PDFs. The `embedding` column on safety_documents has been there
-- since migration 001, just unused. This RPC turns it on.
--
-- The regulatory_sources table is the cheap option from the architecture
-- doc — a curated URL registry, NOT a scraped regulation corpus. Solomon
-- still answers from his training when quoting regulation text; this table
-- just gives him the right link to cite. If/when we want regulation TEXT
-- in retrieval (the "pre-indexed corpus" option), we'd add a second table
-- regulatory_chunks with embeddings — but URLs alone solve 80% of the
-- "stop making up sources" problem at 5% of the build cost.
--
-- ----------------------------------------------------------------------------
-- Boundary reminder (still holds)
--
-- This makes Solomon better at FACTUAL LOOKUPS ("what does our confined-
-- space SOP say?", "what's the WorkSafe BC reg on silica?"). It does NOT
-- turn him into a legal advisor. The prompts.js carve-out keeps him out of
-- legal-judgment territory (appeals, classification disputes, etc.) — he
-- still redirects those to the rule-holder. Retrieval just removes the
-- redirect on questions the docs/registry can actually answer.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. search_safety_documents — cosine search RPC over the safety vault
-- ----------------------------------------------------------------------------
--
-- Same shape as search_knowledge_chunks (migration 012). Returns rows
-- ordered by similarity desc so callers can take a top-k slice.
--
-- security definer because pgvector's <=> operator inside RLS context
-- needs elevated read; we explicitly gate on p_company_id to prevent
-- cross-tenant leakage. is_current = true filters out superseded versions
-- (the vault tracks document versioning via the version + is_current cols).

create or replace function public.search_safety_documents(
  p_company_id uuid,
  p_embedding  vector(1536),
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
as $$
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
$$;

comment on function public.search_safety_documents is
  'Cosine similarity search over a company''s safety_documents vault. '
  'Filters to is_current = true so retired SOP versions don''t resurface. '
  'Used by advisorContext to give Solomon retrieval-grounded answers.';


-- ----------------------------------------------------------------------------
-- 2. regulatory_sources — curated URL registry for citations
-- ----------------------------------------------------------------------------
--
-- One row per (jurisdiction, topic). Solomon looks up the matching row(s)
-- when answering a safety question and cites the canonical URL + authority
-- name in his response. Hand-curated — small set, stays accurate, no
-- scraping pipeline to maintain.
--
-- Schema choices:
--   - jurisdiction:    short code matching jurisdictionLinks.js convention
--                      ("CA-BC", "CA-AB", "US-OSHA"). Federal-scope regs
--                      (e.g. OSHA, CCOHS) use a country-level code so the
--                      lookup can fall back when no province match exists.
--   - topic:           short slug — 'silica', 'fall-protection', 'confined-
--                      space', 'asbestos', 'wcb-reporting', 'lockout-tagout'.
--                      Closed in practice but kept as text (not enum) so we
--                      can add topics without migrations.
--   - regulation_name: e.g. "WorkSafe BC OHS Reg Part 6 — Substance Specific"
--   - authority_name:  who issued it — "WorkSafeBC", "OSHA", "Alberta OHS"
--   - canonical_url:   the EXACT page the owner should land on
--   - summary:         optional one-paragraph plain-English summary so
--                      Solomon can quote it without making things up.
--                      Keep terse — citations should drive owners to the URL.
--   - last_verified:   date we last hand-checked the URL still 200s and
--                      still describes the same regulation. Re-check annually.
--
-- RLS: this table is REFERENCE DATA, same for all tenants. Public read.
-- Writes are admin-only via service-role (no public write policy).

create table public.regulatory_sources (
  id              uuid        primary key default gen_random_uuid(),
  jurisdiction    text        not null,
  topic           text        not null,
  regulation_name text        not null,
  authority_name  text        not null,
  canonical_url   text        not null,
  summary         text,
  last_verified   date        not null default current_date,
  created_at      timestamptz not null default now(),

  -- One row per (jurisdiction, topic, regulation). Multiple regs per topic
  -- is fine (e.g. silica has both an OHS reg and a CSA standard) but the
  -- exact same triple shouldn't duplicate.
  unique (jurisdiction, topic, regulation_name)
);

create index regulatory_sources_lookup_idx
  on public.regulatory_sources(jurisdiction, topic);

comment on table public.regulatory_sources is
  'Reference table of canonical regulation URLs by jurisdiction + topic. '
  'Read by Solomon at answer time so safety citations link to real authorities '
  'instead of being paraphrased from model training data.';


alter table public.regulatory_sources enable row level security;

-- Anyone authenticated can read — it's the same for all tenants and gives
-- the advisor + safety tool a citation lookup. No PII, no per-tenant data.
create policy "regulatory_sources_public_read"
  on public.regulatory_sources for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies — only service-role can write (via
-- seed scripts or migrations). Keep it that way; this is curated content.


-- ----------------------------------------------------------------------------
-- Seed rows — starting set for the trades Eliv8 OS is launching into.
--
-- These are the regulations a demo / strip-out / commercial-renovation
-- crew is most likely to hit. Add jurisdictions and topics as we grow.
-- Re-check URLs each annual audit (last_verified column).
-- ----------------------------------------------------------------------------

insert into public.regulatory_sources
  (jurisdiction, topic, regulation_name, authority_name, canonical_url, summary)
values
  -- ── British Columbia ───────────────────────────────────────────────────
  ('CA-BC', 'silica',
   'OHS Regulation Part 6 — Substance Specific Requirements (Silica)',
   'WorkSafeBC',
   'https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-06-substance-specific-requirements',
   'Exposure control plan required when respirable crystalline silica may be released. Wet methods, local exhaust, and respiratory protection where engineering controls insufficient.'),

  ('CA-BC', 'asbestos',
   'OHS Regulation Part 6.1 — Asbestos',
   'WorkSafeBC',
   'https://www.worksafebc.com/en/health-safety/hazards-exposures/asbestos',
   'Pre-1990 building materials must be assumed asbestos-containing unless tested. Licensed asbestos abatement contractor required for removal. Mandatory worker registry as of 2024.'),

  ('CA-BC', 'fall-protection',
   'OHS Regulation Part 11 — Fall Protection',
   'WorkSafeBC',
   'https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-11-fall-protection',
   'Fall protection required at 3m (10ft) or where a fall could cause injury. Written fall-protection plan needed for work above 7.5m or where conventional systems not used.'),

  ('CA-BC', 'confined-space',
   'OHS Regulation Part 9 — Confined Spaces',
   'WorkSafeBC',
   'https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-09-confined-spaces',
   'Written confined-space entry program, hazard assessment, atmospheric testing, attendant, and rescue plan required before entry.'),

  ('CA-BC', 'lockout-tagout',
   'OHS Regulation Part 10 — De-energization and Lockout',
   'WorkSafeBC',
   'https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-10-de-energization-and-lockout',
   'Written lockout procedure for each piece of equipment with hazardous energy. Personal locks, group lockout where multiple workers involved.'),

  ('CA-BC', 'wcb-reporting',
   'Workers Compensation Act — Employer Reporting Duties',
   'WorkSafeBC',
   'https://www.worksafebc.com/en/claims/report-workplace-injury-illness/how-report-injury',
   'Form 7 (Employer''s Report of Injury) must be submitted within 3 business days of becoming aware of an injury requiring medical attention or causing lost time.'),

  -- ── Alberta ────────────────────────────────────────────────────────────
  ('CA-AB', 'silica',
   'OHS Code Part 4 — Chemical Hazards, Biological Hazards and Harmful Substances',
   'Alberta OHS',
   'https://www.alberta.ca/ohs-act-regulation-code',
   'Code of practice required where worker may be exposed to silica above OEL. Air monitoring, controls, and medical surveillance per Schedule 1.'),

  ('CA-AB', 'asbestos',
   'OHS Code Part 4 — Asbestos, Silica, Coal Dust and Lead',
   'Alberta OHS',
   'https://www.alberta.ca/ohs-act-regulation-code',
   'Asbestos abatement work classified by risk (low/moderate/high); licensed contractor and worker training required for moderate/high risk.'),

  ('CA-AB', 'fall-protection',
   'OHS Code Part 9 — Fall Protection',
   'Alberta OHS',
   'https://www.alberta.ca/ohs-act-regulation-code',
   'Fall protection required at 3m or where a fall could cause injury. Fall-protection plan required where conventional systems not used.'),

  ('CA-AB', 'wcb-reporting',
   'WCB-Alberta Employer Reporting',
   'WCB Alberta',
   'https://www.wcb.ab.ca/claims/report-an-injury.html',
   'Employer''s Report of Injury due within 72 hours of becoming aware of an injury requiring medical aid or causing lost time beyond day of accident.'),

  -- ── Ontario ────────────────────────────────────────────────────────────
  ('CA-ON', 'silica',
   'OHSA Regulation 833 — Control of Exposure to Biological or Chemical Agents (Silica)',
   'Ontario Ministry of Labour',
   'https://www.ontario.ca/laws/regulation/900833',
   'Designated substance regulation. Control program, worker training, medical surveillance for crystalline silica exposure.'),

  ('CA-ON', 'asbestos',
   'OHSA Regulation 278/05 — Asbestos on Construction Projects and in Buildings and Repair Operations',
   'Ontario Ministry of Labour',
   'https://www.ontario.ca/laws/regulation/050278',
   'Type 1/2/3 operation classification. Type 3 (high-risk) requires licensed contractor, full enclosure, decon facilities, and MOL notification.'),

  ('CA-ON', 'wcb-reporting',
   'WSIB Employer Reporting (Form 7)',
   'WSIB Ontario',
   'https://www.wsib.ca/en/businesses/claims/reporting-workplace-injuryillness',
   'Form 7 must be filed within 3 business days of learning of a reportable injury (lost time, medical aid beyond first aid, or modified work).'),

  -- ── US Federal (OSHA) — applies across all US states unless state-plan ─
  ('US-OSHA', 'silica',
   '29 CFR 1926.1153 — Respirable Crystalline Silica (Construction)',
   'OSHA',
   'https://www.osha.gov/silica-crystalline/construction',
   'PEL 50 μg/m³ over 8 hours. Written exposure control plan, Table 1 task-specific controls, medical surveillance at 30+ days/year above action level.'),

  ('US-OSHA', 'asbestos',
   '29 CFR 1926.1101 — Asbestos (Construction)',
   'OSHA',
   'https://www.osha.gov/asbestos/construction',
   'Class I-IV work classification. Competent person required, regulated areas, exposure assessment, respiratory protection per class.'),

  ('US-OSHA', 'fall-protection',
   '29 CFR 1926 Subpart M — Fall Protection',
   'OSHA',
   'https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926SubpartM',
   'Fall protection required at 6 ft (1.8m) for general construction. Written fall-protection plan only for leading-edge / precast / residential roofing when conventional systems infeasible.'),

  ('US-OSHA', 'confined-space',
   '29 CFR 1926 Subpart AA — Confined Spaces in Construction',
   'OSHA',
   'https://www.osha.gov/confined-spaces/construction',
   'Permit-required confined space program. Pre-entry atmospheric testing, attendant, rescue services identified before entry.'),

  ('US-OSHA', 'lockout-tagout',
   '29 CFR 1910.147 — The Control of Hazardous Energy (Lockout/Tagout)',
   'OSHA',
   'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147',
   'Written energy-control program. Per-machine procedures, annual inspection, employee training. Construction uses 1926.417 (similar scope).')
on conflict (jurisdiction, topic, regulation_name) do nothing;
