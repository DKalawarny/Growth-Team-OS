import { describe, it, expect } from 'vitest'
import { scopeFor } from './memory'

/** ⭐ Validated both ways, per the house rule for every detector. */
describe('which Solomon notes the person running the business may read', () => {
  const biz = statement => ({ kind: 'decision', scope: 'business', statement })
  it('keeps business facts shared', () => {
    for (const s of [
      'Will hire a second service tech only after the pricing review is complete.',
      'Before discounting the Cascade job, will review job cost against the quote.',
      'Will not let behaviour standards slip after informal conversations.',
      'Current cash balance is $60,000; week 12 dips below the comfort threshold.',
      'Raising residential prices 8% from November.',
    ]) expect(scopeFor(biz(s))).toBe('business')
  })
  it('makes anything personal private, even when the model said business', () => {
    for (const s of [
      'Owner is going through a divorce and cannot take on more hours.',
      'His wife wants him home for dinner by six.',
      'Feels burned out and is thinking about selling the business.',
      'Wants out within three years.',
      'Household money is tight; the mortgage renews in March.',
      'Daughter starts university next fall.',
      'Seeing a counsellor every second week.',
    ]) expect(scopeFor(biz(s))).toBe('personal')
  })
  it('a note about a specific person is always private', () => {
    expect(scopeFor({ kind: 'person', scope: 'business', statement: 'One employee yells at the crew in the mornings.' })).toBe('personal')
  })
  it('anything the model did not mark business is private', () => {
    expect(scopeFor({ kind: 'preference', statement: 'Prefers short answers.' })).toBe('personal')
    expect(scopeFor({ kind: 'decision', scope: 'personal', statement: 'Raising prices.' })).toBe('personal')
  })
})
