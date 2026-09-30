import { describe, it, expect } from 'vitest'
import { headClause } from './markPhrase'

/**
 * ⭐⭐⭐ VALIDATED AGAINST KNOWN-GOOD *AND* KNOWN-BAD, which is the rule twelve
 * broken guards in this product were written without. The known-bad half is
 * the half that matters here: this decides where a yellow stroke lands on the
 * largest type on the page, so "marks nothing" has to be provably the answer
 * for every title it cannot read confidently.
 */
describe('headClause', () => {
  it('marks the instruction and leaves the qualifier alone', () => {
    expect(headClause('Find the cross-border accountant before anything else moves'))
      .toBe('Find the cross-border accountant')
    expect(headClause('Send the message, then wait')).toBe('Send the message')
    expect(headClause('Call three brokers — not your bank')).toBe('Call three brokers')
    expect(headClause('Price the job because the last one lost money'))
      .toBe('Price the job')
  })

  it('takes the EARLIEST joiner, so the mark lands on the first action', () => {
    expect(headClause('Book the call before Friday and then hold the date'))
      .toBe('Book the call')
  })

  /** ⭐ The commonest shape in the product: a destination and a date. */
  it('marks the destination and leaves the deadline', () => {
    expect(headClause('Four days a week by March')).toBe('Four days a week')
    expect(headClause('Out of the hole by June, without a second job')).toBe('Out of the hole')
    expect(headClause('Six months of breathing room — starting this weekend'))
      .toBe('Six months of breathing room')
  })

  it('marks a short title whole', () => {
    expect(headClause('Open the business account')).toBe('Open the business account')
  })

  it('marks NOTHING rather than guess', () => {
    // No joiner and too long to mark whole — the slab case.
    expect(headClause('Work out what the rental actually clears every month')).toBe(null)
    // Head clause longer than a pen stroke.
    expect(headClause('Work out what the rental actually clears before you list it')).toBe(null)
    // A one-word head reads as a typo, not a highlight.
    expect(headClause('Wait, then call')).toBe(null)
    expect(headClause('')).toBe(null)
    expect(headClause(null)).toBe(null)
    expect(headClause(undefined)).toBe(null)
    expect(headClause(42)).toBe(null)
  })

  it('never returns a phrase that is not in the original text', () => {
    for (const t of [
      'Find the cross-border accountant before anything else moves',
      'Send the message, then wait',
      'Open the business account',
      'Call three brokers — not your bank',
    ]) {
      const h = headClause(t)
      if (h !== null) expect(t.includes(h)).toBe(true)
    }
  })
})
