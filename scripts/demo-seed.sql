-- Evergreen Grounds demo seed. Idempotent: re-running resets the demo content.
-- DEMO_COMPANY_ID de900000-0000-4000-8000-000000000001 | DEMO_UID f1eb0b1f-be17-4ade-b013-e706ea825d0e
begin;

-- ── Core (upsert) ──────────────────────────────────────────────────────────
insert into companies (id, name, slug, plan_tier, plan_status, trial_ends_at, is_personal, modules_enabled)
values ('de900000-0000-4000-8000-000000000001','Evergreen Grounds','evergreen-grounds-demo','growth_247','active','2035-01-01T00:00:00Z', false, '{}')
on conflict (id) do update set name=excluded.name, plan_tier=excluded.plan_tier,
  plan_status=excluded.plan_status, trial_ends_at=excluded.trial_ends_at, is_personal=false;

insert into profiles (id, company_id, role, name, email, custom_permissions)
values ('f1eb0b1f-be17-4ade-b013-e706ea825d0e','de900000-0000-4000-8000-000000000001','owner','Alex Carter','demo@eliv8os.com','{}')
on conflict (id) do update set company_id=excluded.company_id, role='owner', name=excluded.name, email=excluded.email;

insert into business_profiles (company_id, business_name, industry, location, team_size, last_revenue, current_revenue, profit, hours_per_week, biggest_challenge, primary_goal, goal_timeline, vision_3yr, financial_settings, version_history)
values ('de900000-0000-4000-8000-000000000001','Evergreen Grounds','Landscaping and property maintenance','Abbotsford, BC','18','2.3M','2.8M','16%','55',
  'The commercial maintenance book is growing faster than one crew can service, and the standard that wins the renewals still depends on me being on site.',
  ARRAY['Grow it','Hand it on'],'2 to 3 years',
  'Two crews running to the same standard without me on every site, and a commercial book steady enough to carry a real operations lead.',
  '{"overdraft_limit":100000,"overdraft_used":0,"cc_limit":25000,"cc_balance":4200,"gst_frequency":"quarterly","payroll_deductions_frequency":"monthly"}'::jsonb,'[]'::jsonb)
on conflict (company_id) do update set business_name=excluded.business_name, industry=excluded.industry,
  location=excluded.location, team_size=excluded.team_size, last_revenue=excluded.last_revenue,
  current_revenue=excluded.current_revenue, profit=excluded.profit, hours_per_week=excluded.hours_per_week,
  biggest_challenge=excluded.biggest_challenge, primary_goal=excluded.primary_goal,
  goal_timeline=excluded.goal_timeline, vision_3yr=excluded.vision_3yr, financial_settings=excluded.financial_settings;

insert into terms_acceptances (user_id, company_id, version, source, accepted_at)
values ('f1eb0b1f-be17-4ade-b013-e706ea825d0e','de900000-0000-4000-8000-000000000001','2026-08-pilot-1','import', now())
on conflict (user_id, version) do nothing;

-- ── Reset content (FK-safe order) ──────────────────────────────────────────
delete from checkins          where company_id='de900000-0000-4000-8000-000000000001';
delete from solomon_memory    where company_id='de900000-0000-4000-8000-000000000001';
delete from financial_snapshots where company_id='de900000-0000-4000-8000-000000000001';
delete from knowledge_files   where company_id='de900000-0000-4000-8000-000000000001';
delete from documents         where company_id='de900000-0000-4000-8000-000000000001';
delete from office_notes      where company_id='de900000-0000-4000-8000-000000000001';
delete from daily_logs        where company_id='de900000-0000-4000-8000-000000000001';
delete from work_orders       where company_id='de900000-0000-4000-8000-000000000001';
delete from work_order_template_items where template_id in (select id from work_order_templates where company_id='de900000-0000-4000-8000-000000000001');
delete from work_order_templates where company_id='de900000-0000-4000-8000-000000000001';
delete from daily_logs        where company_id='de900000-0000-4000-8000-000000000001';
delete from staff_members     where company_id='de900000-0000-4000-8000-000000000001';
delete from milestones        where company_id='de900000-0000-4000-8000-000000000001';
delete from chat_messages     where company_id='de900000-0000-4000-8000-000000000001';

-- ── Staff ──────────────────────────────────────────────────────────────────
insert into staff_members (id, company_id, name, role) values
 ('de900000-0000-4000-8001-000000000001','de900000-0000-4000-8000-000000000001','Marcus Bell','Lead hand'),
 ('de900000-0000-4000-8001-000000000002','de900000-0000-4000-8000-000000000001','Dave Miller','Crew'),
 ('de900000-0000-4000-8001-000000000003','de900000-0000-4000-8000-000000000001','Sarah Jenkins','Crew'),
 ('de900000-0000-4000-8001-000000000004','de900000-0000-4000-8000-000000000001','Tom Walker','Crew'),
 ('de900000-0000-4000-8001-000000000005','de900000-0000-4000-8000-000000000001','Chris Porter','Seasonal');

-- ── Milestones (roadmap) ─────────────────────────────────────────────────────
insert into milestones (company_id, title, description, timeframe, category, sort_order, progress_percent, completed, actions, books) values
 ('de900000-0000-4000-8000-000000000001','Promote a crew lead and step back from the first crew','Give Marcus six weeks running the main crew with you off site, so you know the standard holds without you before March.','Next 90 days','team',1,40,false,'[]','[]'),
 ('de900000-0000-4000-8000-000000000001','Write the maintenance routes down as playbooks','Document how a site actually gets done so a second crew can run it the same way.','Next 90 days','systems',2,60,false,'[]','[]'),
 ('de900000-0000-4000-8000-000000000001','Win the two March strata contracts','Firm up the bids and the win odds before you decide whether to crew up ahead of them.','3 to 6 months','revenue',3,20,false,'[]','[]'),
 ('de900000-0000-4000-8000-000000000001','Add a second maintenance crew','Timed to the March bids, not ahead of them. Backed by the recurring book, not a forecast.','6 to 12 months','team',4,0,false,'[]','[]'),
 ('de900000-0000-4000-8000-000000000001','Clean books and recurring revenue, ready to hand on','The business runs and sells on its recurring base, not on you.','1 to 2 years','exit',5,25,false,'[]','[]');

-- ── Advisor conversation (seeded, read in demo) ──────────────────────────────
insert into chat_messages (company_id, user_id, chat_type, role, content, source_documents, created_at) values
 ('de900000-0000-4000-8000-000000000001','f1eb0b1f-be17-4ade-b013-e706ea825d0e','advisor','user','We are growing fast and the commercial side is busy. I want to add a second crew and chase the big strata contracts. Can we pull it off?','[]', now() - interval '20 minutes'),
 ('de900000-0000-4000-8000-000000000001','f1eb0b1f-be17-4ade-b013-e706ea825d0e','advisor','assistant','The money says yes, and that is the easy part. Recurring maintenance is 64% of your revenue and it renews, your margin went from 12 to 16 as that book grew, and you have about nine weeks of payroll in the bank. A second crew is backed by income you can count on, not a hope.

So the question is not whether you can afford it. It is who runs the second crew to the standard that is winning you those renewals. Right now that standard is you. Who on the crew today could run a site the way you do, and have you asked them?','[]', now() - interval '19 minutes'),
 ('de900000-0000-4000-8000-000000000001','f1eb0b1f-be17-4ade-b013-e706ea825d0e','advisor','user','Marcus could. He basically runs our biggest site already. I have not asked him though.','[]', now() - interval '18 minutes'),
 ('de900000-0000-4000-8000-000000000001','f1eb0b1f-be17-4ade-b013-e706ea825d0e','advisor','assistant','Then that conversation is the first move, before any hiring. Promote Marcus, give him six weeks running the current crew while you step back, and you will know before the March bids whether the quality holds without you on site.

If it holds, a second crew is just a staffing exercise and the numbers already say go. If it does not, you have learned that for the cost of a conversation instead of a year of payroll. Whatever the numbers say, the crew earning those renewals is the business. Grow in a way that does not burn them to hit a deadline.','[]', now() - interval '17 minutes');

-- ── Playbooks ────────────────────────────────────────────────────────────────
insert into work_order_templates (id, company_id, name, description) values
 ('de900000-0000-4000-8004-000000000001','de900000-0000-4000-8000-000000000001','New maintenance site onboarding','Drafted with Solomon'),
 ('de900000-0000-4000-8004-000000000002','de900000-0000-4000-8000-000000000001','Weekly maintenance route','The standard visit, start to finish'),
 ('de900000-0000-4000-8004-000000000003','de900000-0000-4000-8000-000000000001','Spring cleanup and bed prep','Seasonal');
insert into work_order_template_items (template_id, position, text, required) values
 ('de900000-0000-4000-8004-000000000001',1,'Walk the property with the client and confirm the scope, the gate and irrigation locations, and who to call on site.',true),
 ('de900000-0000-4000-8004-000000000001',2,'Photograph the whole property on day one so there is a before and a baseline for the file.',true),
 ('de900000-0000-4000-8004-000000000001',3,'Confirm access: gate codes, parking, and where the crew can and cannot take equipment.',true),
 ('de900000-0000-4000-8004-000000000001',4,'Set the visit schedule and load it into the route so it does not depend on anyone remembering.',true),
 ('de900000-0000-4000-8004-000000000002',1,'Check in on the route, confirm the site and any notes from last visit before unloading.',true),
 ('de900000-0000-4000-8004-000000000002',2,'Mow, edge and trim to the agreed standard; blow down all hard surfaces before leaving.',true),
 ('de900000-0000-4000-8004-000000000002',3,'Walk the beds for weeds, damage or irrigation faults and log anything for the office.',true),
 ('de900000-0000-4000-8004-000000000002',4,'Photograph the finished site and mark the visit done so the client record stays current.',true),
 ('de900000-0000-4000-8004-000000000003',1,'Clear winter debris and cut back perennials before any new growth starts.',true),
 ('de900000-0000-4000-8004-000000000003',2,'Edge and refresh mulch in all beds to the agreed depth.',true),
 ('de900000-0000-4000-8004-000000000003',3,'Test and start up the irrigation, flag any zones that failed over winter.',true);

-- ── Work orders (jobs, with money) ───────────────────────────────────────────
insert into work_orders (id, company_id, staff_member_id, milestone_id, title, status, priority, created_at) values
 ('de900000-0000-4000-8003-000000000001','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000001',null,'Maple Plaza strata, spring cleanup','done','medium', now() - interval '12 days'),
 ('de900000-0000-4000-8003-000000000002','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000002',null,'Oakridge commercial, weekly maintenance','in_progress','medium', now() - interval '6 days'),
 ('de900000-0000-4000-8003-000000000003','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000003',null,'Riverbend townhomes, bed refresh','done','low', now() - interval '4 days'),
 ('de900000-0000-4000-8003-000000000004','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000001',null,'Center Street office, new site onboarding','backlog','high', now() - interval '1 day');

-- ── Daily logs (crew account, incl. the blockers Solomon learns from) ─────────
insert into daily_logs (company_id, staff_member_id, work_order_id, log_date, what_happened, blockers, hours_on_site, who_on_site, safety_note, injury) values
 ('de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000001','de900000-0000-4000-8003-000000000001', current_date - 12,'Spring cleanup at Maple Plaza done, beds edged and mulched, site photographed.','Gate was locked when we arrived, building manager did not have the key, lost about 40 minutes.',7.5,'Marcus, Dave','Wet paving by the loading bay was slick. Coned it off and told the building manager.',false),
 ('de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000002','de900000-0000-4000-8003-000000000002', current_date - 6,'Oakridge weekly maintenance, full route completed.',null,6.0,'Dave, Sarah',null,false),
 ('de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000003','de900000-0000-4000-8003-000000000003', current_date - 4,'Riverbend bed refresh finished a day early, client happy.','Could not confirm which zones to prune, no one on site to ask, guessed on two beds.',5.5,'Sarah, Tom',null,false),
 ('de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000001',null, current_date - 1,'Walked the Center Street site for the onboarding, measured and photographed.',null,2.0,'Marcus',null,false);

-- ── Office notes ─────────────────────────────────────────────────────────────
insert into office_notes (company_id, note_date, note, status) values
 ('de900000-0000-4000-8000-000000000001', current_date - 2,'Follow up with Maple Plaza about the gate key, this is the second time it has cost the crew time.','open'),
 ('de900000-0000-4000-8000-000000000001', current_date - 1,'Draft the Center Street onboarding from the new site playbook.','doing');

-- ── Financial snapshot (what the CFO / Solomon reads) ─────────────────────────
insert into financial_snapshots (company_id, source, report_type, period_label, normalized_text, raw_json, synced_at) values
 ('de900000-0000-4000-8000-000000000001','manual','profit_and_loss','Trailing 12 months',
  'Revenue 2,800,000. Recurring maintenance revenue 1,790,000 (64%). Direct costs 1,540,000. Gross profit 1,260,000 (45%). Overhead 812,000. Net profit 448,000 (16%). Revenue up 22% year over year; net margin up from 12%. Cash on hand 240,000, about nine weeks of payroll. No debt on the line of credit.',
  '{"revenue":2800000,"net_profit":448000,"net_margin":0.16,"recurring_pct":0.64,"cash_on_hand":240000}'::jsonb, now() - interval '3 days');

-- ── Solomon memory ───────────────────────────────────────────────────────────
insert into solomon_memory (company_id, kind, statement, source, status) values
 ('de900000-0000-4000-8000-000000000001','decision','Promote Marcus to crew lead before adding a second crew.','owner','active'),
 ('de900000-0000-4000-8000-000000000001','constraint','Will not crew up and promote at the same time under bid pressure.','owner','active'),
 ('de900000-0000-4000-8000-000000000001','person','Marcus Bell runs the largest maintenance site and is the strongest lead candidate.','owner','active'),
 ('de900000-0000-4000-8000-000000000001','context','Recurring maintenance is about 64% of revenue and renews yearly.','onboarding','active'),
 ('de900000-0000-4000-8000-000000000001','commitment','Six weeks with the owner stepping back, to test the standard before the March bids.','owner','active');

-- ── Documents (Generated tab, safe simple saves) ─────────────────────────────
insert into documents (company_id, user_id, tool_id, title, tags, output_data) values
 ('de900000-0000-4000-8000-000000000001','f1eb0b1f-be17-4ade-b013-e706ea825d0e','solomon','Note: the second-crew decision','[]','{"text":"Money is ready; the gate is a crew lead, not cash. Promote Marcus, six weeks stepping back, decide on the second crew before March."}'::jsonb);

-- ── Knowledge files (Uploaded tab, list only) ────────────────────────────────
insert into knowledge_files (company_id, title, file_path, kind, status, notes) values
 ('de900000-0000-4000-8000-000000000001','Commercial service agreement template','de900000-0000-4000-8000-000000000001/sample-service-agreement.pdf','legal','ready','Standard maintenance contract'),
 ('de900000-0000-4000-8000-000000000001','2026 maintenance pricing sheet','de900000-0000-4000-8000-000000000001/sample-pricing.xlsx','financial','ready',null),
 ('de900000-0000-4000-8000-000000000001','Spring cleanup SOP','de900000-0000-4000-8000-000000000001/sample-spring-sop.pdf','sop','ready',null);

-- ── Check-ins ────────────────────────────────────────────────────────────────
insert into checkins (company_id, user_id, revenue_update, win, challenge, mood) values
 ('de900000-0000-4000-8000-000000000001','f1eb0b1f-be17-4ade-b013-e706ea825d0e','Tracking to 2.8M, up 22%','Riverbend finished early and the client renewed on the spot','Deciding whether to crew up before the March bids',4);

-- milestone steps + SOP wording (kept in sync with the live demo)
-- Demo data: give milestones real steps + align wording with the SOPs rename.
update milestones set actions = '["Ask Marcus this week if he wants to lead","Promote him and tell the crew","Step off the main crew for six weeks","Check the standard held before the March bids"]'::jsonb
 where company_id='de900000-0000-4000-8000-000000000001' and title='Promote a crew lead and step back from the first crew';
update milestones set title='Write the maintenance routes down as SOPs',
 actions='["Pick the three routes you run most","Write each as an SOP, one step per line","Have the crew run from the SOP for two weeks","Fix the steps that did not match the real job"]'::jsonb
 where company_id='de900000-0000-4000-8000-000000000001' and title like 'Write the maintenance routes down as%';
update milestones set actions='["Confirm the scope and site list for each bid","Price with current labour and material rates","Submit both bids by the end of February","Follow up within a week of submitting"]'::jsonb
 where company_id='de900000-0000-4000-8000-000000000001' and title='Win the two March strata contracts';
update milestones set actions='["Confirm the March bids landed","Promote or hire the second crew lead","Kit out the second truck and route","Run the new route at a conservative first-year margin"]'::jsonb
 where company_id='de900000-0000-4000-8000-000000000001' and title='Add a second maintenance crew';
update milestones set actions='["Get the books current and reconciled monthly","Grow the recurring maintenance base","Document how the business runs without you","Get a broker read on what it is worth"]'::jsonb
 where company_id='de900000-0000-4000-8000-000000000001' and title='Clean books and recurring revenue, ready to hand on';
-- office note wording
update office_notes set note=replace(note,'new site playbook','new site SOP')
 where company_id='de900000-0000-4000-8000-000000000001' and note like '%new site playbook%';

-- Multi-assignee showcase: two jobs crewed by more than one person, so the
-- board shows stacked avatars (Daniel: show a task assigned to people).
update work_orders set assigned_staff_ids = ARRAY['de900000-0000-4000-8001-000000000001','de900000-0000-4000-8001-000000000002']::uuid[]
 where id='de900000-0000-4000-8003-000000000002';
update work_orders set assigned_staff_ids = ARRAY['de900000-0000-4000-8001-000000000001','de900000-0000-4000-8001-000000000003']::uuid[]
 where id='de900000-0000-4000-8003-000000000004';
-- Roadmap assignment showcase: link two crewed jobs to milestones so each
-- milestone row shows who is on it (Daniel: show a milestone assigned to someone).
update work_orders set milestone_id = (select id from milestones where company_id='de900000-0000-4000-8000-000000000001' and title='Promote a crew lead and step back from the first crew') where id='de900000-0000-4000-8003-000000000004';
update work_orders set milestone_id = (select id from milestones where company_id='de900000-0000-4000-8000-000000000001' and title='Add a second maintenance crew') where id='de900000-0000-4000-8003-000000000002';

-- Roadmap step showcase: a task whose title is exactly a milestone step puts that
-- person's name on the step itself (Daniel, 9 Oct: show people on the task inside
-- the task, on the top milestone). Covers the focus card and the first list row.
insert into work_orders (id, company_id, staff_member_id, assigned_staff_ids, milestone_id, title, status, priority, created_at) values
 ('de900000-0000-4000-8003-000000000005','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000001',
  ARRAY['de900000-0000-4000-8001-000000000001']::uuid[],
  (select id from milestones where company_id='de900000-0000-4000-8000-000000000001' and title='Promote a crew lead and step back from the first crew'),
  'Step off the main crew for six weeks','in_progress','high', now() - interval '3 days'),
 ('de900000-0000-4000-8003-000000000006','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000001',
  ARRAY['de900000-0000-4000-8001-000000000001']::uuid[],
  (select id from milestones where company_id='de900000-0000-4000-8000-000000000001' and title='Write the maintenance routes down as SOPs'),
  'Write each as an SOP, one step per line','in_progress','medium', now() - interval '5 days'),
 ('de900000-0000-4000-8003-000000000007','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000002',
  ARRAY['de900000-0000-4000-8001-000000000002','de900000-0000-4000-8001-000000000003']::uuid[],
  (select id from milestones where company_id='de900000-0000-4000-8000-000000000001' and title='Write the maintenance routes down as SOPs'),
  'Have the crew run from the SOP for two weeks','backlog','medium', now() - interval '2 days');

-- Roadmap dates + two finished milestones (Daniel, 9 Oct: pace control and the
-- timeline "were supposed to depict what it does better"). Without dates the
-- timeline is empty and the pace buttons move nothing; without two finished
-- milestones "your actual pace" has nothing to read. Dates are relative to the
-- day the seed runs. The two finished ones came in at about three quarters of
-- their planned time, so the learned pace reads Focused.
update milestones set start_date = current_date - 30,  end_date = current_date + 45  where company_id='de900000-0000-4000-8000-000000000001' and title='Promote a crew lead and step back from the first crew';
update milestones set start_date = current_date - 45,  end_date = current_date + 60  where company_id='de900000-0000-4000-8000-000000000001' and title='Write the maintenance routes down as SOPs';
update milestones set start_date = current_date + 30,  end_date = current_date + 150 where company_id='de900000-0000-4000-8000-000000000001' and title='Win the two March strata contracts';
update milestones set start_date = current_date + 150, end_date = current_date + 330 where company_id='de900000-0000-4000-8000-000000000001' and title='Add a second maintenance crew';
update milestones set start_date = current_date + 300, end_date = current_date + 700 where company_id='de900000-0000-4000-8000-000000000001' and title='Clean books and recurring revenue, ready to hand on';
delete from milestones where company_id='de900000-0000-4000-8000-000000000001' and title in ('Put every recurring client on a written contract','Move the schedule off the whiteboard into one calendar');
insert into milestones (company_id, title, description, timeframe, category, sort_order, progress_percent, completed, completed_date, start_date, end_date, actions, books) values
 ('de900000-0000-4000-8000-000000000001','Put every recurring client on a written contract','Every maintenance client signed, with scope and price in writing, so the recurring book is real.','Next 90 days','revenue',-1,100,true, now() - interval '70 days', current_date - 160, current_date - 40,
  '["List every recurring client and what they pay","Write one plain contract","Get each client signed","File the signed copies in Documents"]'::jsonb,'[]'),
 ('de900000-0000-4000-8000-000000000001','Move the schedule off the whiteboard into one calendar','One schedule the whole crew can see, so the day does not depend on who was in the yard that morning.','Next 90 days','systems',0,100,true, now() - interval '35 days', current_date - 95, current_date - 15,
  '["Put every recurring route in one calendar","Share the calendar with the crew","Run from the calendar for two weeks","Take the whiteboard down"]'::jsonb,'[]');

-- More daily logs (Daniel, 10 Oct: "add another daily log so it depicts what this
-- is better"). Four logs showed the plain case only. These add the cases the page
-- is built for: someone hurt, a job running behind with a cost nobody planned, a
-- blocker that repeats an earlier one (the gate, which lights up "Same thing came
-- up twice"), and two logs the office has already answered, one shared with the
-- crew and one kept private.
delete from daily_logs where company_id='de900000-0000-4000-8000-000000000001' and what_happened in (
 'First full visit at Center Street. Beds cleared and the irrigation tested, two zones are not firing.',
 'Oakridge weekly maintenance, full route done. The belt on the ride-on slipped twice on the back lawn, finished that section with the push mower.',
 'Hedge trimming along the east fence at Oakridge, about two thirds done.');
insert into daily_logs (company_id, staff_member_id, work_order_id, log_date, what_happened, blockers, hours_on_site, who_on_site, on_site_staff_ids, safety_note, injury, injury_detail, incident_report_filed, flha_done, schedule_status, percent_complete, unplanned_cost, unplanned_cost_note) values
 ('de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000001','de900000-0000-4000-8003-000000000004', current_date,
  'First full visit at Center Street. Beds cleared and the irrigation tested, two zones are not firing.',
  'Gate was locked again when we arrived, waited 25 minutes for the building manager to bring the key.',
  6.0, null, ARRAY['de900000-0000-4000-8001-000000000001','de900000-0000-4000-8001-000000000003']::uuid[], null, false, null, null, true, 'behind', 40, true, 'Two irrigation heads need replacing, not in the quote'),
 ('de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000002','de900000-0000-4000-8003-000000000002', current_date - 2,
  'Oakridge weekly maintenance, full route done. The belt on the ride-on slipped twice on the back lawn, finished that section with the push mower.',
  'The ride-on belt is worn and needs replacing before next week.',
  6.5, null, ARRAY['de900000-0000-4000-8001-000000000002','de900000-0000-4000-8001-000000000004']::uuid[], null, false, null, null, true, 'on_track', 100, false, null),
 ('de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000004','de900000-0000-4000-8003-000000000002', current_date - 3,
  'Hedge trimming along the east fence at Oakridge, about two thirds done.',
  null,
  7.0, null, ARRAY['de900000-0000-4000-8001-000000000004','de900000-0000-4000-8001-000000000005']::uuid[], null, true, 'Chris caught his forearm on the trimmer guard. Small cut, cleaned and bandaged on site, and he finished the day.', false, true, 'on_track', 65, false, null);
update daily_logs set pm_note='The zones are marked on the site map in Documents now. Sarah, send a photo of the two beds so we can check them with the client.', pm_note_shared=true, reviewed_at=now() - interval '3 days'
 where company_id='de900000-0000-4000-8000-000000000001' and what_happened like 'Riverbend bed refresh finished%';
update daily_logs set pm_note='Second time this gate has cost us time. Raise it when the contract comes up for renewal.', pm_note_shared=false, reviewed_at=now() - interval '10 days'
 where company_id='de900000-0000-4000-8000-000000000001' and what_happened like 'Spring cleanup at Maple Plaza%';

-- This quarter's priorities and last quarter's, so the Rocks page shows tracked
-- progress and a finished-out-of-set count (10 Oct).

update milestones set rock_quarter = to_char(current_date, 'YYYY"-Q"Q'), actions_done = '["Ask Marcus this week if he wants to lead","Promote him and tell the crew"]'::jsonb, progress_percent = 50
 where company_id='de900000-0000-4000-8000-000000000001' and title='Promote a crew lead and step back from the first crew';
update milestones set rock_quarter = to_char(current_date, 'YYYY"-Q"Q'), actions_done = '["Pick the three routes you run most","Write each as an SOP, one step per line"]'::jsonb, progress_percent = 50
 where company_id='de900000-0000-4000-8000-000000000001' and title='Write the maintenance routes down as SOPs';
update milestones set rock_quarter = to_char(current_date, 'YYYY"-Q"Q'), actions_done = '["Confirm the scope and site list for each bid"]'::jsonb, progress_percent = 25
 where company_id='de900000-0000-4000-8000-000000000001' and title='Win the two March strata contracts';
update milestones set rock_quarter = to_char(current_date - interval '3 months', 'YYYY"-Q"Q'), actions_done = actions
 where company_id='de900000-0000-4000-8000-000000000001' and completed = true;

commit;
