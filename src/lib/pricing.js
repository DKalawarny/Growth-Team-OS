/**
 * Single source of truth for pricing.
 * If the price changes, update here — nowhere else.
 *
 * Stripe price IDs live in Supabase secrets (STRIPE_PRICE_ID_OWNER,
 * STRIPE_PRICE_ID_OWNER_ANNUAL) — not here. This file is for the
 * human-readable copy that appears in the UI.
 */

/**
 * ⭐ PAYMENTS KILL SWITCH — false for the duration of the free pilot.
 *
 * The pilot agreement at /terms makes two promises in Daniel's name:
 * "we will not ask you for payment details during the pilot" and "nothing will
 * ever be charged to you during the pilot". Settings → Billing was meanwhile
 * showing a live "Upgrade now — $147/mo" button wired straight to Stripe
 * Checkout, and so were /pricing and the Paywall.
 *
 * A pilot user clicking that would have been charged in direct contradiction of
 * the agreement they had just accepted — and charged $97, not $147, because the
 * Stripe price IDs still point at the old prices.
 *
 * Same idea as kinwove's VITE_PAYMENTS_LIVE. Kept as a plain constant rather
 * than an env var on purpose: this must not be flippable by a stray Netlify
 * setting, and turning payments on should be a commit someone can see.
 *
 * ⚠️ Flip to true ONLY when all three are true:
 *   1. Pricing is settled (the questionnaire has run — see CLAUDE.md).
 *   2. New Stripe prices exist at the settled figure and both
 *      STRIPE_PRICE_ID_OWNER / _ANNUAL secrets point at them.
 *   3. The terms have been reissued for a paid product — the pilot agreement
 *      does not cover billing, refunds, renewal or cancellation at all.
 */
export const PAYMENTS_LIVE = false

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
