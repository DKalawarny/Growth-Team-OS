-- ============================================================================
-- 035 — the daily log
--
-- Daniel, 1 Sep: "a link for a foreman like a daily log would work well."
--
-- ⭐ WHY THIS IS THE HIGHEST-VALUE THING THE FIELD LAYER CAN DO. Asked how to
-- get more out of someone who coasts when unwatched, Solomon reached for
-- exactly this and did not know it existed: "job completion times logged,
-- callbacks tracked by technician, invoices checked against hours on site.
-- When the numbers tell the story, you don't have to catch him yourself."
-- He was telling the owner to go and build a manual tracking habit while
-- sitting inside the product meant to produce it.
--
-- ⚠️ THIS IS NOT SCHEDULING AND MUST NOT BECOME IT. It records what HAPPENED,
-- never what is planned. No dates in the future, no assignment, no calendar.
-- The moment it acquires those it is a dispatch tool and we are competing with
-- Jobber, which is the product Daniel explicitly said he does not want.
--
-- ⚠️ NOT A TIMESHEET EITHER. `hours_on_site` is optional and exists so an
-- owner can see quoted-versus-actual on a job. If it ever gates pay it has
-- become payroll, which carries employment-standards weight this product
-- deliberately refuses to hold.
--
-- One row per person per job per day. Re-submitting the same day updates
-- rather than duplicates — a foreman correcting himself at 6pm should not
-- leave two contradictory accounts of the same day for Solomon to average.
-- ============================================================================

create table if not exists public.daily_logs (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id)      on delete cascade,
  staff_member_id uuid          references public.staff_members(id)  on delete set null,
  author_profile  uuid          references public.profiles(id)       on delete set null,
  work_order_id   uuid          references public.work_orders(id)    on delete set null,

  log_date        date not null default (now() at time zone 'utc')::date,

  -- The only required field. If a foreman writes one sentence at the end of a
  -- long day that is a win, and a form that demands more gets abandoned.
  what_happened   text not null check (length(btrim(what_happened)) > 0),

  -- What stopped the work. This is the field the whole thing exists for:
  -- "people leave over disorganisation" is only checkable if somebody records
  -- the locked door, the missing part, the drawing that never arrived.
  blockers        text,
  hours_on_site   numeric(5,2) check (hours_on_site is null or hours_on_site >= 0),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One account of a given day, per person, per job.
create unique index if not exists daily_logs_one_per_day_idx
  on public.daily_logs (company_id, coalesce(staff_member_id, author_profile), log_date, coalesce(work_order_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists daily_logs_company_date_idx
  on public.daily_logs (company_id, log_date desc);

alter table public.daily_logs enable row level security;

-- Owner-side read/write. The crew never touch this table directly — they come
-- through the staff-portal Edge Function, which holds the service role and is
-- the only place their token is verified. Same shape as work_orders.
create policy daily_logs_company_read on public.daily_logs
  for select using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy daily_logs_company_write on public.daily_logs
  for all using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  ) with check (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

comment on table public.daily_logs is
  'End-of-day account of what actually happened on a job. Records the past, never the future — see 035 header. Feeds BUSINESS_CONTEXT so Solomon reads how the work really goes.';
