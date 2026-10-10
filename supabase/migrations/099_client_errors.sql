-- A crash on a page, written down where Daniel can see it.
--
-- 10 Oct 2026: the crew's daily log form crashed on every phone for a day and
-- nobody knew until he clicked it himself. The crash screen said "We've logged
-- what happened"; nothing was logged, because the outside error service was
-- never switched on. This is the first-party version: the app writes the crash
-- here and the database emails him (support-notify), so it does not depend on
-- a third service being configured.
--
-- Crew members have no login, so anonymous inserts are allowed. That is why
-- the row is tightly bounded, nobody can read rows back through the API, and
-- the email is rate-limited below.
create table if not exists client_errors (
  id         uuid primary key default gen_random_uuid(),
  message    text not null check (length(message) between 1 and 500),
  stack      text check (stack is null or length(stack) <= 4000),
  page       text check (page is null or length(page) <= 300),
  user_id    uuid,
  company_id uuid,
  notified   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists client_errors_created_idx on client_errors (created_at desc);

alter table client_errors enable row level security;
-- `notified` is set by the trigger below, which overwrites whatever the browser
-- sent, so the policy does not need to (and must not) test it: a BEFORE trigger
-- runs first and the check would then see the trigger's own `true` and refuse.
drop policy if exists client_errors_insert on client_errors;
create policy client_errors_insert on client_errors for insert to anon, authenticated with check (true);
grant insert on client_errors to anon, authenticated;
-- no select / update / delete policy: write-only from the browser

create or replace function public.notify_client_error()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  demo boolean := false;
begin
  NEW.notified := false;   -- never trust the browser's value
  if NEW.company_id is not null then
    select coalesce(is_demo, false) into demo from companies where id = NEW.company_id;
  end if;
  -- One email per distinct crash per six hours, and never more than five an
  -- hour in total, so a looping page (or somebody posting junk with the public
  -- key) cannot fill the inbox. Every crash is still kept as a row.
  if exists (select 1 from client_errors where message = NEW.message and notified and created_at > now() - interval '6 hours')
     or (select count(*) from client_errors where notified and created_at > now() - interval '1 hour') >= 5 then
    return NEW;
  end if;
  NEW.notified := true;
  perform net.http_post(
    url     := 'https://ufhduewbamnmoiksqgfq.supabase.co/functions/v1/support-notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := json_build_object(
      'kind', 'crash',
      'question', NEW.message || E'\n\n' || coalesce(NEW.stack, '(no stack)'),
      'page', NEW.page,
      'name', case when demo then 'a demo visitor' else 'a user' end,
      'company', case when demo then 'the public demo' else coalesce((select name from companies where id = NEW.company_id), 'not signed in (crew page or public page)') end
    )::jsonb
  );
  return NEW;
end;
$$;

drop trigger if exists on_client_error_insert on client_errors;
create trigger on_client_error_insert
  before insert on public.client_errors
  for each row execute function public.notify_client_error();
