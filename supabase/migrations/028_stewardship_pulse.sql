-- ============================================================================
-- GrowthOS — Stewardship pulse (migration 028)
--
-- Two extra things a weekly check-in can record: days genuinely not worked,
-- and giving. Both feed the twelve-month trajectory so the owner can see, over
-- months, whether revenue is climbing while rest and generosity flatten — the
-- picture a revenue chart is structurally incapable of showing.
--
-- ⚠️ The design constraint matters more than the columns.
--
-- The obvious version of this feature — "did you keep Sabbath this week?" —
-- is precisely the guilt-driven engagement mechanic the product brief rules
-- out. Asked weekly, scored, and streaked, it turns an app that is supposed
-- to reduce an owner's load into one more thing quietly grading him on a
-- Monday morning.
--
-- So: both fields are OPTIONAL, phrased as observations rather than
-- questions about obedience, never shown with a target or a streak beside
-- them, and never summarised as a score. They are counted, not graded.
--
-- Giving is additionally OPT-IN at the company level. Nobody's tithing gets
-- asked about because they signed up for business software — that reads as a
-- purity test, and it is the single most likely field to make a guarded buyer
-- close the tab.
-- ============================================================================

alter table public.checkins
  -- Days in the period the owner genuinely did not work. Deliberately a plain
  -- count and not "sabbath_kept boolean" — a number can be observed, a yes/no
  -- about Sabbath can only be passed or failed.
  add column if not exists days_off int check (days_off between 0 and 7),

  -- What was given in the period, in the company's own currency. Null means
  -- "not tracked" or "not answered", and those are never distinguished in the
  -- UI — an unanswered field must never look like a zero.
  add column if not exists gave_amount numeric(12,2) check (gave_amount >= 0);

alter table public.companies
  -- Off by default, and only ever turned on by the owner from settings. If
  -- this is false the giving field does not render and Solomon does not raise
  -- the subject.
  add column if not exists track_giving boolean not null default false;

comment on column public.checkins.days_off is
  'Days genuinely not worked. Observed, never scored — no target, no streak.';
comment on column public.checkins.gave_amount is
  'Giving for the period. Only collected when companies.track_giving is true. Null is never rendered as zero.';
comment on column public.companies.track_giving is
  'Opt-in. Giving is never asked about by default — an unrequested question about tithing reads as a purity test.';
