/**
 * The way out — field validation.
 *
 * ⚠️ Lives apart from fields.jsx on purpose: a module that exports both React
 * components and plain helpers breaks Fast Refresh, so every keystroke in the
 * intake would remount the form and lose the answer being typed.
 */

/**
 * Is a required field answered?
 *
 * ⚠️ An empty array, an empty string and a whitespace-only string all count as
 * unanswered — a required free text satisfied by a space is a required field
 * that does nothing.
 */
export function isAnswered(field, value) {
  if (!field.required) return true
  if (Array.isArray(value)) return value.length > 0
  // A score field is a map of key → 1-10; answered once anything is scored.
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return true
  return value != null
}

/**
 * ⭐⭐ "MORE INFO THE BETTER OR ITS USELESS." Daniel, 9 Oct, after two family
 * members tested it and one said the outcome was good "if people put in what I
 * did, or even just a bit more". The plan is written from these answers, so a
 * three word answer to a question the plan aims at gets a generic plan back.
 *
 * ⚠️ This NEVER blocks. A field marked `nudge` that has an answer but a thin
 * one gets a single note on Next; pressing Next again goes on. Empty is the
 * `required` check's job, not this one's, so an optional field left blank is
 * never nudged.
 *
 * ⚠️ Counted in WORDS that carry a letter or digit, so "- - -" or a row of
 * full stops does not count as an answer.
 */
export const THIN_WORDS = 6

export function isThin(field, value) {
  if (!field?.nudge || typeof value !== 'string') return false
  const words = value.trim().split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w))
  return words.length > 0 && words.length < THIN_WORDS
}
