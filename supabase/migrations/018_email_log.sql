-- ============================================================================
-- Eliv8 OS — email_log (migration 018)
--
-- Audit trail for every transactional email we send via the send-email Edge
-- Function. Two reasons it exists:
--
--   1. Debugging — when a user says "I never got the email", we need to know
--      whether we actually sent it, what template, and Resend's message id
--      (so we can look up bounce/complaint status in the Resend dashboard).
--
--   2. Compliance future-proofing — CASL (Canada) and CAN-SPAM (US) both
--      benefit from a sent-mail audit log if anyone ever asks "where did you
--      get my email address from / when did you send me what".
--
-- Deliberately separate from any "delivered/bounced" webhook log. This row
-- means "we asked Resend to send X" — delivery status is a future addition
-- via the Resend webhook (out of scope for this migration).
--
-- RLS: company-scoped read for anyone in the company. No client writes —
-- only the Edge Function (service_role) inserts. We don't expose this in the
-- UI today; it's an admin/debugging surface.
-- ============================================================================

create table public.email_log (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies(id) on delete cascade,
  sent_by_uid  uuid                 references auth.users(id) on delete set null,
  template     text        not null,
  to_address   text        not null,
  subject      text        not null,
  resend_id    text,
  created_at   timestamptz not null default now()
);

create index email_log_company_id_idx on public.email_log(company_id, created_at desc);
create index email_log_template_idx   on public.email_log(template, created_at desc);

alter table public.email_log enable row level security;

-- Read-only for company members; no insert/update/delete policies — only the
-- service_role key (used by send-email Edge Function) can write.
create policy "Company members can read email log"
  on public.email_log for select
  using (
    company_id = (
      select company_id from public.profiles where id = auth.uid()
    )
  );
