-- Demo board extras: checklist steps on a job + one field flag, so the board
-- cards show progress and "Field flags" has something to show. Run after demo_seed.sql.
-- DEMO de900000-0000-4000-8000-000000000001 | Oakridge WO ...8003-...002 | Dave Miller ...8001-...002
delete from work_order_step_comments where company_id='de900000-0000-4000-8000-000000000001';
delete from work_order_checklist_items where work_order_id in (select id from work_orders where company_id='de900000-0000-4000-8000-000000000001');

insert into work_order_checklist_items (id, work_order_id, position, text, required, done) values
 ('de900000-0000-4000-8005-000000000001','de900000-0000-4000-8003-000000000002',1,'Check in on the route and confirm the site before unloading',true,true),
 ('de900000-0000-4000-8005-000000000002','de900000-0000-4000-8003-000000000002',2,'Mow, edge and trim to the agreed standard, blow down hard surfaces',true,true),
 ('de900000-0000-4000-8005-000000000003','de900000-0000-4000-8003-000000000002',3,'Walk the beds for weeds, damage or irrigation faults and log anything',true,false),
 ('de900000-0000-4000-8005-000000000004','de900000-0000-4000-8003-000000000002',4,'Photograph the finished site and mark the visit done',true,false);

insert into work_order_step_comments (company_id, checklist_item_id, work_order_id, staff_member_id, text, is_voice, prompt_type) values
 ('de900000-0000-4000-8000-000000000001','de900000-0000-4000-8005-000000000003','de900000-0000-4000-8003-000000000002','de900000-0000-4000-8001-000000000002','Sprinkler head cracked near the front entry bed, water pooling on the walkway. Flagged so nobody slips before it is fixed.', false, 'near_miss');

-- a two-person job, to show multiple assignees on one work order
update work_orders set assigned_staff_ids = ARRAY['de900000-0000-4000-8001-000000000001','de900000-0000-4000-8001-000000000002']::uuid[] where id='de900000-0000-4000-8003-000000000002';

