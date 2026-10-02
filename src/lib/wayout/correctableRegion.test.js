import { describe, it, expect } from 'vitest'
import { correctableAnswers, showAnswer } from './correctable'

describe('the country can be set from the plan', () => {
  it('is listed first, with the intake options', () => {
    const f = correctableAnswers({})[0]
    expect(f.key).toBe('region')
    expect(f.options.map(o => o.key)).toContain('ca')
  })
  it('reads as the country name, not the key', () => {
    const f = correctableAnswers({ region: 'uk' })[0]
    expect(showAnswer(f.kind, f.value, f.options)).toBe('United Kingdom')
  })
})
