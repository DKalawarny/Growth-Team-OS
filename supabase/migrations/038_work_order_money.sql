-- ============================================================================
-- 038 — what a job quoted, cost, and made
--
-- Daniel, 2 Sep: a PM should see "job numbers, not company numbers". Checking
-- that turned up the obvious problem — THERE WERE NO JOB NUMBERS. A work order
-- was a title, a status, an assignee and a due date. The permission would have
-- governed data that did not exist.
--
-- ⭐ It also closes a gap that has nothing to do with permissions. Today the
-- crew tells Solomon what happened and the books tell him what it cost, and
-- nothing connects the two. With these he can say "Northgate quoted at 22% and
-- came in at 14%, and Marcus logged a 40-minute access delay on it" instead of
-- asking the owner how it went.
--
-- ⚠️ ALL THREE ARE OPTIONAL AND ALWAYS WILL BE. An owner who fills none of them
-- must keep a working board — the moment a job cannot be created without a
-- price, this stops being a job record and becomes an estimating tool nobody
-- asked for. Null means "not entered", never zero.
--
-- ⚠️ NOT ACCOUNTING. These are the owner's own working figures, not invoices
-- and not a general ledger. Solomon must treat them as what the owner believes
-- rather than what is banked — the same standing he gives any number typed in
-- by hand rather than pulled from QuickBooks.
-- ============================================================================

alter table public.work_orders
  add column if not exists quoted_amount   numeric(12,2) check (quoted_amount   is null or quoted_amount   >= 0),
  add column if not exists cost_amount     numeric(12,2) check (cost_amount     is null or cost_amount     >= 0),
  add column if not exists invoiced_amount numeric(12,2) check (invoiced_amount is null or invoiced_amount >= 0);

comment on column public.work_orders.quoted_amount is
  'What the customer was told the job would cost. Owner-entered, optional, null = not entered (never 0).';
comment on column public.work_orders.cost_amount is
  'What it cost to deliver — the owner''s own figure, not an accounting number.';
comment on column public.work_orders.invoiced_amount is
  'What was actually billed. Quoted vs invoiced is scope creep; invoiced vs cost is the margin that job really made.';
