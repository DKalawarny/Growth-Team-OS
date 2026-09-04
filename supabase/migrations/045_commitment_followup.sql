-- ============================================================================
-- Eliv8 OS — Following up on what the owner said he would do (migration 045)
--
-- Migration 027 gave Solomon memory, including kind='commitment', described in
-- its own extractor as "something they said they would do, THAT SOMEONE SHOULD
-- FOLLOW UP." Nobody ever did. A commitment written down in June was injected
-- into every prompt for the rest of time as a static line and never once
-- turned into a question. That is a diary, not accountability.
--
-- This is the difference between an advisor and a notepad, and it is the one
-- thing the alternatives structurally cannot do:
--   - a bookkeeper tells you what already happened
--   - a work-management tool tells you what is late on a board somebody has to
--     maintain
--   - a general-purpose chatbot gives good advice and forgets it on close
--   - EOS software (Ninety, Bloom) DOES track commitments properly — but as
--     Rocks typed into a form each quarter by a leadership team following a
--     methodology, usually with a paid implementer. Our owner IS the
--     leadership team, and he is in a truck.
-- Here the commitment falls out of a conversation he was having anyway. Nobody
-- enters anything. Same argument as the foreman's daily log.
--
-- ⚠️ THE FAILURE MODE IS NAGGING, NOT FORGETTING. The standing criticism of
-- every AI coach is that it either agrees with everything or turns into a
-- checklist that grades you. Both are worse than silence. The schema is built
-- so the restraint is STRUCTURAL rather than a line in a prompt that the model
-- can drift from:
--
--   asked_at   — set the moment a commitment is handed to the opener as
--                material. Once set it is never handed over again. Solomon
--                gets exactly one ask per commitment, ever. If it mattered and
--                he ignored it, he can raise it himself.
--   outcome    — ONLY the owner's own answer sets this. Silence is not a
--                verdict, and nothing in the system may infer 'dropped' from
--                a lack of reply. An unanswered commitment stays open forever
--                and simply stops being mentioned.
--
-- 'changed' is a first-class outcome sitting beside 'kept', not a softer word
-- for failure. An owner who reconsiders a decision because the facts moved is
-- doing the thing this product exists to help him do. Recording that as a miss
-- would teach him to stop saying what he intends to do out loud, which would
-- destroy the input the whole feature runs on.
--
-- There is deliberately NO counter and NO score. Per migration 028: this
-- product does not grade people.
-- ============================================================================

alter table public.solomon_memory
  -- When to ask. Null is the common case and is fine — most commitments are
  -- said without a date, and lib/memory.js falls back to a grace period rather
  -- than pressing the owner for a deadline he never offered.
  add column if not exists due_on      date,

  -- One ask, ever. See above — this is the anti-nag guarantee.
  add column if not exists asked_at    timestamptz,

  add column if not exists outcome     text
                                       check (outcome in ('kept','dropped','changed')),
  -- What he actually said, in his words. The reason a commitment was dropped
  -- is usually a more useful fact than the drop: "couldn't, the estimator
  -- quit" is a staffing problem wearing a missed-commitment coat.
  add column if not exists outcome_note text
                                       check (outcome_note is null
                                              or char_length(outcome_note) <= 600),
  add column if not exists outcome_at  timestamptz;

-- The hot path: "is there anything he said he'd do that I have never asked
-- about?" Partial so it stays small no matter how much memory accumulates.
create index if not exists solomon_memory_open_commitments_idx
  on public.solomon_memory (company_id, due_on)
  where status = 'active' and kind = 'commitment'
    and outcome is null and asked_at is null;

comment on column public.solomon_memory.due_on is
  'When the owner said it would be done. Null when he named no date; memory.js then uses a grace period.';
comment on column public.solomon_memory.asked_at is
  'Set when handed to the morning opener as material. Once set, never offered again — one ask per commitment, ever.';
comment on column public.solomon_memory.outcome is
  'Set ONLY by the owner''s own answer. Never inferred from silence. "changed" sits beside "kept", it is not a failure.';
