import { describe, it, expect } from 'vitest'
import { inviteTotals, friendStage, inviteUrl } from './invites'

describe('the invite dashboard numbers', () => {
  const invites = [
    { is_main: true, opened: 5, friends: [{ name: null, plan: true, paying: false }] },
    { is_main: false, label: 'Mom', opened: 1, friends: [{ name: 'Laura', plan: false, paying: false }] },
    { is_main: false, label: 'Jay', opened: 0, friends: [] },
  ]

  it('adds opens and friends across every link', () => {
    expect(inviteTotals(invites)).toEqual({ opened: 6, joined: 2, plans: 1, paying: 0 })
  })

  it('an empty list is all zeros, not a crash', () => {
    expect(inviteTotals([])).toEqual({ opened: 0, joined: 0, plans: 0, paying: 0 })
    expect(inviteTotals()).toEqual({ opened: 0, joined: 0, plans: 0, paying: 0 })
  })

  it('names the furthest step a friend has reached', () => {
    expect(friendStage({ plan: false, paying: false })).toBe('Joined')
    expect(friendStage({ plan: true, paying: false })).toBe('Made a plan')
    expect(friendStage({ plan: true, paying: true })).toBe('Paying')
  })

  it('the link carries the code and counts as an invite source', () => {
    expect(inviteUrl('ab12cd34ef')).toBe('https://getunstuckmap.com/?i=ab12cd34ef&utm_source=invite')
  })
})
