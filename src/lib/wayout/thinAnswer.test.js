import { describe, it, expect } from 'vitest'
import { isThin, THIN_WORDS } from './validate.js'
import { WAYOUT_SCREENS, WAYOUT_OPEN } from '../../content/wayoutIntake.js'

const f = { key: 'x', nudge: true }

describe('isThin, the one-time "say a bit more" note', () => {
  it('flags short answers', () => {
    for (const v of ['idk', 'nothing', 'free', 'home more', 'Be happy and free', 'no . . . .']) {
      expect(isThin(f, v), v).toBe(true)
    }
  })

  it('leaves real answers alone', () => {
    for (const v of [
      'Out of debt. Not working Saturdays.',
      'Home when the kids get in, my own hours, no boss',
      'Tried a side business selling firewood and it barely covered gas.',
    ]) expect(isThin(f, v), v).toBe(false)
  })

  it('never nudges an empty answer, that is the required check', () => {
    for (const v of ['', '   ', undefined, null]) expect(isThin(f, v)).toBe(false)
  })

  it('only nudges fields that ask for it', () => {
    expect(isThin({ key: 'x' }, 'idk')).toBe(false)
    expect(isThin(f, ['a'])).toBe(false)
  })

  it('the threshold counts words, not characters', () => {
    expect(isThin(f, 'a b c d e')).toBe(true)
    expect(isThin(f, Array(THIN_WORDS).fill('word').join(' '))).toBe(false)
  })

  it('every nudged field is free text and carries its own note', () => {
    const fields = [...WAYOUT_SCREENS.flatMap(s => s.fields ?? []), WAYOUT_OPEN.field].filter(x => x.nudge)
    expect(fields.length).toBeGreaterThan(0)
    for (const x of fields) {
      expect(['text', 'shorttext'], x.key).toContain(x.kind)
      expect(typeof x.nudgeMessage, x.key).toBe('string')
    }
  })
})
