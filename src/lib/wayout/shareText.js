import { WAYOUT_NAME, WAYOUT_SITE_URL } from './brand'
import { forReaders } from './mapContract'

/**
 * ⭐⭐ WHAT SOMEONE SENDS A FRIEND ABOUT THEIR PLAN (17 Oct 2026).
 *
 * The free plan is the only thing anyone would show a friend, so it is how
 * strangers arrive without ad money. Daniel: "how do we get it to snowball".
 *
 * 🔴 It is THEIR plan, so it is a draft in a box they edit, never a public page.
 * A plan holds their debt, their custody, what they are running from. Only the
 * move titles go in, and every money figure comes out before they even see it:
 * "$300 short" in a text to a brother-in-law is not ours to send.
 */

/** The link carries utm tags so source.js counts a shared plan as its own source. */
export const SHARE_URL = `${WAYOUT_SITE_URL}/?utm_source=share`

const MONEY = /\$\s?\d[\d,]*(?:\.\d+)?(?:k\b)?(?:\s*(?:a|per|\/)\s*(?:month|mo|week|year|yr))?/gi

/** Every money figure out. "the $300" reads as "the money", anything else as "money". */
export function withoutFigures(text) {
  return String(text ?? '')
    .replace(new RegExp(`\\bthe\\s+${MONEY.source}`, 'gi'), 'the money')
    .replace(MONEY, 'money')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function shareDraft(map) {
  const moves = (Array.isArray(map?.moves) ? map.moves : [])
    .map(m => withoutFigures(forReaders(m?.title)).replace(/[.\s]+$/, ''))
    .filter(Boolean)
    .slice(0, 3)
  const lines = [`I made my plan on ${WAYOUT_NAME}. My next three moves:`]
  moves.forEach((t, i) => lines.push(`${i + 1}. ${t}`))
  lines.push('', `Yours is free: ${SHARE_URL}`)
  return lines.join('\n')
}
