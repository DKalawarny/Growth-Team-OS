-- 7 Oct 2026: structured "who was on site" so Solomon knows who worked where
-- (Daniel). The crew tap names from the roster; anyone not on it (subs,
-- visitors) still goes in the free-text who_on_site. Names resolve from these
-- ids in the advisor context and the owner's log view.
alter table public.daily_logs
  add column if not exists on_site_staff_ids uuid[];
