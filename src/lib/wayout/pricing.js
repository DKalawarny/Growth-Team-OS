/**
 * The way out — price, in exactly one place.
 *
 * ⭐ SAME RULE AS src/lib/pricing.js, FOR THE SAME REASON. Eliv8 OS had $147
 * hardcoded into JSON-LD schemas built to be quoted by AI assistants, and they
 * went on advertising it long after the price changed. A price literal written
 * anywhere else is a price that will be wrong somewhere nobody is looking.
 *
 * ⚠️ NOTHING IS CHARGEABLE YET. `PAYMENTS_LIVE` is false and there is no Stripe
 * price object behind this figure. Stripe on this account is still in TEST mode
 * ("Leados sandbox"), and creating a live one-time price is Daniel's call, not
 * a side effect of building the screens.
 *
 * Flipping this to true requires BOTH:
 *   1. A real Stripe price at this exact figure, in live mode, with its id in
 *      `STRIPE_PRICE_ID_WAYOUT` as an edge-function secret. Stripe prices are
 *      immutable — a changed figure means a NEW price object, never an edit.
 *   2. The `wayout` branch of stripe-webhook writing `status = 'paid'`, which
 *      is the only thing the database will accept as proof of payment
 *      (migration 046 locks the column against the client).
 *
 * Until then the paywall screen says plainly that it cannot take money yet,
 * rather than rendering a button that goes nowhere.
 */

/** One-time, in cents, to avoid float arithmetic on money. */
export const WAYOUT_PRICE_CENTS = 3900
export const WAYOUT_CURRENCY    = 'CAD'

/** The human-readable figure. The only string anyone should print. */
export const WAYOUT_PRICE_LABEL = '$39'

/**
 * ⚠️ Gate, not a preference. While this is false no checkout is started and no
 * price is presented as payable.
 */
export const WAYOUT_PAYMENTS_LIVE = false
