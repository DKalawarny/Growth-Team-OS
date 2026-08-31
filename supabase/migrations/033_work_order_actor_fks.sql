-- ============================================================================
-- 033 — let a person be deleted without their work orders blocking it
--
-- work_orders.created_by and .assigned_to were the ONLY two foreign keys in the
-- schema pointing at profiles(id) with no ON DELETE action, which in Postgres
-- means NO ACTION: the delete is refused rather than cascaded. Everything else
-- referencing profiles is already `on delete cascade` or `on delete set null`,
-- and nothing referencing companies(id) lacks an action at all.
--
-- So account deletion would have failed at exactly these two constraints. SET
-- NULL rather than CASCADE is deliberate: a work order is the COMPANY's record
-- of a job, not the person's. If a staff member leaves, the job history has to
-- survive them — deleting the crew member should not delete the evidence that
-- the work happened. The column simply stops naming anyone.
-- ============================================================================

alter table public.work_orders
  drop constraint if exists work_orders_created_by_fkey,
  add  constraint work_orders_created_by_fkey
       foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.work_orders
  drop constraint if exists work_orders_assigned_to_fkey,
  add  constraint work_orders_assigned_to_fkey
       foreign key (assigned_to) references public.profiles(id) on delete set null;

comment on column public.work_orders.created_by is
  'Profile that created this work order. SET NULL on profile delete — the job record outlives the person.';
comment on column public.work_orders.assigned_to is
  'Profile the work order is assigned to. SET NULL on profile delete — see created_by.';
