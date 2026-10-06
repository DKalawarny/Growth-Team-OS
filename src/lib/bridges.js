/**
 * ⭐⭐ THE TWO PRODUCTS POINT AT EACH OTHER — ONLY WHEN THE PERSON IS READY.
 *
 * Daniel, 3 Oct 2026: "refer each other when necessary or they're ready", and
 * the voice: "this will help with your business in this way — Unstuck can still
 * help you, but you may need this." So every bridge says BOTH: what stays where
 * you are, and what the other one is for. It is an addition, never a switch.
 *
 * ⚠️ Rules, each one a reason:
 *  - Never inside AI-written text. A plan that advertises is a plan nobody trusts.
 *  - Only where the page or the person is already on the other side's ground:
 *    an owner whose business is running (→ Eliv8), an owner whose problem is
 *    their own life (→ Unstuck). Not on "should I quit to start a business" —
 *    there is no business yet, so pointing there would be a push.
 *  - Never during a crisis, and gone for good once closed.
 *  - Names from their own source files, never as literals (brand.js, seo.js).
 *  - 🔴 Names do not cross products: Unstuck Map's AI is never called Solomon.
 */
import { SITE_NAME, SITE_URL } from './seo.js'
import { WAYOUT_NAME, WAYOUT_SITE_URL } from './wayout/brand.js'

const tagged = (base, from, campaign) =>
  `${base}/?utm_source=${from}&utm_medium=referral&utm_campaign=${encodeURIComponent(campaign)}`

/** Unstuck Map → Eliv8 OS: the business itself needs work. */
export function bridgeToEliv8(campaign) {
  return {
    kicker: 'For the business side',
    text: `${WAYOUT_NAME} keeps working on your life: the money at home, your time, what all of it is for. The business itself may need something different: pricing that leaves a margin, cash flow, hiring, getting out of the day-to-day. ${SITE_NAME} is built for that side, and we make it too.`,
    label: `See what ${SITE_NAME} does for a business`,
    href: tagged(SITE_URL, 'unstuckmap', campaign),
  }
}

/** Eliv8 OS → Unstuck Map: what is stuck is the owner's own life. */
export function bridgeToUnstuck(campaign) {
  return {
    kicker: 'If this is about your life, not just the business',
    text: `${SITE_NAME} keeps helping with the business. If what is stuck is your own life, your household money, your time, whether you want out, ${WAYOUT_NAME} is built for that side. We make it too, and the plan is free.`,
    label: `Try ${WAYOUT_NAME}`,
    href: tagged(WAYOUT_SITE_URL, 'eliv8', campaign),
  }
}

/** Unstuck situation pages where a business is already running. */
export const UNSTUCK_PAGES_TO_ELIV8 = new Set([
  'business-makes-money-but-i-never-do',
  'how-to-start-a-business-while-working-full-time',
  'my-business-is-taking-over-my-life',
  'should-i-close-my-business',
])

/** Eliv8 answer pages where the real question is the owner's own life. */
export const ELIV8_PAGES_TO_UNSTUCK = new Set([
  'how-much-should-i-pay-myself',
  'how-do-i-take-a-holiday',
  'should-i-sell-the-business',
])
