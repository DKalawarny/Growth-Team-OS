import { WAYOUT_SCREENS, wantsTime } from '../../content/wayoutIntake'
import { DIAGNOSTIC_QUESTIONS } from '../../content/wayoutDiagnostic'
import { currencyFor } from './currency'

/**
 * ⭐ The rows of the plan sheet, from what they have answered so far.
 *
 * 🔴 Their own answers and nothing else. Chips show the label they tapped, the
 * opening sentence shows as they wrote it, and the money row is two of their own
 * figures side by side with no sum and no comment on it.
 *
 * ⚠️ MONEY ONLY ONCE THAT SCREEN IS BEHIND THEM. Daniel: "the money should
 * populate after so people don't get turned off." It never appears as an empty
 * slot waiting for a number, and it does not tick over while they type.
 */
const FIELDS = Object.fromEntries(WAYOUT_SCREENS.flatMap(s => s.fields).map(f => [f.key, f]))
export const MONEY_STEP = WAYOUT_SCREENS.findIndex(s => s.fields.some(f => f.key === 'takeHome')) + 1
const MAX_TOKENS = 6
const HORIZON = DIAGNOSTIC_QUESTIONS.find(q => q.key === 'horizon')?.options ?? []

function labelsOf(key, value) {
  const f = FIELDS[key]
  const opts = [...(f?.options ?? []), ...(f?.groups ?? []).flatMap(g => g.options)]
  const list = Array.isArray(value) ? value : value ? [value] : []
  const labels = list.map(x => x?.label ?? opts.find(o => o.key === (x?.key ?? x))?.label).filter(Boolean)
  return labels.length > MAX_TOKENS
    ? [...labels.slice(0, MAX_TOKENS), `and ${labels.length - MAX_TOKENS} more`]
    : labels
}

/** `step` is the intake's own: 0 the opening, 1..N the screens, N+1 the open box. */
export function sheetRows(answers, step) {
  const a = answers ?? {}
  const rows = [
    { label: 'Where you want to be', text: typeof a.out === 'string' ? a.out.trim() : '', hand: true },
    { label: 'What you want', items: labelsOf('goalType', a.goalType) },
    // ⚠️ Carried from the first taps as a bare key. Left off, a row they had
    // watched appear would vanish on the next screen.
    { label: 'How soon', items: [HORIZON.find(o => o.key === a.horizon)?.label].filter(Boolean) },
    { label: 'What stays put', items: labelsOf('immovables', a.immovables) },
    { label: 'What takes your time', items: wantsTime(a) ? labelsOf('timeEaters', a.timeEaters) : [] },
    { label: 'What you have to work with', items: labelsOf('assets', a.assets) },
  ]
  const hours = labelsOf('hoursPerWeek', a.hoursPerWeek)[0]
  if (hours) rows.push({ label: 'Time you can give', text: `${hours} hours a week` })
  const money = n => `${currencyFor(a.region).symbol}${Number(n).toLocaleString('en')}`
  const has = n => n !== '' && n != null && Number.isFinite(Number(n))
  if (step > MONEY_STEP && has(a.takeHome) && has(a.mustPay)) {
    rows.push({ label: 'Each month', text: `${money(a.takeHome)} comes in, ${money(a.mustPay)} goes out` })
  }
  return rows.filter(r => (r.text && r.text.length) || (r.items && r.items.length))
}
