import { describe, it, expect } from 'vitest'
import { crisisFrom } from './session'

/**
 * ⭐⭐ FIXTURES TAKEN FROM REAL REPLIES, not invented. Every shape here came out
 * of `scripts/wayout-crisis-audit.mjs` running crisis-shaped answers through
 * the live function on 26 Sep. That is the only reason the bug was findable:
 * the prompt was behaving correctly and the CLIENT was discarding the result.
 *
 * 🔴 The bug this locks down: crisisFrom bailed whenever the word "headline"
 * appeared anywhere in the reply. The model, told to say so plainly and first,
 * did exactly that — and then appended the JSON map underneath. So a woman
 * widowed three weeks earlier had her crisis message thrown away and was shown
 * a three-move income plan.
 */
describe('crisisFrom', () => {
  it('keeps a crisis message that is followed by a JSON map', () => {
    // Verbatim shape from the bereavement reply: 82 chars of prose, then a fence.
    const real = 'Joan lost her husband three weeks ago. This is a crisis window, not a plan window.\n'
      + '```json\n{ "headline": "The next thirty days, not the next three years", "moves": [] }\n```'
    const got = crisisFrom(real)
    expect(got?.crisis).toBe(true)
    expect(got.message).toContain('crisis window')
    // ⚠️ And the JSON must NOT come along for the ride — it would render raw.
    expect(got.message).not.toContain('headline')
    expect(got.message).not.toContain('```')
  })

  it('keeps an all-prose crisis reply', () => {
    const real = 'What Rob wrote stops everything else on this page. '
      + '"Some days I think everyone would be better off without me" is the sentence that matters '
      + 'right now, and it needs to be the first thing addressed, not the money. '
      + 'In Canada and the US you can call or text 988 at any hour.'
    expect(crisisFrom(real)?.crisis).toBe(true)
  })

  it('does not fire on a plain map', () => {
    expect(crisisFrom('{ "headline": "Out of the warehouse", "moves": [1,2,3] }')).toBe(null)
  })

  it('does not fire on a short formatting preamble', () => {
    // 🔴 The false positive that would matter: somebody shown a helpline
    // instead of the plan they answered thirty questions for.
    expect(crisisFrom('Here is the plan:\n```json\n{ "headline": "x", "moves": [] }\n```')).toBe(null)
  })

  it('does not fire on empty or whitespace', () => {
    expect(crisisFrom('')).toBe(null)
    expect(crisisFrom('   \n  ')).toBe(null)
    expect(crisisFrom(null)).toBe(null)
  })
})
