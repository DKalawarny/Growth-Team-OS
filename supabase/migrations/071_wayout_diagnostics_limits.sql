-- ⭐ The free check accepts anonymous inserts (by design: it is a public page).
-- 3 Oct audit: nothing bounded them — any user_id, any size, any volume. A bot
-- could fill the table. Now:
--   • user_id is null, or the signed-in person's own id
--   • answers under 8 KB (real rows are ~1 KB), path under 64 characters
--   • a flood cap: no more than 120 inserts across everyone in a minute
drop policy if exists "wayout: anyone may record a diagnostic" on public.wayout_diagnostics;
create policy "wayout: anyone may record a diagnostic" on public.wayout_diagnostics
  for insert with check (
    (user_id is null or user_id = auth.uid())
    and pg_column_size(answers) < 8192
    and (path is null or length(path) < 64)
  );

create or replace function public.wayout_diagnostics_flood_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.wayout_diagnostics where created_at > now() - interval '1 minute') >= 120 then
    raise exception 'too many diagnostics just now' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists wayout_diagnostics_flood_cap on public.wayout_diagnostics;
create trigger wayout_diagnostics_flood_cap before insert on public.wayout_diagnostics
  for each row execute function public.wayout_diagnostics_flood_cap();
