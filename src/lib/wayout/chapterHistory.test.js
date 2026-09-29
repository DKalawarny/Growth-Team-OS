import { describe, it, expect } from 'vitest'
import { historyForPrompt, chapterAnswers } from './chapterHistory'

/**
 * ⭐⭐ THE SECOND PLAN. The product finishes — three moves, two gates, out — so a
 * subscription's whole life was one plan long, and the page that asked how it went
 * offered nothing but "Back to the plan".
 *
 * 🔴 THE TWO THINGS THAT WOULD MAKE CHAPTER TWO WORTHLESS, both covered here:
 *   1. Re-asking what it already knows. Somebody who has told this product their
 *      town, their custody arrangement and what they refuse to do, and is asked
 *      again three months later, has learned the first conversation was not kept.
 *   2. Changing the destination of somebody who has not reached it. "partly" and
 *      "no" mean the Tuesday stands; a new ambition there is changing the subject
 *      to avoid the hard part.
 */
const PREVIOUS = {
  name: 'Dave', age: 41, locationText: 'Sudbury, Ontario',
  immovables: ['kids-home'], workType: 'employed',
  takeHome: 4200, mustPay: 3900, savings: 600,
  tuesday: 'Home for dinner. Not working Saturdays.',
  out: 'I am doing 55 hours and it is never enough.',
}

describe('chapterAnswers — what a new chapter re-asks', () => {
  it('re-asks the money on every outcome, because three months moved it', () => {
    ;['landed', 'partly', 'no', 'changed'].forEach(outcome => {
      const next = chapterAnswers(PREVIOUS, outcome)
      expect(next.takeHome).toBeUndefined()
      expect(next.mustPay).toBeUndefined()
      expect(next.savings).toBeUndefined()
    })
  })

  it('never re-asks what does not change in a quarter', () => {
    ;['landed', 'partly', 'no', 'changed'].forEach(outcome => {
      const next = chapterAnswers(PREVIOUS, outcome)
      expect(next.name).toBe('Dave')
      expect(next.locationText).toBe('Sudbury, Ontario')
      expect(next.immovables).toEqual(['kids-home'])
      expect(next.workType).toBe('employed')
    })
  })

  /**
   * 🔴 THE RULE THAT MATTERS MOST. Somebody who did the work and did not get
   * there is not looking for a new ambition.
   */
  /**
   * 🔴🔴 REVERSED 29 Sep, AND THIS TEST USED TO ASSERT THE OPPOSITE. Do not
   * "restore" it — the old rule was the bug.
   *
   * It read: "KEEPS the destination when they have not arrived", on the
   * reasoning that somebody who answered partly or no has not got there, so
   * asking again would be the product forgetting what they said. That sounds
   * careful and it meant **half of all returning people were never asked where
   * they wanted to get to** — and "closer, not there" and "I did it all and it
   * did not land" are precisely the two answers most likely to arrive with a
   * changed mind.
   *
   * Daniel: "there should be a general question on where do you want to be now
   * that you're at this stage."
   *
   * ⚠️ `tuesday` STILL carries over for these two, and that distinction is the
   * point: the one-sentence destination is re-asked of everybody, while the
   * detailed picture is optional on a chapter and would be thrown away for
   * somebody who never got the chance to reach it.
   */
  it('re-asks the one-sentence destination however it went', () => {
    ;['partly', 'no'].forEach(outcome => {
      const next = chapterAnswers(PREVIOUS, outcome)
      expect(next.out).toBeUndefined()
      // The detailed picture is theirs until they actually arrive at it.
      expect(next.tuesday).toBe('Home for dinner. Not working Saturdays.')
    })
  })

  it('clears the detailed picture too, once they arrived or changed their mind', () => {
    ;['landed', 'changed'].forEach(outcome => {
      const next = chapterAnswers(PREVIOUS, outcome)
      expect(next.tuesday).toBeUndefined()
      expect(next.out).toBeUndefined()
    })
  })

  it('does not mutate the previous answers', () => {
    chapterAnswers(PREVIOUS, 'landed')
    expect(PREVIOUS.tuesday).toBe('Home for dinner. Not working Saturdays.')
    expect(PREVIOUS.takeHome).toBe(4200)
  })

  it('survives a session with no answers at all', () => {
    expect(chapterAnswers(null, 'partly')).toEqual({})
    expect(chapterAnswers(undefined, 'landed')).toEqual({})
  })
})

describe('historyForPrompt — what the model is told about last time', () => {
  const MAP = {
    headline: 'Home for dinner, Saturdays back — in twelve months',
    moves: [
      { order: 1, title: 'Ask for the rate you are already worth' },
      { order: 2, title: 'Put the spare room to work' },
      { order: 3, title: 'The same work, for someone who pays more' },
    ],
  }
  const base = {
    chapter: 2, previousAnswers: PREVIOUS, previousMap: MAP,
    ticked: new Set([1, 3]), outcome: 'partly', outcomeNote: 'Got a raise, room fell through.',
  }

  /**
   * ⭐⭐ WHICH MOVES WENT UNTOUCHED IS THE WHOLE POINT. A count ("2 of 3 done")
   * would lose exactly the information that stops the next plan handing back the
   * move they could not do — and that is the single most trust-destroying thing
   * this product can do to somebody who has been working for three months.
   */
  it('says move by move what they did and did not do', () => {
    const out = historyForPrompt(base)
    expect(out).toContain('[done]      Ask for the rate you are already worth')
    expect(out).toContain('[not done]  Put the spare room to work')
    expect(out).toContain('[done]      The same work, for someone who pays more')
  })

  it('carries their own words and the outcome they chose', () => {
    const out = historyForPrompt(base)
    expect(out).toContain('partly')
    expect(out).toContain('Got a raise, room fell through.')
  })

  /**
   * 🔴 THE PROVENANCE WARNING MUST TRAVEL WITH THE HISTORY. Figures in the old map
   * are the MODEL's — the first real map in this product's life invented "$120,000
   * cash in hand at sale" — and a second plan treating them as established fact
   * would launder every invention forward, one chapter at a time.
   */
  it('tells the model the old plan is context, not evidence', () => {
    const out = historyForPrompt(base)
    expect(out).toMatch(/context, not evidence/i)
    expect(out).toMatch(/something YOU wrote last time/i)
  })

  it('says plainly when they added nothing of their own', () => {
    expect(historyForPrompt({ ...base, outcomeNote: null }))
      .toMatch(/added nothing in their own words/i)
  })

  it('accepts ticked as an array as well as a Set', () => {
    // ⚠️ loadProgress returns a Set; a cached or serialised history gives an
    // array. Reading one shape and being handed the other would silently mark
    // every move not-done — and then hand every one of them back.
    const out = historyForPrompt({ ...base, ticked: [1, 3] })
    expect(out).toContain('[done]      Ask for the rate you are already worth')
    expect(out).toContain('[not done]  Put the spare room to work')
  })

  it('does not crash on a previous plan with no moves', () => {
    const out = historyForPrompt({ ...base, previousMap: { headline: 'x' } })
    expect(out).toContain('(no moves recorded)')
  })
})
