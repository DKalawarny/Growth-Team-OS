import { describe, it, expect } from 'vitest'
import { noTuesday, enforceMapContract } from './mapContract'

describe('noTuesday', () => {
  it('🔴 the 1 Oct leak: "your Tuesday" becomes the aim', () => {
    expect(noTuesday('a step toward your Tuesday or a step away from security'))
      .toBe('a step toward the life you are aiming for or a step away from security')
  })
  it('a literal weekday becomes this week, and no form survives', () => {
    expect(noTuesday('Call the bank on Tuesday.')).toBe('Call the bank this week.')
    for (const t of ['That Tuesday is the point.', 'Every Tuesday counts.', 'TUESDAY', 'Tuesdays are hard'])
      expect(noTuesday(t)).not.toMatch(/tuesday/i)
  })
  it('leaves text without it alone', () => {
    expect(noTuesday('Thursday stays Thursday.')).toBe('Thursday stays Thursday.')
    expect(noTuesday(undefined)).toBe(undefined)
  })
})

describe('assumptions are cut at a real sentence end', () => {
  it('🔴 "St." is not the end of a sentence', () => {
    const map = {
      headline: 'h', moves: [], cut: [], stats: [],
      assumptions: ["I have assumed your St. Joseph's placement starts in January. Second sentence."],
    }
    const out = enforceMapContract(map, {})
    expect((out.assumptions ?? []).join(' ')).toMatch(/St\. Joseph/)
  })
})
