import { describe, it, expect } from 'vitest'
import {
  threadVersions, versionList, showingVersion, samePlan, dropIdea, planChanges, versionAbout,
} from './planVersions'

const said = c => ({ role: 'user', content: c })
const reply = c => ({ role: 'assistant', content: c })
const map = (...t) => ({ moves: t.map(title => ({ title })) })
const V1 = map('Kissimmee'), V2 = map('Three markets'), V3 = map('Monthly number')

// The shape of Daniel's thread on 30 Sep: one idea, two rewrites around it.
const daniel = () => [
  said('flip instead'), reply('That changes move one.'),
  { role: 'assistant', rebuilt: true, version: 2, from: 1, base: V1, map: V2 },
  { role: 'assistant', rebuilt: true, version: 3, from: 2, map: V3 },
]

describe('threadVersions', () => {
  it('numbers rewrites from 2, legacy entries in order', () => {
    const v = threadVersions([said('a'), { rebuilt: true }, { rebuilt: true }])
    expect(v.at[1].version).toBe(2)
    expect(v.at[2].version).toBe(3)
    expect(v.next).toBe(4)
  })
})

describe('versionList', () => {
  it('the original first, then every version that kept its map', () => {
    expect(versionList(daniel()).map(v => v.label)).toEqual(['Original', 'Version 2', 'Version 3'])
  })
  it('nothing to switch between with no rewrites', () => {
    expect(versionList([said('a'), reply('b')])).toEqual([])
  })
})

describe('showingVersion', () => {
  it('reads which version is on the plan from the plan itself', () => {
    expect(showingVersion(daniel(), V3)).toBe(3)
    expect(showingVersion(daniel(), V1)).toBe(1)
    expect(showingVersion(daniel(), map('rebuilt from the answers'))).toBe(null)
  })
  it('jsonb reorders keys and that is still the same plan', () => {
    expect(samePlan({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true)
    expect(samePlan({ a: 1 }, { a: 2 })).toBe(false)
  })
})

describe('dropIdea', () => {
  it('⭐ drops the idea and its versions and puts the ORIGINAL back', () => {
    const out = dropIdea(daniel(), 0)
    expect(out.thread).toEqual([])
    expect(out.restore).toEqual(V1)
    expect(out.to).toBe('Original')
  })
  it('a later idea goes back to the version before it, not the original', () => {
    const t = [...daniel(), said('buyer pulled out'), reply('r'),
      { role: 'assistant', rebuilt: true, version: 4, from: 3, map: map('Relist') }]
    const out = dropIdea(t, 4)
    expect(out.thread).toHaveLength(4)
    expect(out.restore).toEqual(V3)
    expect(out.to).toBe('Version 3')
  })
  it('an idea nothing was built from leaves the plan alone', () => {
    const out = dropIdea([...daniel(), said('typo'), reply('r')], 4)
    expect(out.thread).toHaveLength(4)
    expect(out.restore).toBe(null)
  })
  it('only something they said can be dropped', () => {
    expect(dropIdea(daniel(), 1)).toBe(null)
  })
})

describe('planChanges', () => {
  it('names each move whose title changed, including added and dropped', () => {
    expect(planChanges(map('A', 'B'), map('X', 'B', 'C'))).toEqual([
      { order: 1, before: 'A', after: 'X' }, { order: 3, before: null, after: 'C' },
    ])
    expect(planChanges(map('A'), map('A'))).toEqual([])
  })
})

describe('versionAbout', () => {
  it('uses the stored sentence, else the last thing they said before it', () => {
    expect(versionAbout([{ rebuilt: true, about: 'x' }], 0)).toBe('x')
    expect(versionAbout(daniel(), 3)).toBe('flip instead')
  })
})
