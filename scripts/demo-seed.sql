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
 ('de900000-0000-4000-8003-000000000002','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000002',null,'Oakridge commercial, weekly maintenance','doing','medium', now() - interval '6 days'),
 ('de900000-0000-4000-8003-000000000003','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000003',null,'Riverbend townhomes, bed refresh','done','low', now() - interval '4 days'),
 ('de900000-0000-4000-8003-000000000004','de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000001',null,'Center Street office, new site onboarding','backlog','high', now() - interval '1 day');

-- ── Daily logs (crew account, incl. the blockers Solomon learns from) ─────────
insert into daily_logs (company_id, staff_member_id, work_order_id, log_date, what_happened, blockers, hours_on_site, who_on_site, safety_note, injury) values
 ('de900000-0000-4000-8000-000000000001','de900000-0000-4000-8001-000000000001','de900000-0000-4000-8003-000000000001', current_date - 12,'Spring cleanup at Maple Plaza done, beds edged and mulched, site photographed.','Gate was locked when we arrived, building manager did not have the key, lost about 40 minutes.',7.5,'Marcus, Dave','All clear, wet surfaces flagged to the client.',false),
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

commit;
