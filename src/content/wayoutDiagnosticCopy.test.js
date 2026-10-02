import { describe, it, expect } from 'vitest'
import { pathCopy, PATHS, choosePath } from './wayoutDiagnostic'

const said = (k, a) => `${pathCopy(k, a).lead} ${pathCopy(k, a).body}`

describe('the result only claims what they said (1 Oct audit)', () => {
  it('🔴 "hours you said you don\'t have" only when they asked for time', () => {
    expect(said('cut-delegate', { goalType: ['money'], money: 'tight' })).not.toMatch(/hours|time is what you said/i)
    expect(said('cut-delegate', { goalType: ['time'], money: 'tight' })).toMatch(/time is what you said you want back/)
  })
  it('🔴 savings are called savings, not "space, equity or a ticket"', () => {
    const a = { goalType: ['time'], asset: ['skill', 'cash'], money: 'some' }
    expect(choosePath(a)).toBe('asset-play')
    expect(said('asset-play', a)).toMatch(/savings/)
    expect(said('asset-play', a)).not.toMatch(/ticket|equity/)
  })
  it('🔴 the live rail never claims "nothing is holding you in place"', () => {
    for (const p of Object.values(PATHS)) expect(p.gist).not.toMatch(/nothing is holding/i)
  })
  it('nothing left at month end is said as that', () => {
    expect(said('cut-delegate', { money: 'negative' })).toMatch(/Nothing is left/)
  })
})
