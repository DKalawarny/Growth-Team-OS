-- ============================================================================
-- 034 — remember which profile the roadmap was built from
--
-- Milestones are generated once, from business_profiles, and nothing ever
-- re-read that profile afterwards. Change the profile and the roadmap keeps
-- planning for the company you used to be, while Solomon reasons from both
-- without either knowing the other has moved.
--
-- Storing the inputs alongside the plan is what makes drift detectable at all:
-- without it you can see the current profile and the current milestones, but
-- never whether one was built from the other.
--
-- ⚠️ NULL means "built before this existed", NOT "no drift". Treat null as
-- unknown and stay quiet — warning every existing owner on the day this ships
-- would be crying wolf, and a warning people learn to dismiss is worse than
-- none at all.
-- ============================================================================

alter table public.companies
  add column if not exists roadmap_built_from jsonb;

comment on column public.companies.roadmap_built_from is
  'Snapshot of the business_profiles fields the current roadmap was generated from (see src/lib/roadmapFingerprint.js). Null = roadmap predates this column; treat as unknown, not as "no drift".';
