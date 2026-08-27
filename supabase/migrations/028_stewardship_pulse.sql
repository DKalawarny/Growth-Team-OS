-- ============================================================================
-- Eliv8 OS — Giving in the check-in (migration 028)
--
-- One optional field: what was given in the period. It feeds the twelve-month
-- trajectory, so an owner can see over months whether revenue climbs while
-- generosity flattens — a picture a revenue chart structurally cannot show.
--
-- ⚠️ OPT-IN, and off by default. Asking an owner about his giving because he
-- signed up for business software reads as a purity test, and it is the single
-- field most likely to make a guarded buyer close the tab. If the flag is
-- false the input does not render and Solomon does not raise the subject.
--
-- Null is never rendered as zero. "Didn't say" and "gave nothing" are
-- different facts and only one of them is a problem.
--
-- A rest / days-off column was drafted here and cut before it shipped —
-- Daniel's call. Any future version of it must not be a yes/no about Sabbath:
-- a count can be answered honestly on a bad week, an obedience question can
-- only be passed or failed, and this product does not grade people.
-- ============================================================================

alter table public.checkins
  add column if not exists gave_amount numeric(12,2) check (gave_amount >= 0);

alter table public.companies
  add column if not exists track_giving boolean not null default false;

comment on column public.checkins.gave_amount is
  'Giving for the period. Only collected when companies.track_giving is true. Null is never rendered as zero.';
comment on column public.companies.track_giving is
  'Opt-in, default false. Giving is never asked about unless the owner turns it on.';
