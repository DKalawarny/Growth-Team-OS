-- 087: owner's note on a daily log can be shared with the crew (default) or kept private.
-- The crew see a shared note on their job in the staff portal; Solomon sees it either way.
alter table public.daily_logs
  add column if not exists pm_note_shared boolean not null default true;
comment on column public.daily_logs.pm_note_shared is
  'Owner note (pm_note) visible to the field crew on the staff portal. Default true. Solomon reads pm_note regardless.';
