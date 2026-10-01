import { describe, it, expect } from 'vitest'
import {
  versionList, liveVersions, rebuildTurns, crossOffOthers, bringBack, storeChoice, currentChoice, showingKey, samePlan, removeVersion, dropDraft, openFrom, planChanges, versionAbout,
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
    expect(both.thread.filter(m => m.role === 'user')).toEqual([])
    expect(both.restore).toEqual(V1)
    // ⭐ and the original is still there to switch back to later
    expect(versionList(both.thread).map(v => v.label)).toEqual(['Original'])
  })
  it('a later idea is untouched by deleting an earlier one', () => {
    const t = [...daniel(), said('buyer pulled out'), reply('r'), { role: 'assistant', rebuilt: true, map: V4 }]
    const out = removeVersion(removeVersion(t, 3, V4).thread, 2, V4)
    expect(out.thread.filter(m => m.role === 'user').map(m => m.content)).toEqual(['buyer pulled out'])
    expect(versionList(out.thread).map(v => v.map)).toEqual([V1, V4])
  })
})

describe('dropDraft', () => {
  it('drops everything said since the newest version, and nothing before it', () => {
    expect(dropDraft([...daniel(), said('advisor instead'), reply('r')])).toEqual(daniel())
  })
  it('with no versions, the whole conversation is the draft', () => {
    expect(dropDraft([said('a'), reply('b')])).toEqual([])
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

describe('crossOffOthers', () => {
  it('⭐ going with V2 crosses off V3 with its reason, never the original', () => {
    const t = crossOffOthers(daniel(), 2, { 3: 'Waits on a second property.' })
    expect(liveVersions(t).map(v => v.label)).toEqual(['Original', 'Version 2'])
    expect(versionList(t)[2].crossed.why).toBe('Waits on a second property.')
    expect(t[2].base).toEqual(V1)
  })
  it('a crossed-off version can be brought back', () => {
    const t = bringBack(crossOffOthers(daniel(), 2), 3)
    expect(liveVersions(t)).toHaveLength(3)
  })
  it('going with the original crosses off every rewrite', () => {
    expect(liveVersions(crossOffOthers(daniel(), -1)).map(v => v.key)).toEqual([-1])
  })
})

describe('storeChoice / currentChoice', () => {
  it('a comparison holds while the same versions are in play', () => {
    const t = storeChoice(daniel(), { pick: 2 })
    expect(currentChoice(t).pick).toBe(2)
  })
  it('🔴 and goes stale the moment the versions change', () => {
    const t = storeChoice(daniel(), { pick: 2 })
    expect(currentChoice([...t, said('new'), { role: 'assistant', rebuilt: true, map: V4 }])).toBe(null)
    expect(currentChoice(crossOffOthers(t, 2))).toBe(null)
  })
})

describe('removeVersion — audit cases', () => {
  it('🔴 3a: a multi-turn idea goes with its only version', () => {
    const t = [said('sell house'), reply('How much?'), said('about 400k'), reply('ok'),
      { role: 'assistant', rebuilt: true, base: V1, map: V2 }]
    const out = removeVersion(t, 4, V1)
    expect(out.thread.filter(m => m.role === 'user')).toEqual([])
  })
  it('🔴 3b: deleting the only version keeps the original', () => {
    const t = [said('a'), { role: 'assistant', rebuilt: true, base: V1, map: V2 }]
    const out = removeVersion(t, 1, map('rebuilt from answers'))
    expect(versionList(out.thread)[0]?.map).toEqual(V1)
  })
  it('🔴 3c: steps back past a crossed-off version to one in play', () => {
    const t = [...daniel(), said('b'), { role: 'assistant', rebuilt: true, map: V4 }]
    const crossed = t.map((m, i) => (i === 3 ? { ...m, crossed: { why: 'x' } } : m))
    expect(removeVersion(crossed, 5, V4).restore).toEqual(V2)
  })
  it('🔴 3d: deleting an identical older version does not move the plan', () => {
    const t = [said('a'), { role: 'assistant', rebuilt: true, base: V1, map: V2 }, { role: 'assistant', rebuilt: true, map: V2 }]
    expect(removeVersion(t, 1, V2).restore).toBe(null)
  })
})

describe('rebuildTurns', () => {
  it('reads every idea in play and the one in progress', () => {
    expect(rebuildTurns([...daniel(), said('new')])).toEqual(['flip instead', 'new'])
  })
  it('🔴 drops an idea whose every version was crossed off', () => {
    const t = daniel().map(m => (m.rebuilt ? { ...m, crossed: { why: 'x' } } : m))
    expect(rebuildTurns([...t, said('new')])).toEqual(['new'])
  })
})
