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

/**
 * 🔴🔴 THE MIRROR-IMAGE BUG, FOUND 26 Sep, AND IT IS THE SAME COST IN THE OTHER
 * DIRECTION. Once the crisis rules were taught where their boundary is, a man
 * working full time and sleeping in his car since June correctly got a PLAN —
 * and the model narrated its own reasoning on the way in: "The rules fire
 * clearly here: Mitch has income, a gap, and a solvable problem... This is a
 * planning case." 190 characters of prose, over the bar, so crisisFrom returned
 * crisis:true and he would have been shown the MODEL'S WORKING instead of the
 * plan it had just built for him.
 *
 * 🔴 THE FIRST FIX WAS WRONG AND WOULD HAVE CAUSED A SAFETY REGRESSION —
 * suppressing any lead followed by a real map. That is the shape of the bug the
 * tests above lock down: a genuine crisis message with JSON appended anyway.
 * Prose-then-map cannot tell the two apart. ⭐⭐ When the two errors are not
 * equal, the test must fail toward the expensive one — hiding a plan costs
 * somebody a week, hiding a crisis costs more than that.
 */
describe('crisisFrom — the planning-verdict carve-out', () => {
  // Verbatim lead from the live reply.
  const tic = 'The rules fire clearly here: Mitch has income, a gap, and a solvable problem. '
    + '$2,600 in, $900 out, $1,700 of slack every month. He has been in his car since June. '
    + 'This is a planning case.'
  const map = '\n\n```json\n{ "headline": "A door you can lock", "moves": [{ "title": "a" }] }\n```'

  it('does not mistake the model narrating a PLANNING verdict for a crisis', () => {
    expect(crisisFrom(tic + map)).toBeNull()
  })

  it('still shows a crisis message that has a map appended after it', () => {
    const real = 'Joan lost her husband three weeks ago. This is a crisis window, not a plan window. '
      + 'She needs a person, not a plan.'
    expect(crisisFrom(real + map)?.crisis).toBe(true)
  })

  /**
   * ⚠️ THE CARVE-OUT ONLY FIRES WHEN A MAP FOLLOWS. The tic always precedes one,
   * so requiring it costs nothing — and it makes an all-prose crisis reply
   * impossible to suppress by wording alone.
   */
  it('never suppresses an all-prose crisis reply, whatever it says', () => {
    const allProse = 'This is not a crisis case in the usual sense and the rules fire oddly here, '
      + 'but what you wrote about not seeing the point matters more than any of that. '
      + 'Please talk to someone today — in Canada you can call or text 988 any time.'
    expect(crisisFrom(allProse)?.crisis).toBe(true)
  })

  /**
   * 🔴 THE PHRASE THAT NEARLY BROKE IT. "not a crisis" as a bare pattern would
   * have thrown away a real crisis reply saying the trouble is not financial.
   */
  it('keeps a crisis reply that says the crisis is "not a crisis OF MONEY"', () => {
    const real = 'What you wrote is not a crisis of money, it is something heavier, and I am not '
      + 'going to move past it. Please talk to someone today about how you have been feeling.'
    expect(crisisFrom(real + map)?.crisis).toBe(true)
  })

  it('leaves an ambiguous prose lead as a crisis', () => {
    const vague = 'I want to say something before the plan. What you described sounds heavier than '
      + 'money and I do not want to move past it without saying so.'
    expect(crisisFrom(vague + map)?.crisis).toBe(true)
  })
})
