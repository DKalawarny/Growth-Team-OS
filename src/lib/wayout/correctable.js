import { WAYOUT_SCREENS } from '../../content/wayoutIntake'
import { currencyFor } from './currency'

/**
 * ⭐⭐ THE ANSWERS A PERSON CAN CORRECT FROM THE PLAN.
 *
 * Daniel, 1 Oct: "so there is no way of going back in here and change things
 * that could be wrong." There was one — "change my answers" — and it is
 * rationed to one trip back through the questions, so once spent the plan sat
 * on a wrong fact with no way to fix it. A correction is not a re-roll: it is
 * one fact, said plainly, and it rebuilds through the same route as anything
 * else that changed.
 *
 * ⚠️ The facts the plan turns on, not the whole form. The long written answers
 * (their story, what they want out) are theirs in their own words and are
 * better added to through "Something changed?" than edited in a box.
 * Labels come from the intake itself, so a reworded question rewords this too.
 */
const KEYS = [
  // ⭐ First: the country decides which crisis lines are shown, and anybody who
  // finished before 1 Oct was never asked it.
  'region',
  'takeHome', 'householdTakeHome', 'mustPay', 'housingCost', 'savings',
  'debt', 'enough', 'coming', 'refuse',
]

const FIELDS = Object.fromEntries(
  WAYOUT_SCREENS.flatMap(s => s.fields ?? []).map(f => [f.key, f]),
)

export function correctableAnswers(answers = {}) {
  return KEYS
    .filter(k => FIELDS[k])
    .map(k => ({
      key: k,
      label: FIELDS[k].label,
      kind: FIELDS[k].kind,
      options: FIELDS[k].options ?? null,
      symbol: currencyFor(answers?.region).symbol,
      value: typeof answers?.[k] === 'string' || typeof answers?.[k] === 'number' ? String(answers[k]) : '',
    }))
}

/** How an answer reads back: a figure gets its dollar sign, an empty one says so. */
export function showAnswer(kind, value, options = null, symbol = '$') {
  const v = String(value ?? '').trim()
  if (!v) return 'Not answered'
  if (options) return options.find(o => o.key === v)?.label ?? v
  // A bare figure is money on this form, whichever kind of box it was typed in.
  if (/^[$£€]?\d[\d,]*(\.\d+)?$/.test(v)) return `${symbol}${Number(v.replace(/[$£€,]/g, '')).toLocaleString('en-US')}`
  return v
}

/**
 * The sentence the correction leaves in the thread. It is THEIR turn, so the
 * next reply and the rebuild both read it — the rebuild takes every sentence
 * they said, and the corrected answer itself is already saved underneath.
 */
export function correctionSentence(field, from, to) {
  const was = String(from ?? '').trim()
  return `Correction to my answers — ${field.label.replace(/\?$/, '')}: ${showAnswer(field.kind, to, field.options, field.symbol)}`
    + (was ? ` (I had put ${showAnswer(field.kind, was, field.options, field.symbol)}).` : '.')
}
