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

/**
 * ⭐ PUBLIC PRICE SWITCH — separate from PAYMENTS_LIVE on purpose.
 *
 * PAYMENTS_LIVE answers "can we charge?". This answers "should we publish a
 * number?", and during the pilot the honest answer is no.
 *
 * The site was advertising $147 on roughly thirteen indexed pages — /pricing,
 * the landing page, six /for/<trade> pages, four /vs/<competitor> pages — plus
 * Product JSON-LD built to be quoted back by search engines and AI assistants.
 *
 * Two problems with that, while nothing is actually for sale:
 *
 *   1. Daniel's own view is that $147 is probably too low; that is why the
 *      pricing questionnaire exists. Publishing it anyway anchors the market
 *      at a number we expect to abandon, and the answers-from-AI channel —
 *      the only one that has ever brought this product a stranger — is busy
 *      memorising and caching it.
 *   2. Stripe is still wired to the old $97 prices, so the published number
 *      was never the number a card would be charged.
 *
 * ⚠️ Flip to true when the questionnaire has settled the price AND the Stripe
 * prices match it. Until then every public surface reads PILOT_PRICE_LINE and
 * the schema publishes no offer at all.
 *
 * PRICE_MONTHLY_USD stays the single source of truth either way — this
 * controls whether we say it out loud, not what it is.
 */
export const SHOW_PUBLIC_PRICE = false

/** What public surfaces say instead of a number while the pilot runs. */
export const PILOT_PRICE_LINE  = 'Free while in private pilot'
export const PILOT_PRICE_BLURB =
  'Eliv8 OS is in private pilot and free to use. We are setting the price with the first owners using it — you will be told well before anything is ever charged.'

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
 * ⚠️ DERIVED, NEVER TYPED. The pricing page carried two different annual
 * savings figures twenty pixels apart: the toggle badge computed
 * `PRICE_MONTHLY_USD * 2` ($294) while the card underneath it read a hardcoded
 * "pocket $194". $294 is correct — 12 × 147 − 1470. A visitor comparing the two
 * numbers finds the page cannot do its own arithmetic, on the one page where
 * that matters most.
 *
 * The badge's $294 was right only by coincidence: it multiplied the monthly
 * price by two rather than subtracting the annual price, so it would have gone
 * wrong the moment annual stopped being exactly ten months. Both now derive.
 */
export const ANNUAL_SAVINGS_USD = PRICE_MONTHLY_USD * 12 - PRICE_ANNUAL_USD   // 294
export const ANNUAL_MONTHS_FREE = Math.round(ANNUAL_SAVINGS_USD / PRICE_MONTHLY_USD) // 2

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
