import { describe, it, expect } from 'vitest'
import { leadLine } from './shareLine'
import { SITUATIONS } from '../content/unstuckSituations'
import { ANSWERS } from '../content/answers'

describe('leadLine: what a share card may say', () => {
  it('keeps a decimal whole (the UK card once read "6 weeks" for "5.6 weeks")', () => {
    const t = 'More than the salary. You owe 5.6 weeks of paid holiday a year. More here.'
    expect(leadLine(t, 70)).toBe('More than the salary. You owe 5.6 weeks of paid holiday a year.')
  })
  it('keeps the sentence that turns the first one', () => {
    expect(leadLine('The house feels like the decision. It isn’t. Clearing the cards comes first, and the rest can wait.'))
      .toBe('The house feels like the decision. It isn’t.')
  })
  it('says nothing rather than a line too short to stand alone', () => {
    expect(leadLine('Often yes. Here is the much longer reason it depends on, which will not fit on any card at all.')).toBe('')
  })
  it('every real card line is its page’s exact opening', () => {
    for (const s of SITUATIONS) expect(s.answer.trim().startsWith(leadLine(s.answer))).toBe(true)
    for (const a of ANSWERS) expect(a.answer.trim().startsWith(leadLine(a.answer, 110))).toBe(true)
  })
})
