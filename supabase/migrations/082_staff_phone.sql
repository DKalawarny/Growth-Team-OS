-- 7 Oct 2026: a phone number per crew member, so the daily log link can be
-- TEXTED, not just emailed (Daniel: "some people don't check email"). Texting
-- itself needs an SMS provider + A2P registration; this just holds the number.
alter table public.staff_members
  add column if not exists phone text;
