import { describe, it, expect } from 'vitest'
import { threadVersions, planChanges, canGoBack, versionAbout } from './planVersions'

const said = c => ({ role: 'user', content: c })
const reply = c => ({ role: 'assistant', content: c })
const map = (...t) => ({ moves: t.map(title => ({ title })) })

describe('threadVersions', () => {
  it('numbers rewrites from 2, each built on the one before', () => {
    const t = [said('a'), reply('r'), { rebuilt: true }, said('b'), { rebuilt: true }]
    const v = threadVersions(t)
    expect(v.at[2]).toEqual({ version: 2, from: 1 })
    expect(v.at[4]).toEqual({ version: 3, from: 2 })
    expect(v.current).toBe(3)
    expect(v.next).toBe(4)
  })

  it('an undone version hands current back to the one it replaced', () => {
    const t = [{ rebuilt: true, version: 2, from: 1, undone: true }]
    expect(threadVersions(t).current).toBe(1)
    expect(threadVersions(t).next).toBe(3)
  })

  it('an empty thread is version 1', () => {
    expect(threadVersions([])).toEqual({ at: {}, current: 1, next: 2 })
  })
})

describe('planChanges', () => {
  it('names each move whose title changed', () => {
    expect(planChanges(map('Kissimmee', 'Apps'), map('Texas flip', 'Apps')))
      .toEqual([{ order: 1, before: 'Kissimmee', after: 'Texas flip' }])
  })
  it('an added or dropped move counts', () => {
    expect(planChanges(map('A'), map('A', 'B'))).toEqual([{ order: 2, before: null, after: 'B' }])
  })
  it('identical moves are no change', () => {
    expect(planChanges(map('A', 'B'), map('A', 'B'))).toEqual([])
  })
})

describe('canGoBack', () => {
  const v = (extra = {}) => ({ rebuilt: true, id: 'x1', ...extra })
  const hist = why => [{ map: map('old'), why }]

  it('the newest version may go back to the plan it replaced', () => {
    expect(canGoBack([said('a'), v()], 1, hist('thread:x1'))).toBe(true)
  })
  it('🔴 an older version may not — the button on the first rewrite used to undo the last', () => {
    const t = [v({ id: 'x0' }), said('b'), v()]
    expect(canGoBack(t, 0, hist('thread:x1'))).toBe(false)
  })
  it('not once the plan was rewritten by something else since', () => {
    expect(canGoBack([v()], 0, hist('rebuild'))).toBe(false)
  })
  it('not once kept or undone, and not with nothing saved', () => {
    expect(canGoBack([v({ kept: true })], 0, hist('thread:x1'))).toBe(false)
    expect(canGoBack([v({ undone: true })], 0, hist('thread:x1'))).toBe(false)
    expect(canGoBack([v()], 0, [])).toBe(false)
  })
  it('a legacy entry with no id may go back over an untagged rebuild', () => {
    expect(canGoBack([{ rebuilt: true }], 0, [{ map: map('old') }])).toBe(true)
  })
  it('a message is never a version', () => {
    expect(canGoBack([said('a')], 0, hist('rebuild'))).toBe(false)
  })
})

describe('versionAbout', () => {
  it('uses the stored sentence, else the last thing they said before it', () => {
    expect(versionAbout([{ rebuilt: true, about: 'x' }], 0)).toBe('x')
    expect(versionAbout([said('flip instead'), reply('r'), { rebuilt: true }], 2)).toBe('flip instead')
  })
})
