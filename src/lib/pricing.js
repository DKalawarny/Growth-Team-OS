/**
 * Single source of truth for pricing.
 * If the price changes, update here — nowhere else.
 *
 * Stripe price IDs live in Supabase secrets (STRIPE_PRICE_ID_OWNER,
 * STRIPE_PRICE_ID_OWNER_ANNUAL) — not here. This file is for the
 * human-readable copy that appears in the UI.
 */

export const PRICE_MONTHLY_USD     = 147
export const PRICE_ANNUAL_USD      = 1470
export const PRICE_MONTHLY_CAD_EST = 202   // approximate, shown as "~$202 CAD"
export const PRICE_ANNUAL_CAD_EST  = 2014  // approximate

export const TRIAL_DAYS = 14

/** Formatted strings for direct use in JSX */
export const PRICE_MONTHLY_DISPLAY  = `$${PRICE_MONTHLY_USD}/mo`
export const PRICE_ANNUAL_DISPLAY   = `$${PRICE_ANNUAL_USD}/yr`
export const ANNUAL_MONTHLY_EQUIV   = Math.round(PRICE_ANNUAL_USD / 12) // $123

/**
 * ⚠️ Changing these numbers changes the COPY only.
 *
 * The actual charge comes from the Stripe price IDs in Supabase secrets
 * (STRIPE_PRICE_ID_OWNER, STRIPE_PRICE_ID_OWNER_ANNUAL), which still point at
 * the old $97 / $970 prices. Stripe prices are immutable — you cannot edit an
 * amount — so going live at $147 means creating two NEW prices and updating
 * both secrets. Until that happens the page says $147 and the card is charged
 * $97, which is the wrong way round to get that mismatch.
 */
