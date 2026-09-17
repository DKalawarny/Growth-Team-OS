-- The way out — its own spend headroom.
--
-- 🔴 Daniel hit "Daily limit reached ($4.01 of $4.00 in the last 24 hours)"
-- mid-test. The cap did exactly what it was built to do; the problem is that it
-- was sized for a DIFFERENT PRODUCT.
--
-- Eliv8's default is $10/month and the daily backstop is 40% of it, so $4/day.
-- That is 40-80 Solomon turns — a fortune for a chat product where a turn costs
-- fractions of a cent. A way-out map is one Sonnet call with a 28,000-character
-- prompt writing 3,000 tokens: call it $0.15-0.30 each. The same $4 is roughly
-- a dozen plans a day, and a rejected first attempt spends two of them.
--
-- ⭐ The per-user economics here are also the opposite shape. Eliv8 is a
-- subscription where usage recurs every month forever; a way-out user generates
-- a plan, maybe rebuilds it once, and is done — a handful of dollars ONCE, in
-- their whole life. A monthly cap sized for open-ended chat is the wrong
-- instrument, and $30 is still a hard ceiling per account if anything goes
-- wrong.
--
-- ⚠️ PERSONAL ACCOUNTS ONLY. `is_personal` is set by bootstrap_personal_account
-- (047) and is true only for way-out. Eliv8 companies are untouched — their cap
-- is a real cost control on a product that bills monthly, and raising it here
-- would be raising it there by accident.
update public.companies
   set monthly_spend_cap = 30.00
 where is_personal = true
   and coalesce(monthly_spend_cap, 10.00) < 30.00;

-- ⚠️ NEW ACCOUNTS ARE HANDLED IN 054, NOT HERE. This migration originally
-- tried to redefine bootstrap_personal_account() and got the argument list
-- wrong, which created a second overload instead of replacing the real one.
-- That is undone and done properly in 054; this file now only does what its
-- name says — raise the cap on the personal accounts that already exist.
