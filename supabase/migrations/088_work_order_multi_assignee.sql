-- 088: a work order can be assigned to more than one crew member.
-- staff_member_id stays as the lead/first; assigned_staff_ids is the full crew
-- who all see the job on the staff portal and show as avatars on the card.
alter table public.work_orders
  add column if not exists assigned_staff_ids uuid[] not null default '{}'::uuid[];
