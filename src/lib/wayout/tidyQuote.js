/**
 * ⭐⭐ THEIR WORDS, TIDIED — NEVER THEIR WORDS, CHANGED.
 *
 * Daniel, seeing a real plan quote him back: "i like that it pulls out quotes…
 * but maybe make sure it's auto corrected or caps where it needs to be if it's
 * an obvious mistake." The quote on screen read:
 *
 *   "the hustle isnt evreything and at the end of the day you only have so much
 *    time with your family especially since i have 5 kids"
 *
 * He is right that it reads worse than he does. It is the most important
 * sentence on the page — the one piece of evidence that anybody read what he
 * wrote — and it is presented with a lower-case opening and a bare "i".
 *
 * 🔴 BUT THE VERBATIM GUARD IS NOT NEGOTIABLE. `mapContract.js` drops the card
 * unless the quote is a verbatim substring of what they actually typed, because
 * a fabricated quote takes every other claim on the page with it. So the model
 * must keep quoting exactly, and the tidying happens HERE, at render, after the
 * check has already passed. The stored quote never changes.
 *
 * ⭐⭐ AND ONLY CHANGES THAT CANNOT ALTER MEANING. This capitalises the first
 * letter, capitalises a standalone "i", and drops a trailing comma. That is the
 * whole list, and the list is short on purpose.
 *
 * 🔴 SPELLING IS DELIBERATELY LEFT ALONE. "evreything" is obvious to a person
 * and not to a rule — the same correction applied to a name, a trade term or a
 * place would be putting a word in somebody's mouth inside quotation marks,
 * which is the exact failure the verbatim guard exists to prevent. Fixing
 * spelling safely needs a dictionary that knows what it must not touch; until
 * there is one, a typo left standing is honest and a wrong word is not.
 */
export function tidyQuote(text) {
  if (!text) return text
  let out = String(text).trim()
  // A standalone "i" is always the pronoun. `\b` alone would also match the i
  // inside a word in some engines; the spaces make it unambiguous.
  out = out.replace(/(^|[\s("'—–-])i(?=$|[\s.,!?;:)"'—–-])/g, (m, pre) => `${pre}I`)
  // First letter of the quote.
  out = out.replace(/^(\p{Ll})/u, c => c.toUpperCase())
  // A quote sliced mid-sentence often ends on a comma, which reads as an error.
  out = out.replace(/,$/, '')
  return out
}
