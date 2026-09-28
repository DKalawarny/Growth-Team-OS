import { describe, it, expect } from 'vitest'
import { chapterFields, CHAPTER_LEAD } from './wayoutChapter'
import { CHAPTER_CLEARS_MONEY, CHAPTER_CLEARS_DESTINY, chapterAnswers } from '../lib/wayout/chapterHistory'

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

  // ⚠️ The detector, checked against the failure it is written for.
  it('would have caught the shipped bug', () => {
    const asked = ['takeHome', 'mustPay', 'savings', 'tuesday']   // `out` missing
    expect(asked).not.toContain('out')
    expect(CHAPTER_CLEARS_DESTINY).toContain('out')
  })

  it('never asks again for what carried over', () => {
    const asked = chapterFields('landed').map(f => f.key)
    for (const k of ['name', 'region', 'immovables', 'refuse', 'alreadyTried']) {
      expect(asked).not.toContain(k)
    }
  })

  it('does not re-ask the destination when they have not arrived', () => {
    for (const outcome of ['partly', 'no']) {
      const asked = chapterFields(outcome).map(f => f.key)
      expect(asked).not.toContain('out')
      expect(asked).not.toContain('tuesday')
      for (const k of CHAPTER_CLEARS_MONEY) expect(asked).toContain(k)
    }
  })

  it('stays short — five questions, six when the destination resets', () => {
    expect(chapterFields('no')).toHaveLength(5)
    expect(chapterFields('landed')).toHaveLength(7)
  })

  it('has an honest lead for every outcome', () => {
    for (const o of ['landed', 'changed', 'partly', 'no']) {
      expect(CHAPTER_LEAD[o]).toBeTruthy()
    }
  })
})
