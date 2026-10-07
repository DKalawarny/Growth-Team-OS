-- 7 Oct 2026: remember when a crew member was last sent their log link, so the
-- owner can see "Sent today" persistently (Daniel: "once sent for the day it
-- should stay saying sent for the day so we know it went out"). Set by the
-- hourly reminder cron and by the manual "Send link" button. "Today" is judged
-- in the company's timezone in the UI.
alter table public.staff_members
  add column if not exists last_link_sent_at timestamptz;
