import { headClause } from './markPhrase'

/**
 * The yellow marker — one copy, for the whole product.
 *
 * 🔴 THIS HELPER EXISTED FOUR TIMES, character for character, in Diagnostic,
 * Intake, Plan and (inline) Landing. That is the wordmark failure again: seven
 * hand-rolled copies of a thing that should have had one owner. Nothing had
 * gone wrong with it yet, which is exactly when to collapse it.
 *
 * ⭐⭐ The highlight is the product's signature. Every headline a person meets
 * on the way in carries it — the opening screen, the verdict, the plan — and
 * Daniel's word for what he wanted back was "the yellow highlights, the whole
 * feel before". The walkthrough, which is the page a subscriber actually
 * lives on, had none: measured on the rendered page, `marks: 0`.
 */

/**
 * Split a headline on its highlight phrase so the mark can wrap it.
 *
 * ⚠️ Substring, not fuzzy. A highlight that does not appear in the text marks
 * nothing rather than guessing — the same posture as the seen card, where a
 * quote that is not verbatim is dropped rather than approximated.
 */
/**
 * ⚠️ `derive` IS OPT-IN, AND THAT IS DELIBERATE. The three screens that already
 * carry a mark get an explicit phrase from the generator, and on the day one
 * comes back without one the right answer there is still no mark — not a
 * guessed one. Only the walkthrough, which has no such field at all, asks for
 * the derived phrase. A default that changed four screens at once to fix one
 * is how a copy of this helper ends up in four files again.
 */
export function Marked({ text, highlight, derive = false }) {
  const phrase = highlight || (derive ? headClause(text) : null)
  if (!phrase || !text?.includes(phrase)) return text
  const [before, ...rest] = text.split(phrase)
  return <>{before}<mark>{phrase}</mark>{rest.join(phrase)}</>
}

