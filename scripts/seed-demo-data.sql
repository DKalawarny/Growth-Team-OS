-- ============================================================================
-- Seed the Bridgewater Mechanical demo workspace
--
-- Fills every screen with something real-shaped so the app demos end to end:
-- business profile, roadmap, people, work orders, playbooks, check-ins, and
-- Solomon's memory.
--
-- ⭐ NO IDS TO PASTE. The company is resolved from the profile row, because
-- that is the row that actually decides what the app shows — matching on the
-- company NAME is what produced "more than one row returned by a subquery"
-- earlier today, and a name is not a key.
--
-- ⚠️ UPLOADED DOCUMENTS ARE NOT IN HERE, ON PURPOSE. knowledge_files.file_path
-- must point at a real object in Supabase Storage, and SQL cannot put one
-- there. Seeding rows with invented paths would give a Documents list where
-- every file 404s when clicked — a broken demo is worse than an empty one.
-- Upload the files in demo-docs/ through the app instead. That path also runs
-- the chunker and the embedder, so retrieval genuinely works afterwards.
--
-- Safe to re-run: every insert clears its own table for this company first.
--
-- The figures match leadeos.com/demo so the page and the live workspace tell
-- the same story. Bridgewater Mechanical is invented.
-- ============================================================================

-- ── Business profile — Solomon's baseline context ───────────────────────────
with co as (select company_id as id from public.profiles limit 1)
insert into public.business_profiles
  (company_id, business_name, industry, location, team_size, last_revenue,
   current_revenue, profit, hours_per_week, biggest_challenge, primary_goal, goal_timeline)
select id, 'Bridgewater Mechanical', 'HVAC / Mechanical', 'Kamloops, BC', '11-25',
       '$1M - $5M', '$1M - $5M', '1-10%', '50-60',
       'Margin fell from 11% to 7% while revenue grew 18% — I cannot tell if it is pricing or materials',
       'Get Off Tools', '2 years'
from co
on conflict (company_id) do update
set business_name     = excluded.business_name,
    industry          = excluded.industry,
    location          = excluded.location,
    team_size         = excluded.team_size,
    last_revenue      = excluded.last_revenue,
    current_revenue   = excluded.current_revenue,
    profit            = excluded.profit,
    hours_per_week    = excluded.hours_per_week,
    biggest_challenge = excluded.biggest_challenge,
    primary_goal      = excluded.primary_goal,
    goal_timeline     = excluded.goal_timeline;


-- ── Roadmap ─────────────────────────────────────────────────────────────────
-- Deliberately mixed: two done, two OVERDUE, the rest ahead. The overdue ones
-- matter — they are what the Dashboard headline picks up, and they exercise
-- the milestone status field that Solomon now reads instead of guessing at
-- dates.
with co as (select company_id as id from public.profiles limit 1)
delete from public.milestones where company_id = (select id from co);

with co as (select company_id as id from public.profiles limit 1)
insert into public.milestones
  (company_id, title, description, timeframe, category, weight, progress_percent,
   completed, completed_date, start_date, end_date, sort_order)
select id, t.title, t.descr, t.tf, t.cat, t.wt, t.prog, t.done,
       case when t.done then (date '2026-08-21' - t.done_ago)::timestamptz end,
       date '2026-08-21' - t.starts, date '2026-08-21' + t.ends, t.ord
from co, (values
  ('Separate the service and install P&Ls',
   'Service and install are being measured as one number, which is why the margin drop cannot be traced. Split them and the answer appears.',
   '0-3 months','foundation',9,100,true,120,180,-150,1),
  ('Get job-level costing on every install',
   'Labour, materials and truck time per job. Without it, pricing decisions are guesses with confidence attached.',
   '0-3 months','systems',9,100,true,60,140,-70,2),
  ('Rebuild the estimating template with real material rates',
   'Quotes are being built off rates from before the last two supplier increases.',
   '0-3 months','revenue',10,65,false,0,90,-35,3),
  ('Write the service call SOP',
   'The callout everyone does fifty times a year exists only in two people''s heads.',
   '0-3 months','systems',7,30,false,0,70,-12,4),
  ('Decide on the second service tech',
   'Overtime is concentrated on two people and has run nine months. Decide before it decides itself.',
   '3-6 months','team',8,0,false,0,20,25,5),
  ('Set up Profit First accounts',
   'Four accounts, weekly allocations. Turns cash management from reactive to structural.',
   '3-6 months','foundation',7,0,false,0,10,45,6),
  ('Move maintenance contracts to auto-renew',
   'Recurring revenue is the cheapest margin in the business and it is being re-sold by hand every year.',
   '3-6 months','revenue',8,0,false,0,0,80,7),
  ('Hire a service coordinator',
   'The owner is still dispatching. This is the seat that gets him off the tools.',
   '6-12 months','team',9,0,false,0,0,150,8),
  ('Foreman scorecards and a quarterly review rhythm',
   'Nobody knows what good looks like in writing, so nobody can be held to it fairly.',
   '6-12 months','team',6,0,false,0,0,190,9),
  ('Document the business so it runs a week without you',
   'The real test of the whole plan. If a week off breaks it, it is a job, not a business.',
   '12-24 months','exit',10,0,false,0,0,400,10)
) as t(title,descr,tf,cat,wt,prog,done,done_ago,starts,ends,ord);


-- ── People ──────────────────────────────────────────────────────────────────
with co as (select company_id as id from public.profiles limit 1)
delete from public.staff_members where company_id = (select id from co);

with co as (select company_id as id from public.profiles limit 1)
insert into public.staff_members (company_id, name, role, email)
select id, s.nm, s.rl, s.em from co, (values
  ('Marcus Reyes',   'Lead service tech',   'marcus@bridgewatermech.example'),
  ('Danny Okafor',   'Service tech',        'danny@bridgewatermech.example'),
  ('Priya Raman',    'Install foreman',     'priya@bridgewatermech.example'),
  ('Tom Whitfield',  'Installer',           'tom@bridgewatermech.example'),
  ('Elena Sokolova', 'Office / dispatch',   'elena@bridgewatermech.example'),
  ('Jim Hollis',     'Estimator',           'jim@bridgewatermech.example')
) as s(nm,rl,em);


-- ── Work orders ─────────────────────────────────────────────────────────────
-- ⚠️ status must be one of backlog | in_progress | review | done. There is no
-- CHECK constraint on the column, so anything else inserts happily and then
-- renders in none of the Board's four columns — invisible rows that look like
-- data loss. 'todo' and 'blocked' were in the first draft of this file.
with co as (select company_id as id from public.profiles limit 1)
delete from public.work_orders where company_id = (select id from co);

with co as (select company_id as id from public.profiles limit 1)
insert into public.work_orders (company_id, title, description, status, priority, due_date, staff_member_id)
select co.id, w.title, w.descr, w.st, w.pr, date '2026-08-21' + w.due,
       (select id from public.staff_members s where s.company_id = co.id and s.name = w.who)
from co, (values
  ('Riverside plaza — RTU replacement quote','Six rooftop units. Needs the rebuilt estimating template before it goes out.','in_progress','high',3,'Jim Hollis'),
  ('Northgate Medical — quarterly PM visit','Contract maintenance. Two of four units flagged last visit.','backlog','medium',6,'Marcus Reyes'),
  ('Cold room compressor — Sunrise Grocery','Callback. Second visit on the same fault.','in_progress','high',1,'Danny Okafor'),
  ('Kamloops SD73 — boiler tender','Public tender, closes end of month. Decide whether to bid.','backlog','medium',9,'Jim Hollis'),
  ('Willow Creek townhomes — 14 heat pumps','Install phase two. Phase one ran 20% over planned hours.','in_progress','high',14,'Priya Raman'),
  ('Annual gas ticket renewals','Three tickets expire in October.','backlog','low',40,'Elena Sokolova'),
  ('Warranty claim — Trane condenser','Filed three weeks ago, nothing back yet.','review','medium',-4,'Elena Sokolova')
) as w(title,descr,st,pr,due,who);


-- ── Playbooks ───────────────────────────────────────────────────────────────
with co as (select company_id as id from public.profiles limit 1)
delete from public.work_order_templates where company_id = (select id from co);

with co as (select company_id as id from public.profiles limit 1)
insert into public.work_order_templates (company_id, name, description)
select id, t.nm, t.ds from co, (values
  ('Service callout',        'The standard diagnostic visit, start to invoice.'),
  ('Quarterly PM visit',     'Contract maintenance for a commercial site.'),
  ('New install handover',   'What has to be true before an install is signed off.')
) as t(nm,ds);

insert into public.work_order_template_items (template_id, position, text, notes)
select t.id, s.pos, s.txt, s.nt
from public.work_order_templates t,
     (values
       (1,'Confirm site access and who is meeting you','Half the wasted callouts are a locked door.'),
       (2,'Photograph the nameplate before touching anything','Model and serial save an hour later.'),
       (3,'Diagnose and quote before starting the repair','Never do work the customer has not agreed to.'),
       (4,'Test under load, not just at start-up',null),
       (5,'Photograph the finished work','Ends most warranty arguments before they start.'),
       (6,'Invoice same day','Every day it sits is a day added to collections.')
     ) as s(pos,txt,nt)
where t.name = 'Service callout'
  and t.company_id = (select company_id from public.profiles limit 1);


-- ── Check-ins ───────────────────────────────────────────────────────────────
-- ⚠️ These two blocks used `from public.profiles p, (values ...) as c(cols)` —
-- a VALUES list as a table source with a column alias. It failed in the
-- Supabase SQL editor with "42601: syntax error at or near )". The other
-- blocks use the same shape and parsed, so the objection is specific rather
-- than general, and without a local Postgres I could not pin down which
-- element it choked on.
--
-- So they are rewritten as plain INSERT ... VALUES with scalar subqueries,
-- which has no ambiguity to argue about. Slower to read, guaranteed to parse.
-- Chasing the exact cause of a parser complaint is not worth a second failed
-- paste for someone who just wants the demo populated.

with co as (select company_id as id from public.profiles limit 1)
delete from public.checkins where company_id = (select id from co);

insert into public.checkins
  (company_id, user_id, revenue_update, win, challenge, mood, hours_this_week, created_at)
values
  ((select company_id from public.profiles limit 1),
   (select id from public.profiles limit 1),
   'Tracking about $290k for the month',
   'Northgate renewed the maintenance contract for two years',
   'Still doing dispatch myself every morning',
   3, '55-65', now() - interval '7 days'),

  ((select company_id from public.profiles limit 1),
   (select id from public.profiles limit 1),
   '$310k, best month since March',
   'Priya ran the Willow Creek phase without me on site once',
   'Phase one went 20% over hours and I only found out at invoicing',
   3, '50-60', now() - interval '14 days'),

  ((select company_id from public.profiles limit 1),
   (select id from public.profiles limit 1),
   'Around $265k',
   'Got the estimating rebuild started',
   'Marcus asked about his overtime. I did not have a good answer.',
   2, '60-70', now() - interval '21 days');


-- ── Solomon's memory ────────────────────────────────────────────────────────
-- What makes the demo land: he already knows these before the first question.

with co as (select company_id as id from public.profiles limit 1)
delete from public.solomon_memory where company_id = (select id from co);

insert into public.solomon_memory (company_id, user_id, kind, statement, source)
values
  ((select company_id from public.profiles limit 1), (select id from public.profiles limit 1),
   'constraint', 'Will not use the overdraft to fund contract work — wants growth funded by the work itself', 'conversation'),

  ((select company_id from public.profiles limit 1), (select id from public.profiles limit 1),
   'decision', 'Held off hiring a second service tech in August, pending the job-costing review', 'conversation'),

  ((select company_id from public.profiles limit 1), (select id from public.profiles limit 1),
   'person', 'Marcus Reyes and Danny Okafor have carried sustained overtime since November', 'conversation'),

  ((select company_id from public.profiles limit 1), (select id from public.profiles limit 1),
   'commitment', 'Pricing review before adding any capacity', 'conversation'),

  ((select company_id from public.profiles limit 1), (select id from public.profiles limit 1),
   'context', 'Wants to be off the tools within two years, and for the business to run a week without him', 'conversation'),

  ((select company_id from public.profiles limit 1), (select id from public.profiles limit 1),
   'preference', 'Prefers being told the hard thing once, plainly, rather than having it softened', 'conversation');


-- ── Confirm ─────────────────────────────────────────────────────────────────
with co as (select company_id as id from public.profiles limit 1)
select
  (select name  from public.companies where id = (select id from co))                     as company,
  -- ⚠️ FIRST, because this is the row that failed and nothing noticed. A
  -- confirm query that omits the thing most likely to break is decoration.
  (select count(*) from public.business_profiles     where company_id = (select id from co)) as business_profile,
  (select count(*) from public.milestones            where company_id = (select id from co)) as milestones,
  (select count(*) from public.staff_members         where company_id = (select id from co)) as people,
  (select count(*) from public.work_orders           where company_id = (select id from co)) as work_orders,
  (select count(*) from public.work_order_templates  where company_id = (select id from co)) as playbooks,
  (select count(*) from public.checkins              where company_id = (select id from co)) as checkins,
  (select count(*) from public.solomon_memory        where company_id = (select id from co)) as memories;
