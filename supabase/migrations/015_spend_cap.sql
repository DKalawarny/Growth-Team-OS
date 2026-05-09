-- 015_spend_cap.sql
-- Adds a per-company monthly dollar spend cap (default $10).
-- Owners can top this up via the stripe-topup Edge Function.
-- The stripe-webhook increments it on successful payment.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS monthly_spend_cap numeric(8,2) NOT NULL DEFAULT 10.00;

COMMENT ON COLUMN companies.monthly_spend_cap IS
  'Hard monthly AI cost ceiling in USD. Blocks all Claude calls once reached. '
  'Increased by stripe-topup payments; resets to default on 1st of each month '
  '(reset is enforced at query time by comparing against calendar-month spend, '
  'not by writing to this column — the column is the cap, not the spend).';
