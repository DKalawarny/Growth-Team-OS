-- ============================================================================
-- GrowthOS — playbooks & work-order checklists (migration 020)
--
-- Lets owners turn repeating jobs into reusable playbooks. A playbook is a
-- named list of steps the owner maintains once; whenever a new work order
-- is created from it, the steps are COPIED as checklist items the crew can
-- tick off — including from the staff portal on a phone in the field.
--
-- This is the "replace yourself with process" feature: owner-knowledge
-- becomes structured rows the crew works through, so the owner doesn't
-- field "what's next?" calls.
--
-- ----------------------------------------------------------------------------
-- Key design choices
--
-- 1. Checklist items are COPIES, not live references.
--    If the owner edits a playbook, in-flight work orders don't change
--    mid-job. (template_item_id is kept as a back-reference for analytics;
--    `on delete set null` means deleting a playbook step doesn't orphan
--    the in-flight item — it just loses its lineage.)
--
-- 2. done_by splits into two nullable FKs.
--    done_by_user_id   — office / profile user (Board edit modal)
--    done_by_staff_member_id — field crew via the magic-link portal
--    Exactly one is set in practice; we don't enforce that at the DB
--    because rolling back a check leaves both null, and that's fine.
--
-- 3. "required" steps don't HARD-gate marking a WO done yet.
--    They surface a warning in the UI. Hard gating is a Phase-4 add;
--    easier to ship the visible behavior first and tighten the rule once
--    crews are actually using checklists day-to-day.
--
-- 4. Templates are soft-deleted via archived_at.
--    We need to keep them for the historical record of WOs that used them.
--
-- 5. RLS mirrors staff_members (017): any profile attached to the company
--    can manage. The staff portal reads through an Edge Function with the
--    service-role key, so it bypasses these policies on purpose.
-- ============================================================================


-- ---- Playbook templates (the owner's library) ----
create table public.work_order_templates (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies(id) on delete cascade,
  name         text        not null,                    -- "Standard demo job"
  description  text,                                    -- optional, shown on the template card
  archived_at  timestamptz,                             -- soft-delete; keeps history of WOs that used it
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index work_order_templates_company_id_idx
  on public.work_order_templates(company_id)
  where archived_at is null;


-- ---- Steps within a template ----
create table public.work_order_template_items (
  id           uuid        primary key default gen_random_uuid(),
  template_id  uuid        not null references public.work_order_templates(id) on delete cascade,
  position     int         not null,                    -- ordering within the template (1, 2, 3...)
  text         text        not null,                    -- "Confirm site access with client"
  notes        text,                                    -- optional context shown under the step
  required     boolean     not null default true,       -- warns if unchecked when WO marked done
  created_at   timestamptz not null default now()
);

create index work_order_template_items_template_id_idx
  on public.work_order_template_items(template_id, position);


-- ---- Per-WO checklist instances ----
-- Spawned from a template at WO-create time OR added ad-hoc on the WO.
-- The copy is deliberate — see "Key design choices" #1 above.
create table public.work_order_checklist_items (
  id                       uuid        primary key default gen_random_uuid(),
  work_order_id            uuid        not null references public.work_orders(id) on delete cascade,
  template_item_id         uuid        references public.work_order_template_items(id) on delete set null,
  position                 int         not null,
  text                     text        not null,
  notes                    text,
  required                 boolean     not null default true,
  done                     boolean     not null default false,
  done_at                  timestamptz,
  done_by_user_id          uuid        references public.profiles(id)        on delete set null,
  done_by_staff_member_id  uuid        references public.staff_members(id)   on delete set null,
  created_at               timestamptz not null default now()
);

create index work_order_checklist_items_wo_id_idx
  on public.work_order_checklist_items(work_order_id, position);


-- ---- Back-reference on work_orders ----
-- Nullable: WOs created without a playbook (ad-hoc) are still valid.
-- on delete set null: archiving / deleting a template doesn't orphan the WO.
alter table public.work_orders
  add column template_id uuid references public.work_order_templates(id) on delete set null;


-- ============================================================================
-- Row-Level Security — "any company member can manage" pattern (matches 017)
-- ============================================================================

alter table public.work_order_templates       enable row level security;
alter table public.work_order_template_items  enable row level security;
alter table public.work_order_checklist_items enable row level security;


create policy "Company members can manage playbook templates"
  on public.work_order_templates for all
  using (
    company_id = (select company_id from public.profiles where id = auth.uid())
  )
  with check (
    company_id = (select company_id from public.profiles where id = auth.uid())
  );


-- Template items inherit access through the parent template's company.
create policy "Company members can manage template items"
  on public.work_order_template_items for all
  using (
    template_id in (
      select id from public.work_order_templates
      where company_id = (select company_id from public.profiles where id = auth.uid())
    )
  )
  with check (
    template_id in (
      select id from public.work_order_templates
      where company_id = (select company_id from public.profiles where id = auth.uid())
    )
  );


-- Checklist items inherit through the parent work_order's company.
create policy "Company members can manage checklist items"
  on public.work_order_checklist_items for all
  using (
    work_order_id in (
      select id from public.work_orders
      where company_id = (select company_id from public.profiles where id = auth.uid())
    )
  )
  with check (
    work_order_id in (
      select id from public.work_orders
      where company_id = (select company_id from public.profiles where id = auth.uid())
    )
  );


-- ============================================================================
-- updated_at trigger for templates so the UI can show "last edited"
-- ============================================================================

-- create-or-replace so a future migration that defines this function elsewhere
-- doesn't conflict. Idempotent and safe to re-run.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger work_order_templates_touch_updated_at
before update on public.work_order_templates
for each row execute function public.touch_updated_at();
