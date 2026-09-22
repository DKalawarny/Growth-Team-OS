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

/**
 * ⭐⭐ THE MODEL, SETTLED 21 SEP: THE MAP IS FREE, THE WALKTHROUGH IS $29/MONTH.
 *
 * It was $39 once for the map, and two files each claimed to be the paid half —
 * Plan.jsx said "$39, once. Not a subscription." while Play.jsx said "THIS IS
 * THE PAID HALF". Both cannot be true.
 *
 * ⭐ Why the map is free: their problem is money, so the hardest $39 in
 * consumer software is the one asked of somebody who is stuck. The map is also
 * the only thing anyone would ever show a friend — putting it behind a paywall
 * costs the distribution as well as the conversion. Daniel: "getting someone to
 * try it out for free for feedback and REVIEW IS MORE IMPORTANT."
 *
 * ⚠️ WHY $29 AND NOT LESS, WHICH IS THE COUNTER-INTUITIVE PART. This product
 * FINISHES — three moves, two gates, out. Software priced cheap makes it back
 * on duration; a thing people complete cannot. Lifetime is four to six months,
 * so the monthly figure does all the work. "A small amount per week" optimises
 * for signup, and signup is not where this loses people.
 *
 * ⚠️ MONTHLY ONLY. NO ANNUAL PLAN. On something finished in six months, annual
 * is taking money for months they will not use — a refund magnet, and a direct
 * contradiction of a product whose whole posture is that you cannot be
 * ambushed. The short lifetime costs less than it looks, because it is short
 * either way.
 */
export const WAYOUT_PRICE_CENTS = 2900
export const WAYOUT_CURRENCY    = 'CAD'
export const WAYOUT_PRICE_PERIOD = 'month'

/** The human-readable figure. The only string anyone should print. */
export const WAYOUT_PRICE_LABEL = '$29'

/** With the period attached — for anywhere a bare figure would read as one-off. */
export const WAYOUT_PRICE_FULL = '$29 a month'

/**
 * ⚠️ Gate, not a preference. While this is false no checkout is started and no
 * price is presented as payable.
 */
export const WAYOUT_PAYMENTS_LIVE = false

/**
 * ⭐⭐ SAY THE PRICE EARLY, EVERY TIME. THE FEAR IS THE AMBUSH, NOT THE MONEY.
 *
 * 🔴 Four screens used to read "Nothing to buy until you've seen your plan",
 * and the actual flow is finish the questions → paywall → pay → THEN it
 * generates. We were promising people they would see it first. Someone who
 * suspects a bait-and-switch and then meets one has been proved right about us,
 * and there is no copy that recovers from that.
 *
 * ⚠️ The way to remove the fear is not to promise it away. It is to make it
 * impossible to be surprised: the number, in plain words, before a single
 * question, and again while they answer. Somebody who knew at minute zero
 * cannot be ambushed at minute fifteen.
 */
export function priceLine() {
  // ⭐ The assessment is free and always will be. What is paid for is the
  // play-by-play — how to actually do the move you are standing on.
  return WAYOUT_PAYMENTS_LIVE
    ? `Your plan is free. ${WAYOUT_PRICE_FULL} later, only if you want the step-by-step for actually doing it — and only for as long as you are doing it.`
    : 'Your plan is free. Nothing to pay, at the end or anywhere else.'
}

/** The short version, for a corner of the screen while they answer. */
export function priceShort() {
  return WAYOUT_PAYMENTS_LIVE ? 'Your plan is free. No catch at the end.' : 'Your plan is free.'
}

/**
 * ⚠️ A real promise, not a marketing line. At this volume a refund costs almost
 * nothing, and it moves the risk off the person who has the least ability to
 * carry it — which is the whole posture of the product.
 */
export function guaranteeLine() {
  // ⚠️ Nothing about money back while nothing is being taken — "refund" copy on
  // a free product reads as a script somebody forgot to switch off.
  return WAYOUT_PAYMENTS_LIVE
    ? 'Cancel in one click, any month. If it doesn’t fit your life, say so and you get that month back — no form to fill in.'
    : ''
}

/**
 * ⭐⭐ WHAT THE SUBSCRIPTION IS, IN ONE SENTENCE — and the wording is load-bearing.
 *
 * 🔴 IT MUST NEVER IMPLY A HUMAN IS ON THE OTHER END. This product's whole
 * reason for working without one is capability, not accountability. Somebody
 * who expects a coach and meets software has been misled, and that is the one
 * thing this product cannot survive. Daniel settled the phrasing: "it walks the
 * move with you", NOT "a coach walks you through".
 */
export function walksWithYouLine() {
  return 'It walks the move with you — the step-by-step, your questions answered '
    + 'as they come up, and it keeps up as things change.'
}
