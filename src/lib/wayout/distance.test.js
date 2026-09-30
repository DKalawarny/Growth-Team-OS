import { describe, it, expect } from 'vitest'
import { margin, distance, doneMoves } from './distance'

const ch = (chapter, answers, moves = [], createdAt = null) =>
  ({ id: `c${chapter}`, chapter, answers, moves, createdAt })

describe('margin', () => {
  it('subtracts their own two numbers', () => {
    expect(margin({ takeHome: '3400', mustPay: '2650' })).toBe(750)
    expect(margin({ takeHome: 3400, mustPay: 4000 })).toBe(-600)
  })
  it('refuses when either number is missing', () => {
    expect(margin({ takeHome: '3400' })).toBe(null)
    expect(margin({ mustPay: '2650' })).toBe(null)
    expect(margin({ takeHome: '', mustPay: '2650' })).toBe(null)
    expect(margin({ takeHome: 'about three thousand', mustPay: '2650' })).toBe(null)
    expect(margin({})).toBe(null)
    expect(margin()).toBe(null)
  })
})

describe('distance', () => {
  it('measures first chapter against the latest', () => {
    const d = distance([
      ch(1, { takeHome: 3400, mustPay: 3160 }),
      ch(2, { takeHome: 3900, mustPay: 2800 }),
    ])
    expect(d.then).toBe(240)
    expect(d.now).toBe(1100)
    expect(d.change).toBe(860)
    expect(d.direction).toBe('up')
  })

  /** A month that went backwards is still theirs and still the truth. */
  it('reports a fall without dressing it up', () => {
    const d = distance([
      ch(1, { takeHome: 4000, mustPay: 3000 }),
      ch(2, { takeHome: 3200, mustPay: 3000 }),
    ])
    expect(d.change).toBe(-800)
    expect(d.direction).toBe('down')
  })

  it('gives NOTHING rather than a zero it cannot stand behind', () => {
    // One chapter — there is no "then".
    expect(distance([ch(1, { takeHome: 3400, mustPay: 3160 })])).toBe(null)
    // A skipped money question at either end.
    expect(distance([ch(1, { takeHome: 3400 }), ch(2, { takeHome: 3900, mustPay: 2800 })])).toBe(null)
    expect(distance([ch(1, { takeHome: 3400, mustPay: 3160 }), ch(2, { mustPay: 2800 })])).toBe(null)
    expect(distance([])).toBe(null)
    expect(distance()).toBe(null)
  })

  it('reads the LATEST chapter, not the second', () => {
    const d = distance([
      ch(1, { takeHome: 3000, mustPay: 3000 }),
      ch(2, { takeHome: 3100, mustPay: 3000 }),
      ch(3, { takeHome: 3500, mustPay: 3000 }),
    ])
    expect(d.now).toBe(500)
  })
})

describe('doneMoves', () => {
  it('collects ticked moves across chapters, oldest first', () => {
    const list = doneMoves([
      ch(1, {}, [
        { title: 'Work out what your life costs', doneAt: '2026-03-02T10:00:00Z' },
        { title: 'Show Jen the number', doneAt: '2026-03-20T10:00:00Z' },
      ]),
      ch(2, {}, [{ title: 'Ask for the four-day week', doneAt: '2026-06-11T10:00:00Z' }]),
    ])
    expect(list.map(m => m.title)).toEqual([
      'Work out what your life costs', 'Show Jen the number', 'Ask for the four-day week',
    ])
    expect(list[2].chapter).toBe(2)
  })

  it('leaves out everything not actually ticked', () => {
    expect(doneMoves([ch(1, {}, [
      { title: 'Not done', doneAt: null },
      { title: 'Also not done' },
      { doneAt: '2026-03-02T10:00:00Z' },   // no title — nothing to show
    ])])).toEqual([])
    expect(doneMoves([])).toEqual([])
    expect(doneMoves()).toEqual([])
  })
})
