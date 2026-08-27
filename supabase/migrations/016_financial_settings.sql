-- ============================================================================
-- Eliv8 OS — business_profiles.financial_settings (migration 016)
--
-- Adds a JSONB column on business_profiles for overdraft + credit-card limits
-- and balances. CreditFacilitiesSection.jsx writes/reads here so Claude can
-- factor liquidity into cash-flow advice without re-asking each session.
-- ============================================================================

alter table public.business_profiles
  add column if not exists financial_settings jsonb;

comment on column public.business_profiles.financial_settings is
  'Liquidity snapshot kept once and reused across Claude sessions: '
  '{ overdraft_limit, overdraft_used, cc_limit, cc_balance } in USD. '
  'Nullable — empty until the user fills the Credit & liquidity panel in Settings.';
