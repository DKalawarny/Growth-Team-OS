-- 🔴 UNDOING A MISTAKE I MADE IN 053, IN FULL.
--
-- 053 wrote `create or replace function public.bootstrap_personal_account()`
-- — no arguments. The real function from 047 takes `p_full_name text default
-- null`. In Postgres a different argument list is a DIFFERENT FUNCTION, so it
-- did not replace anything: it created a second overload beside the original,
-- and a PostgREST call with `{}` now has two candidates to choose between.
--
-- The body I wrote was wrong three more ways, each of which matters:
--
--   1. It called `bootstrap_company()` with no arguments. The real one passes
--      ('Personal', p_full_name) — the name is deliberate, because putting
--      "Jake's Company" in a product about not having a business is its own
--      small lie.
--   2. It dropped the `v_existed` check and guessed with a one-minute
--      created_at window instead. That is precisely the guard 047 exists for:
--      an EXISTING Eliv8 customer who opens the way-out intake would have their
--      real company flagged personal and quietly dropped out of the customer
--      counts.
--   3. It set `search_path = public`, losing pg_catalog.
--
-- ⚠️ The lesson, and it is not a small one: `create or replace function` is
-- only a replacement when the ARGUMENT LIST matches exactly. Otherwise it is a
-- silent create, and the original goes on running everywhere it is called from.
drop function if exists public.bootstrap_personal_account();

-- Now the real one, restored verbatim from 047 with exactly one line added.
create or replace function public.bootstrap_personal_account(p_full_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_company_id uuid;
  v_existed    boolean;
begin
  select company_id into v_company_id
    from public.profiles where id = auth.uid();
  v_existed := v_company_id is not null;

  if not v_existed then
    -- 'Personal' rather than an invented business name. This person does not
    -- own a business, the row is never shown to them, and putting "Jake's
    -- Company" in a product about not having one would be its own small lie.
    v_company_id := public.bootstrap_company('Personal', p_full_name);
  end if;

  -- 🔴 ONLY flag a company we just created, and only one with no business
  -- profile behind it. Without both guards, an existing Eliv8 OS customer who
  -- opens the way-out intake would have their real company marked personal and
  -- quietly dropped out of the customer counts.
  if not v_existed then
    update public.companies
       set is_personal = true,
           -- ⭐ THE ONLY ADDITION. See 053 for why the way-out cap differs:
           -- one Sonnet call with a 28,000-character prompt is not a chat turn,
           -- and a way-out user spends a few dollars ONCE rather than monthly.
           monthly_spend_cap = greatest(coalesce(monthly_spend_cap, 10.00), 30.00)
     where id = v_company_id
       and not exists (
         select 1 from public.business_profiles bp where bp.company_id = v_company_id
       );
  end if;

  return v_company_id;
end;
$$;
