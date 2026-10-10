import { describe, it, expect } from 'vitest'
import { sheetRows, MONEY_STEP } from './planSheet'

const chip = (key, label) => ({ key, label, custom: false })
const base = {
  out: 'Home for dinner every night',
  goalType: [chip('time', 'More time')],
  immovables: [chip('kids-home', 'Kids at home')],
  takeHome: 6200, mustPay: 4100, region: 'uk',
}
const labels = rows => rows.map(r => r.label)

describe('the plan sheet shows what they said and nothing else', () => {
  it('is empty for somebody who has answered nothing', () => {
    expect(sheetRows({}, 0)).toEqual([])
    expect(sheetRows(null, 3)).toEqual([])
  })

  it('shows their own sentence as they wrote it', () => {
    expect(sheetRows(base, 1)[0]).toMatchObject({ text: 'Home for dinner every night', hand: true })
  })

  it('keeps money off the sheet until the money screen is behind them', () => {
    for (let step = 0; step <= MONEY_STEP; step++) {
      expect(labels(sheetRows(base, step))).not.toContain('Each month')
    }
    const row = sheetRows(base, MONEY_STEP + 1).find(r => r.label === 'Each month')
    expect(row.text).toBe('£6,200 comes in, £4,100 goes out')
  })

  it('never shows a money row built from a missing figure', () => {
    expect(labels(sheetRows({ ...base, mustPay: '' }, MONEY_STEP + 1))).not.toContain('Each month')
    expect(labels(sheetRows({ ...base, takeHome: undefined }, MONEY_STEP + 1))).not.toContain('Each month')
  })

  it('reads bare keys carried from the first taps as well as tapped chips', () => {
    const rows = sheetRows({ goalType: ['money', 'time'], assets: ['truck'] }, 1)
    expect(rows.find(r => r.label === 'What you want').items).toEqual(['More money', 'More time'])
    expect(rows.find(r => r.label === 'What you have to work with').items).toEqual(['Truck or van'])
  })

  it('only shows what takes their time when time is something they want', () => {
    const eaters = [chip('work-travel', 'Getting to and from work')]
    expect(labels(sheetRows({ ...base, timeEaters: eaters }, 4))).toContain('What takes your time')
    expect(labels(sheetRows({ ...base, goalType: [chip('money', 'More money')], timeEaters: eaters }, 4)))
      .not.toContain('What takes your time')
  })
})
