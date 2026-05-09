-- ============================================================================
-- Milestone weights — per-task contribution to overall plan progress.
--
-- Adds a single column:
--   weight  int  1–10  default 5
--
-- Weight captures the business impact of a milestone so the roadmap's top
-- progress bar can be a *weighted* sum rather than a naive fraction of rows.
-- A plan with "Hire a GM" (weight 10) + "Update email signature" (weight 2)
-- should not treat those as equally significant.
--
-- Math (computed client-side):
--   share_i       = weight_i / Σ weight        // task i's share of the plan
--   contribution  = share_i × (progress_i/100) // how much it contributes now
--   total_done%   = Σ contribution × 100
--
-- Scale choice: 1–10 integer.
--   - Small enough that Claude doesn't overthink the number.
--   - Large enough that "kind of important" (5) vs. "huge" (9) is expressible.
--   - Default 5 backfills existing rows as "equal weight" — identical to the
--     old unweighted behavior, so nothing visually jumps on deploy.
-- ============================================================================

alter table public.milestones
  add column if not exists weight int not null default 5
    check (weight between 1 and 10);

comment on column public.milestones.weight is
  '1–10 impact score assigned by the AI. Drives the weighted progress bar on /roadmap. Default 5 = average.';

-- Backfill not strictly needed (DEFAULT 5 applies to existing rows on ADD
-- COLUMN with NOT NULL + DEFAULT), but be explicit in case this migration is
-- re-run on a partially-migrated DB.
update public.milestones set weight = 5 where weight is null;
