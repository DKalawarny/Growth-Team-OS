/**
 * Single source of truth for pricing.
 * If the price changes, update here — nowhere else.
 *
 * Stripe price IDs live in Supabase secrets (STRIPE_PRICE_ID_OWNER,
 * STRIPE_PRICE_ID_OWNER_ANNUAL) — not here. This file is for the
 * human-readable copy that appears in the UI.
 */

export const PRICE_MONTHLY_USD     = 97
export const PRICE_ANNUAL_USD      = 970
export const PRICE_MONTHLY_CAD_EST = 133   // approximate, shown as "~$133 CAD"
export const PRICE_ANNUAL_CAD_EST  = 1329  // approximate

export const TRIAL_DAYS = 14

/** Formatted strings for direct use in JSX */
export const PRICE_MONTHLY_DISPLAY  = `$${PRICE_MONTHLY_USD}/mo`
export const PRICE_ANNUAL_DISPLAY   = `$${PRICE_ANNUAL_USD}/yr`
export const ANNUAL_MONTHLY_EQUIV   = Math.round(PRICE_ANNUAL_USD / 12) // $81
