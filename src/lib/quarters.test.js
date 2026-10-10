import { describe, it, expect } from 'vitest'
import { quarterKey, quarterLabel, stepsDone, quarterHistory } from './quarters'

describe('quarters', () => {
  it('keys a date by its quarter and sorts as text', () => {
    expect(quarterKey(new Date(2026, 9, 10))).toBe('2026-Q4')
    expect(quarterKey(new Date(2027, 0, 1))).toBe('2027-Q1')
    expect(['2027-Q1', '2026-Q4', '2026-Q3'].sort()).toEqual(['2026-Q3', '2026-Q4', '2027-Q1'])
  })
  it('labels a quarter in plain words', () => {
    expect(quarterLabel('2026-Q4')).toBe('Q4 2026 (Oct to Dec)')
  })
  it('counts only ticked steps that still exist', () => {
    expect(stepsDone({ actions: ['a', 'b', 'c'], actions_done: ['a', 'gone'] })).toEqual({ total: 3, done: 1 })
    expect(stepsDone({})).toEqual({ total: 0, done: 0 })
  })
  it('reports finished out of set per quarter, oldest first', () => {
    const ms = [
      { rock_quarter: '2026-Q4', completed: false }, { rock_quarter: '2026-Q3', completed: true },
      { rock_quarter: '2026-Q3', completed: true },  { rock_quarter: null, completed: true },
      { rock_quarter: '2026-Q4', completed: true },
    ]
    expect(quarterHistory(ms)).toEqual([
      { quarter: '2026-Q3', set: 2, finished: 2 },
      { quarter: '2026-Q4', set: 2, finished: 1 },
    ])
  })
})
