-- Milestone actions — the "start with these steps" list on each roadmap card.
-- Plain jsonb array of short imperative strings.
update public.milestones m
set actions = v.acts
from (values
  ('Separate the service and install P&Ls',
   '["Split the chart of accounts by division","Re-tag the last two quarters so there is a baseline","Agree with the bookkeeper how shared overhead is allocated","Review the first clean month together"]'::jsonb),
  ('Get job-level costing on every install',
   '["Pick the three fields every job must capture","Get the crews entering hours daily, not weekly","Reconcile one finished job by hand to prove the numbers","Set a monthly job-cost review"]'::jsonb),
  ('Rebuild the estimating template with real material rates',
   '["Pull current supplier pricing for the top 20 lines","Rebuild labour hours from the job-costing history","Set the margin floor and put it in writing","Re-quote three lost jobs to see what the old rates cost"]'::jsonb),
  ('Write the service call SOP',
   '["Shadow Marcus on two callouts and write what he actually does","Draft it, then have Danny follow it cold","Fix what he trips on","Attach it to the service callout playbook"]'::jsonb),
  ('Decide on the second service tech',
   '["Ask Marcus and Danny directly how long they want to keep this up","Total the overtime cost for the last six months","Work out the revenue a new seat has to carry at current margin","Decide, and tell them either way"]'::jsonb),
  ('Set up Profit First accounts',
   '["Open the four accounts","Set the starting allocation percentages low enough to survive","Move allocations to a fixed weekly slot","Review the percentages at 90 days"]'::jsonb),
  ('Move maintenance contracts to auto-renew',
   '["List every contract and its renewal date","Draft the auto-renew clause and have it checked","Move the three largest first","Set a reminder 60 days before each anniversary"]'::jsonb),
  ('Hire a service coordinator',
   '["Write down everything dispatch actually involves","Define what the first 90 days looks like","Interview against a scorecard, not a feeling","Hand over one week at a time, not all at once"]'::jsonb),
  ('Foreman scorecards and a quarterly review rhythm',
   '["Agree what good looks like for each role, in writing","Build the scorecard from those, not from personality","Run the first round yourself","Book the next three quarterly dates now"]'::jsonb),
  ('Document the business so it runs a week without you',
   '["List every task only you can currently do","Write down the top five as playbooks","Take a week off and note what breaks","Fix those, then take another week"]'::jsonb)
) as v(title, acts)
where m.title = v.title
  and m.company_id = (select company_id from public.profiles limit 1);

select title, jsonb_array_length(actions) as steps
from public.milestones
where company_id = (select company_id from public.profiles limit 1)
order by sort_order;
