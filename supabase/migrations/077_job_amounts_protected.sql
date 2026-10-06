-- ⭐ JOB AMOUNTS: Operations sees them only if the owner switches it on.
-- 6 Oct 2026. Settled 2 Sep: "PM can see job costs", a switch, DEFAULT OFF.
-- Until now quoted/cost/invoiced sat on work_orders, which every role reads
-- (RLS hides rows, not columns). They move to their own table with their own
-- rule. 0 of 18 jobs had amounts when this ran, so nothing was exposed.

alter table public.companies add column if not exists job_costs_for_operations boolean not null default false;

create table if not exists public.work_order_amounts (
  work_order_id   uuid primary key references public.work_orders(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  quoted_amount   numeric check (quoted_amount   is null or quoted_amount   >= 0),
  cost_amount     numeric check (cost_amount     is null or cost_amount     >= 0),
  invoiced_amount numeric check (invoiced_amount is null or invoiced_amount >= 0),
  updated_at      timestamptz not null default now()
);
alter table public.work_order_amounts enable row level security;

insert into public.work_order_amounts (work_order_id, company_id, quoted_amount, cost_amount, invoiced_amount)
select id, company_id, quoted_amount, cost_amount, invoiced_amount from public.work_orders
 where quoted_amount is not null or cost_amount is not null or invoiced_amount is not null
on conflict (work_order_id) do nothing;

-- Office and up always; Operations only when the owner has said yes.
create or replace function public.can_see_job_costs()
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select public.can_area('office') or (
    public.can_area('all') and coalesce(
      (select c.job_costs_for_operations from public.companies c where c.id = public.current_company_id()), false))
$$;
grant execute on function public.can_see_job_costs() to authenticated;

create policy job_amounts_read on public.work_order_amounts for select using (
  company_id = current_company_id() and can_see_job_costs());
create policy job_amounts_write on public.work_order_amounts for insert with check (
  company_id = current_company_id() and can_see_job_costs()
  and exists (select 1 from public.work_orders w where w.id = work_order_id and w.company_id = current_company_id()));
create policy job_amounts_update on public.work_order_amounts for update
  using (company_id = current_company_id() and can_see_job_costs())
  with check (company_id = current_company_id() and can_see_job_costs());
create policy job_amounts_delete on public.work_order_amounts for delete using (
  company_id = current_company_id() and can_see_job_costs());

-- The switch is the owner's alone (it grants access). Admins can update the
-- company row, so the column is guarded here as well as by the RPC.
create or replace function public.companies_lock_job_costs()
returns trigger language plpgsql as $$
begin
  if new.job_costs_for_operations is distinct from old.job_costs_for_operations
     and current_user in ('anon', 'authenticated') and not public.can_area('owner') then
    raise exception 'Only the owner can change who sees job costs' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists companies_lock_job_costs on public.companies;
create trigger companies_lock_job_costs before update on public.companies
  for each row execute function public.companies_lock_job_costs();

-- Finally, the amounts leave work_orders so they cannot be read from there.
alter table public.work_orders drop column if exists quoted_amount;
alter table public.work_orders drop column if exists cost_amount;
alter table public.work_orders drop column if exists invoiced_amount;
