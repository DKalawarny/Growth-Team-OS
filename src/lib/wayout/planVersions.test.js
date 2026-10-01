import { describe, it, expect } from 'vitest'
import {
  versionList, showingKey, samePlan, removeVersion, takeBack, openFrom, planChanges, versionAbout,
} from './planVersions'

const said = c => ({ role: 'user', content: c })
const reply = c => ({ role: 'assistant', content: c })
const map = (...t) => ({ moves: t.map(title => ({ title })) })
const V1 = map('Kissimmee'), V2 = map('Three markets'), V3 = map('Monthly number'), V4 = map('Relist')

// Daniel's thread on 30 Sep: one idea, two rewrites around it.
const daniel = () => [
  said('flip instead'), reply('That changes move one.'),
  { role: 'assistant', rebuilt: true, base: V1, map: V2 },
  { role: 'assistant', rebuilt: true, map: V3 },
]

describe('versionList', () => {
  it('the original is Version 1, then the rewrites in order', () => {
    expect(versionList(daniel()).map(v => [v.key, v.label])).toEqual([
      [-1, 'Original'], [2, 'Version 2'], [3, 'Version 3'],
    ])
  })
  it('each version says what it was built around', () => {
    expect(versionList(daniel())[1].about).toBe('flip instead')
  })
  it('nothing to list with no rewrites', () => {
    expect(versionList([said('a'), reply('b')])).toEqual([])
  })
})

describe('showingKey', () => {
  it('reads which version is on the plan from the plan itself', () => {
    expect(showingKey(daniel(), V3)).toBe(3)
    expect(showingKey(daniel(), V1)).toBe(-1)
    expect(showingKey(daniel(), map('rebuilt from the answers'))).toBe(null)
  })
  it('jsonb reorders keys and that is still the same plan', () => {
    expect(samePlan({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true)
    expect(samePlan({ a: 1 }, { a: 2 })).toBe(false)
  })
})

describe('removeVersion', () => {
  it('🔴 the original can never be deleted', () => {
    expect(removeVersion(daniel(), -1, V1)).toBe(null)
  })
  it('numbers close up — deleting Version 2 makes Version 3 the new Version 2', () => {
    const out = removeVersion(daniel(), 2, V3)
    expect(versionList(out.thread).map(v => v.label)).toEqual(['Original', 'Version 2'])
    expect(out.restore).toBe(null)
  })
  it('the original survives the entry that carried it', () => {
    const out = removeVersion(daniel(), 2, V3)
    expect(versionList(out.thread)[0].map).toEqual(V1)
  })
  it('deleting the version showing steps the plan back to the one before it', () => {
    expect(removeVersion(daniel(), 3, V3).restore).toEqual(V2)
    expect(removeVersion(daniel(), 2, V2).restore).toEqual(V1)
  })
  it('⭐ the idea stays while a version of it does, and goes with the last one', () => {
    const one = removeVersion(daniel(), 3, V2)
    expect(one.thread[0]).toEqual(said('flip instead'))
    const both = removeVersion(one.thread, 2, V2)
    expect(both.thread).toEqual([])
    expect(both.restore).toEqual(V1)
  })
  it('a later idea is untouched by deleting an earlier one', () => {
    const t = [...daniel(), said('buyer pulled out'), reply('r'), { role: 'assistant', rebuilt: true, map: V4 }]
    const out = removeVersion(removeVersion(t, 3, V4).thread, 2, V4)
    expect(out.thread.filter(m => m.role === 'user').map(m => m.content)).toEqual(['buyer pulled out'])
    expect(versionList(out.thread).map(v => v.map)).toEqual([V1, V4])
  })
})

describe('takeBack', () => {
  it('removes something said and its reply before any version is built', () => {
    expect(takeBack([...daniel(), said('typo'), reply('r')], 4)).toEqual(daniel())
  })
  it('not something a version was built from', () => {
    expect(takeBack(daniel(), 0)).toBe(null)
  })
})

describe('openFrom', () => {
  it('the conversation in progress is what follows the newest version', () => {
    expect(openFrom([...daniel(), said('new'), reply('r')])).toBe(4)
    expect(openFrom([said('a')])).toBe(0)
  })
})

describe('planChanges', () => {
  it('names each move whose title changed, including added and dropped', () => {
    expect(planChanges(map('A', 'B'), map('X', 'B', 'C'))).toEqual([
      { order: 1, before: 'A', after: 'X' }, { order: 3, before: null, after: 'C' },
    ])
  })
})

describe('versionAbout', () => {
  it('uses the stored sentence, else the last thing they said before it', () => {
    expect(versionAbout([{ rebuilt: true, about: 'x' }], 0)).toBe('x')
    expect(versionAbout(daniel(), 3)).toBe('flip instead')
  })
})
