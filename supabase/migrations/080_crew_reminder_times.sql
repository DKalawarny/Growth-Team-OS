-- 7 Oct 2026: crew daily-log reminders become per-person and time-aware, so a
-- night crew can be reminded at a different hour than the day crew (Daniel:
-- "select your own times, maybe there is a night crew"). log_hour is the LOCAL
-- hour (0-23) to send; the company's timezone turns that into a real moment.
-- Default 16 (4pm) suits an end-of-shift log better than the old 9am blast.
alter table public.staff_members
  add column if not exists log_hour smallint not null default 16;
alter table public.companies
  add column if not exists timezone text not null default 'America/Edmonton';
