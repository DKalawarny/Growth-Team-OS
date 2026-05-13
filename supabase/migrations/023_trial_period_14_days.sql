-- 023_trial_period_14_days.sql
--
-- Bump the free-trial window from 7 → 14 days.
--
-- Why:
--   Every customer-facing surface (Signup hero copy, Signup meta description,
--   Pricing page, marketing emails) already promises a 14-day trial. Only the
--   database default was lagging at 7 days — which would have caused trials
--   to expire a week before the paywall copy said they would, generating a
--   support ticket from every single first user.
--
-- Scope:
--   This migration touches the default only. Existing rows are not back-
--   filled — anyone who signed up under the old 7-day default keeps their
--   original trial_ends_at value. The app isn't in production yet, so there
--   are no real customers to migrate; the dev/test accounts in the DB can
--   either let their trials lapse or be bumped manually via:
--
--     update public.companies
--        set trial_ends_at = trial_ends_at + interval '7 days'
--      where trial_ends_at > now();   -- only ones still in trial
--
--   We deliberately don't run that in this migration: it would silently
--   extend trials in someone else's dev DB, which is a footgun.

alter table public.companies
  alter column trial_ends_at
  set default (now() + interval '14 days');
