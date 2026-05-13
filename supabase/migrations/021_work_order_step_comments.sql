-- ============================================================================
-- GrowthOS — field-level step comments (migration 021)
--
-- The "loop-closing" piece of the playbook system. Crew on a job site can
-- attach a comment or voice-transcribed note to any checklist step they're
-- working on. The comments are tagged by `prompt_type` so the owner — and
-- eventually Solomon — can cluster them later:
--
--     "show me every 'shift_end' comment across kitchen demos"
--     "show me every 'near_miss' flag across this crew lead's jobs"
--     "what do crews flag most often on the dust-barrier step?"
--
-- This is the input stream that lets playbooks improve over time. Most
-- SOP systems capture what the OWNER thinks the job should look like;
-- this captures what the FIELD learned the job actually looks like, and
-- closes the loop so future playbooks reflect both.
--
-- ----------------------------------------------------------------------------
-- IMPORTANT — what this is NOT
--
-- This is NOT a safety-compliance record. FLHA (Field Level Hazard
-- Assessment), toolbox talks, incident reports, signoffs — anything that
-- has to be retrievable, defensible, signed, and legal-grade — lives in
-- the CRM's safety module, not here. Those are records; these are
-- insights.
--
-- The 'near_miss' prompt_type below is intentionally framed (in the UI
-- and docs) as "flag for office" — a low-friction way for the crew to
-- get something on the owner's radar. It is NOT a substitute for the
-- formal incident-report flow in the CRM. The two systems hand off:
-- a comment tagged 'near_miss' here may later prompt the crew "want to
-- open a formal report in the CRM?" but the comment itself is just a
-- learning-stream entry, not a compliance artifact.
--
-- Keeping this line clean matters. If `work_order_step_comments` ever
-- becomes the de-facto incident log, we'll have a tool that's neither
-- a good record (free-form, no signoff, no retention guarantees) nor a
-- good learning stream (sanitized for the lawyer). Don't let it drift.
--
-- ----------------------------------------------------------------------------
-- Key design choices
--
-- 1. Comments hang off checklist items, not work orders directly.
--    A comment without a step anchor is much harder to cluster ("what
--    do crews say about Job #1042?" vs "what do crews say about the
--    cut-and-cap step across all kitchen demos?"). Step-anchored is
--    the version Solomon can actually learn from.
--
-- 2. work_order_id and company_id are denormalized onto each row.
--    Lets us scope queries by company / WO without joining through
--    work_order_checklist_items → work_orders every time. Trade-off:
--    a tiny bit of write redundancy for a lot of read simplicity (and
--    cleaner RLS — we can scope by company_id directly on the table).
--
-- 3. Author splits into two nullable FKs (mirrors checklist done_by).
--    staff_member_id — field crew via the magic-link portal
--    user_id          — office user via the Board (future: owner replies)
--    Exactly one is set in practice but we don't enforce at DB.
--
-- 4. is_voice flag (vs storing audio).
--    We store the TRANSCRIPT, not the audio. Reasons:
--      - Transcripts are searchable; audio isn't
--      - Solomon reads text; he doesn't listen
--      - Audio storage costs add up fast at scale
--    The flag lets the UI render a 🎤 badge so the owner knows the
--    crew spoke this rather than typed it (sometimes voice transcripts
--    have quirks worth allowing for).
--
-- 5. prompt_type is a closed enum (CHECK constraint, not a separate table).
--    The set of prompts is owned by the codebase, not by users. Easier
--    to evolve via migration than to keep a parallel reference table in
--    sync. Defaults to 'free' for the always-available 💬 button.
--
-- 6. RLS mirrors 020: company members manage. Staff-portal edge function
--    uses service-role and does its own auth via the staff token.
-- ============================================================================


create table public.work_order_step_comments (
  id                       uuid        primary key default gen_random_uuid(),

  -- Anchor: which step on which job did this comment come from?
  checklist_item_id        uuid        not null references public.work_order_checklist_items(id) on delete cascade,
  work_order_id            uuid        not null references public.work_orders(id)                on delete cascade,
  company_id               uuid        not null references public.companies(id)                   on delete cascade,

  -- Authorship — exactly one of these is set in practice.
  staff_member_id          uuid        references public.staff_members(id) on delete set null,
  user_id                  uuid        references public.profiles(id)      on delete set null,

  -- Body.
  text                     text        not null check (length(text) > 0 and length(text) <= 4000),
  is_voice                 boolean     not null default false,

  -- Cluster key. 'free' = the always-on 💬 button; the others are
  -- workflow-triggered prompts the platform fires at known moments.
  -- Keep this list aligned with the UI in StaffPortal.jsx — adding a
  -- new prompt requires a migration so we can't drift silently.
  prompt_type              text        not null default 'free'
    check (prompt_type in (
      'free',           -- always-available comment on a step
      'start_walk',     -- "anything different from quote when you walked the site?"
      'shift_end',      -- "anything slow you down today / missing from the truck?"
      'step_complete',  -- "anything to add for the next crew on this step?"
      'job_close',      -- "what would you tell the next foreman on this kind of job?"
      'near_miss'       -- "flag this for the office" — insight stream, NOT FLHA
                        --  compliance. FLHA / formal incident reports live in
                        --  the CRM. UI labels this "Flag for office" to keep
                        --  the line clear; the schema value stays 'near_miss'
                        --  because that's the cluster Solomon will look for.
    )),

  created_at               timestamptz not null default now()
);


-- Read indexes — the access patterns we know we'll hit:
--   1. "Show me every comment on this WO" — owner reading a job
--   2. "Show me every comment on this step" — Solomon clustering
--   3. "Show me every comment of type X across this company" — digest job
create index work_order_step_comments_wo_id_idx
  on public.work_order_step_comments(work_order_id, created_at desc);

create index work_order_step_comments_item_id_idx
  on public.work_order_step_comments(checklist_item_id, created_at desc);

create index work_order_step_comments_company_prompt_idx
  on public.work_order_step_comments(company_id, prompt_type, created_at desc);


-- ============================================================================
-- Row-Level Security — "any company member can read/write" pattern (matches 020)
-- ============================================================================

alter table public.work_order_step_comments enable row level security;

create policy "Company members can manage step comments"
  on public.work_order_step_comments for all
  using (
    company_id = (select company_id from public.profiles where id = auth.uid())
  )
  with check (
    company_id = (select company_id from public.profiles where id = auth.uid())
  );
