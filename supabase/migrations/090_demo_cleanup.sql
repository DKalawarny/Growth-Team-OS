-- Wipe idle per-visitor demo instances (and their throwaway auth users).
-- Never touches the template (de900000-…-001) or any non-demo company.
create or replace function cleanup_demo_instances(older_than interval default interval '6 hours')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n integer := 0;
begin
  for r in
    select id from companies
    where is_demo = true
      and id <> 'de900000-0000-4000-8000-000000000001'
      and created_at < now() - older_than
  loop
    delete from checkins              where company_id = r.id;
    delete from solomon_memory        where company_id = r.id;
    delete from financial_snapshots   where company_id = r.id;
    delete from knowledge_files       where company_id = r.id;
    delete from documents             where company_id = r.id;
    delete from office_notes          where company_id = r.id;
    delete from daily_logs            where company_id = r.id;
    delete from work_order_checklist_items where work_order_id in (select id from work_orders where company_id = r.id);
    delete from work_orders           where company_id = r.id;
    delete from work_order_template_items where template_id in (select id from work_order_templates where company_id = r.id);
    delete from work_order_templates  where company_id = r.id;
    delete from staff_members         where company_id = r.id;
    delete from milestones            where company_id = r.id;
    delete from chat_messages         where company_id = r.id;
    delete from business_profiles     where company_id = r.id;
    delete from terms_acceptances     where company_id = r.id;
    delete from auth.users u using profiles p where p.company_id = r.id and p.id = u.id;
    delete from profiles              where company_id = r.id;
    delete from companies             where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function cleanup_demo_instances(interval) to service_role;
