import { describe, it, expect } from 'vitest'
import { deriveStats } from './mapContract.js'

// 9 Oct, Daniel's brother: "almost had a heart attack". Only good news counts up.
describe('derived stats carry a tone', () => {
  it('a shortfall is hard, so it sits still', () => {
    const s = deriveStats({ mustPay: 4100, takeHome: 3500 })
    expect(s.map(x => x.tone)).toEqual(['plain', 'hard'])
  })
  it('money to spare is good, so it may count up', () => {
    const s = deriveStats({ mustPay: 3000, takeHome: 4000 })
    expect(s[1].tone).toBe('good')
  })
  it('never animates a number we only half know', () => {
    expect(deriveStats({ mustPay: 3000 }).map(x => x.tone)).toEqual(['plain'])
  })
})
