-- ============================================================================
-- 041 — the foreman's sheet
--
-- Daniel: "we should have a template for the foreman — near misses, injuries,
-- who's on site, what happened etc. There are many things that can be answered
-- on a foreman sheet."
--
-- ⭐ WHO WAS ON SITE is the quiet valuable one. It is how hours become
-- checkable, how you know who else saw a near miss, and the only way "Marcus
-- was carrying it alone again" ever becomes visible instead of being something
-- the owner half-notices a year later. Free text on purpose — a crew includes
-- subs, a supplier's fitter and the client's caretaker, and a picker limited to
-- staff_members would quietly drop exactly the people worth recording.
--
-- ⚠️ INJURY IS A FLAG, NOT A REPORT. The moment someone records an injury the
-- owner is in WorkSafeBC territory with reporting deadlines and a formal
-- record. This captures THAT it happened so the owner hears immediately —
-- Daniel: "the quicker Solomon knows the better" — and then gets out of the
-- way. It must never look like the incident report. An owner who believes he
-- has filed something he has not is worse off than one who knows he has not.
--
-- safety_note covers the near-miss case. There is already a 'near_miss' type on
-- work_order_step_comments (migration 021) with a CRM escalation seam sketched
-- beside it; this is the same idea on the surface the crew actually uses at the
-- end of the day rather than pinned to one checklist step.
-- ============================================================================

alter table public.daily_logs
  add column if not exists who_on_site text,
  add column if not exists safety_note text,
  add column if not exists injury      boolean not null default false;

-- The owner needs to find these instantly, and they are rare, so a partial
-- index costs nothing and makes "has anything happened" a fast question.
create index if not exists daily_logs_injury_idx
  on public.daily_logs (company_id, log_date desc) where injury;

create index if not exists daily_logs_safety_idx
  on public.daily_logs (company_id, log_date desc) where safety_note is not null;

comment on column public.daily_logs.who_on_site is
  'Free text. Crews include subs and other trades; a picker over staff_members would drop exactly the people worth recording.';
comment on column public.daily_logs.injury is
  'A FLAG so the owner hears immediately. NOT an incident report — see 041 header.';
