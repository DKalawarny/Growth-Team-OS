import { describe, it, expect } from 'vitest'
import { deriveHeadline } from './CashFlowPlan'

const wk = bals => bals.map((b, i) => ({ week: i + 1, ending_balance: b }))

describe('deriveHeadline', () => {
  it('takes the lowest week from the weeks, not the model (18 Oct: said week 11 $150k, week 12 was $142k)', () => {
    const weeks = wk([244500, 244500, 249000, 249000, 253500, 253500, 242000, 222000, 202500, 169500, 150000, 142000, 146500])
    const r = deriveHeadline({ weeks, comfort_threshold: 120000, lowest_point: { week: 11, balance: 150000, note: 'GST lands' } })
    expect(r.lowest).toEqual({ week: 12, balance: 142000, note: undefined })
    expect(r.runway).toBe(13)
  })
  it('keeps the note when the model named the right week', () => {
    const r = deriveHeadline({ weeks: wk([5, 3, 4]), lowest_point: { week: 2, balance: 3, note: 'n' } })
    expect(r.lowest.note).toBe('n')
  })
  it('counts weeks before the first one under the comfort line', () => {
    const r = deriveHeadline({ weeks: wk([200, 150, 90, 120]), comfort_threshold: 100 })
    expect(r.runway).toBe(2)
  })
  it('falls back to the model fields when there are no weeks', () => {
    const lp = { week: 3, balance: 1 }
    expect(deriveHeadline({ weeks: [], lowest_point: lp, runway_weeks: 5 })).toEqual({ lowest: lp, runway: 5 })
  })
})
