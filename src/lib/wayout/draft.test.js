import { describe, it, expect, beforeEach } from 'vitest'
import { saveDraft, loadDraft, clearDraft, stampDraft, draftBelongsToSomeoneElse } from './draft'

/**
 * 🔴🔴 THE BUG THIS EXISTS TO PREVENT HAPPENED IN FRONT OF DANIEL.
 *
 * He signed in on a fresh account and landed halfway through the questions, on
 * somebody else's answers: "I log in fresh, now this shows up — not my account."
 *
 * `wayout:draft` is localStorage and CANNOT be user-scoped at creation, because
 * the whole point is that it exists before anybody has an account. So it is
 * stamped the moment there is an owner, and a stamped draft only ever unlocks
 * for the account named on it.
 *
 * ⚠️ An UNSTAMPED draft stays adoptable — that is the sign-up flow the product
 * is built on, and breaking it would wall off the ordinary path.
 */
const store = {}
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: k => { delete store[k] },
}

describe('a draft never crosses accounts', () => {
  beforeEach(() => { clearDraft() })

  it('an anonymous draft is adoptable — the sign-up path still works', () => {
    saveDraft({ out: 'mine' }, 2)
    expect(draftBelongsToSomeoneElse('user-a')).toBe(false)
    expect(draftBelongsToSomeoneElse(null)).toBe(false)
    expect(loadDraft().answers.out).toBe('mine')
  })

  it('a stamped draft opens only for the account that owns it', () => {
    saveDraft({ out: 'user A answers' }, 3)
    stampDraft('user-a')
    expect(draftBelongsToSomeoneElse('user-a')).toBe(false)
    // 🔴 The exact shipped failure: a different account in the same browser.
    expect(draftBelongsToSomeoneElse('user-b')).toBe(true)
    expect(draftBelongsToSomeoneElse(null)).toBe(true)
  })

  it('stamping keeps the answers intact', () => {
    saveDraft({ out: 'keep me', tuesday: 'and me' }, 4)
    stampDraft('user-a')
    const d = loadDraft()
    expect(d.answers).toEqual({ out: 'keep me', tuesday: 'and me' })
    expect(d.step).toBe(4)
  })

  it('says no when there is nothing there at all', () => {
    expect(draftBelongsToSomeoneElse('user-a')).toBe(false)
  })
})
