-- A question from the Help page that Solomon could not answer, or a problem
-- somebody reported. Kept as a row AND emailed to Daniel (support-notify), so
-- nothing depends on support@eliv8os.com, which has no mailbox behind it.
create table if not exists support_requests (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  user_id        uuid not null references profiles(id)  on delete cascade,
  kind           text not null default 'question' check (kind in ('question', 'problem')),
  question       text not null check (length(btrim(question)) > 0 and length(question) <= 4000),
  solomon_answer text,
  page           text,
  created_at     timestamptz not null default now()
);
create index if not exists support_requests_company_idx on support_requests (company_id, created_at desc);

alter table support_requests enable row level security;
-- A person files their own, for their own company, and can read their own back.
create policy support_requests_insert on support_requests
  for insert with check (user_id = auth.uid() and company_id = current_company_id());
create policy support_requests_read on support_requests
  for select using (user_id = auth.uid());
grant select, insert on support_requests to authenticated;

create or replace function public.notify_support_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  co  record;
  who record;
begin
  select name, is_demo into co from companies where id = NEW.company_id;
  -- The public demo is toured by strangers. Their test messages are kept as
  -- rows and never emailed, or the demo becomes a way to fill an inbox.
  if coalesce(co.is_demo, false) then return NEW; end if;
  select p.name, u.email into who from profiles p left join auth.users u on u.id = p.id where p.id = NEW.user_id;
  perform net.http_post(
    url     := 'https://ufhduewbamnmoiksqgfq.supabase.co/functions/v1/support-notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := json_build_object(
      'kind', NEW.kind, 'question', NEW.question, 'solomon_answer', NEW.solomon_answer, 'page', NEW.page,
      'company', co.name, 'name', who.name, 'email', who.email
    )::jsonb
  );
  return NEW;
end;
$$;

drop trigger if exists on_support_request_insert on support_requests;
create trigger on_support_request_insert
  after insert on public.support_requests
  for each row execute function public.notify_support_request();
