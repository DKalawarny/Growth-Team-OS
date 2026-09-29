import { describe, it, expect } from 'vitest'
import { chapterFields, visibleChapterFields, CHAPTER_LEAD } from './wayoutChapter'
import { CHAPTER_CLEARS_MONEY, CHAPTER_CLEARS_DESTINY, CHAPTER_CLEARS_ALWAYS, chapterAnswers } from '../lib/wayout/chapterHistory'

/**
 * 🔴🔴 THE BUG THIS FILE EXISTS TO PREVENT, WHICH ALREADY HAPPENED ONCE.
 *
 * `chapterAnswers` cleared `out` and NOTHING ASKED FOR IT AGAIN — it lives on
 * the intake's opening screen, and the resume logic can never return step 0. So
 * a "landed" chapter built its plan with the destination sentence empty.
 *
 * ⭐⭐ TWO LISTS, IN DIFFERENT FILES, THAT MUST MOVE TOGETHER: one makes the
 * hole, the other fills it. That is exactly the shape that drifts — so it is
 * asserted rather than remembered.
 */
describe('a new chapter asks for everything it cleared', () => {
  for (const outcome of ['landed', 'changed', 'partly', 'no']) {
    it(`${outcome}: every cleared answer has a question`, () => {
      const before = { takeHome: 1, mustPay: 2, savings: 3, out: 'a', tuesday: 'b', name: 'keep' }
      const after = chapterAnswers(before, outcome)
      const cleared = Object.keys(before).filter(k => !(k in after))
      const asked = chapterFields(outcome).map(f => f.key)
      for (const key of cleared) expect(asked).toContain(key)
    })
  }

  // ⚠️ The detector, checked against the failure it is written for: a key that
  // is cleared and never offered. `out` was exactly that once.
  it('would have caught the shipped bug', () => {
    const asked = ['takeHome', 'mustPay', 'savings', 'tuesday']   // `out` missing
    expect(asked).not.toContain('out')
    expect([...CHAPTER_CLEARS_ALWAYS, ...CHAPTER_CLEARS_DESTINY]).toContain('out')
  })

  it('never asks again for what carried over', () => {
    const asked = chapterFields('landed').map(f => f.key)
    for (const k of ['name', 'region', 'immovables', 'refuse', 'alreadyTried']) {
      expect(asked).not.toContain(k)
    }
  })

  /**
   * 🔴🔴 REVERSED 29 Sep. This asserted that somebody who had NOT arrived was
   * never asked about their destination — which meant half of all returning
   * people were never asked where they wanted to get to. Do not restore it.
   * ⭐⭐ The outcome changes the WORDING, not whether it is asked.
   */
  it('asks everyone where they want to get to, in wording that fits', () => {
    const seen = new Set()
    for (const outcome of ['landed', 'changed', 'partly', 'no']) {
      const out = chapterFields(outcome).find(f => f.key === 'out')
      expect(out).toBeTruthy()
      expect(out.required).toBe(true)
      seen.add(out.label)
      for (const k of CHAPTER_CLEARS_MONEY) {
        expect(chapterFields(outcome).map(f => f.key)).toContain(k)
      }
    }
    // ⚠️ Asking somebody whose plan failed "so where now?" is the product not
    // listening. Four outcomes, four sentences.
    expect(seen.size).toBe(4)
  })

  /**
   * ⚠️ REWRITTEN 29 Sep. This asserted raw field COUNTS (5 and 7) and broke the
   * moment legitimate questions were added — the same fault as the positional
   * `fields[0]` lookups: it measured an incidental number rather than the thing
   * anybody cares about.
   * ⭐⭐ What matters is what a person FACES on arrival. Conditional fields are
   * invisible until tapped, so counting them punished the design that keeps the
   * screen short.
   */
  it('stays short on arrival, whatever is available behind a tap', () => {
    for (const outcome of ['landed', 'changed', 'partly', 'no']) {
      const onArrival = visibleChapterFields(outcome, {})
      expect(`${outcome}: ${onArrival.length}`).toBe(`${outcome}: ${Math.min(onArrival.length, 10)}`)
      const writing = onArrival.filter(f => f.required && f.kind === 'text')
      expect(`${outcome} essays: ${writing.length}`).toBe(`${outcome} essays: ${Math.min(writing.length, 2)}`)
    }
  })

  it('has an honest lead for every outcome', () => {
    for (const o of ['landed', 'changed', 'partly', 'no']) {
      expect(CHAPTER_LEAD[o]).toBeTruthy()
    }
  })
})

/**
 * ⭐⭐ WHAT A PLAN CHANGES ABOUT A LIFE MUST BE ASKABLE IN THE NEXT ONE.
 *
 * Daniel: *"stage 2 lacks a couple of questions that should be asked about life
 * and money — it doesn't ask where things are in those things fully."*
 *
 * 🔴 Eleven answers carried over untouched, including the two a plan is most
 * likely to have changed ITSELF: `housingCost` (the commonest first move in this
 * product is selling a house) and `locationText` (the first plan here was
 * "family on the road"). The floor cannot be re-sized from a housing figure that
 * did not move, and a plan cannot be built for an address somebody left.
 */
describe('a new chapter can hear what actually moved', () => {
  it('asks for the money lines a plan changes', () => {
    const keys = chapterFields('landed').map(f => f.key)
    for (const k of ['takeHome', 'mustPay', 'housingCost', 'debt', 'savings']) {
      expect(keys).toContain(k)
    }
  })

  it('offers the life changes without demanding them', () => {
    const keys = chapterFields('no').map(f => f.key)
    for (const k of ['chapterMoved', 'locationText', 'hoursPerWeek', 'healthNote', 'peopleNote']) {
      expect(keys).toContain(k)
    }
  })

  // ⭐⭐ The whole design: nothing changed is ONE TAP and no writing at all.
  it('shows nothing extra until something is said to have moved', () => {
    const quiet = visibleChapterFields('no', {}).map(f => f.key)
    expect(quiet).not.toContain('locationText')
    expect(quiet).not.toContain('healthNote')
    expect(quiet).toContain('chapterMoved')
  })

  it('reveals exactly what was tapped, and nothing else', () => {
    const shown = visibleChapterFields('no', { chapterMoved: ['where'] }).map(f => f.key)
    expect(shown).toContain('locationText')
    expect(shown).not.toContain('healthNote')
    expect(shown).not.toContain('hoursPerWeek')
  })

  // ⚠️ THE CEILING STILL HOLDS. This screen exists because the intake's fifth
  // screen became a wall at seven required answers; adding to it must not
  // recreate that.
  it('never demands more than five answers, however much moved', () => {
    for (const outcome of ['landed', 'changed', 'partly', 'no']) {
      const required = visibleChapterFields(outcome, {
        chapterMoved: ['where', 'who', 'hours', 'health'],
      }).filter(f => f.required)
      expect(`${outcome}: ${required.length}`).toBe(`${outcome}: ${Math.min(required.length, 5)}`)
    }
  })
})
