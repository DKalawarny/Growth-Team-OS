-- Lock the demo MASTER (de900000-…-001) against user-session writes, so a
-- stale session can never dirty the template again (e.g. "Draft with Solomon"
-- re-adding an SOP). Restrictive policies AND with the existing ones, so an
-- authenticated user cannot create/change/remove an SOP on the master.
-- The seed (privileged role) and clone_demo_instance (SECURITY DEFINER) bypass
-- RLS, and every per-visitor clone has a different company_id, so clones stay
-- fully editable.
create policy demo_master_no_insert on work_order_templates as restrictive for insert to authenticated
  with check (company_id <> 'de900000-0000-4000-8000-000000000001');
create policy demo_master_no_update on work_order_templates as restrictive for update to authenticated
  using (company_id <> 'de900000-0000-4000-8000-000000000001')
  with check (company_id <> 'de900000-0000-4000-8000-000000000001');
create policy demo_master_no_delete on work_order_templates as restrictive for delete to authenticated
  using (company_id <> 'de900000-0000-4000-8000-000000000001');
