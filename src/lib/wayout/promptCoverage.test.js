import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * ⭐⭐ EVERY SHARED RULE REACHES EVERY WAYOUT PROMPT. A TEST, BECAUSE READING
 * HAS FAILED FIVE TIMES.
 *
 * 🔴 Daniel, 23 Sep: "some things I've mentioned before are not being
 * implemented — audit its thought processing." He was right, and the audit
 * found the shape of it: WAYOUT_MAP_PROMPT carried 47 rules of its own and
 * WAYOUT_PLAYBOOK_PROMPT — the PAID half, the thing people actually follow —
 * carried 11. Every lesson gets written where the bug was SEEN, and the map
 * was seen first.
 *
 * ⚠️ That is how "a gate is a fact, not an errand" ended up in the map only,
 * and why the play-by-play went on telling him to go and fetch a net sheet
 * weeks after he had ruled that out.
 *
 * ⚠️ This does NOT try to police what belongs in one prompt — plenty rightly
 * does. It asserts only that the blocks we have deliberately made SHARED are
 * actually spliced into every prompt that writes to a person. That is the part
 * that has silently regressed, over and over.
 */
const SRC = fs.readFileSync(
  path.resolve('supabase/functions/_shared/prompts.ts'), 'utf8',
)

const SHARED = ['WAYOUT_SAFETY', 'WAYOUT_MONEY', 'WAYOUT_METHOD']
const CONSUMERS = [
  'WAYOUT_MAP_PROMPT',
  'WAYOUT_PLAYBOOK_PROMPT',
  'WAYOUT_ASK_PROMPT',
  'WAYOUT_MOVE_QUESTIONS_PROMPT',
]

function blockFor(name) {
  const starts = [...SRC.matchAll(/export const (WAYOUT_[A-Z_]+)/g)]
    .map(m => ({ i: m.index, n: m[1] }))
  const at = starts.findIndex(s => s.n === name)
  if (at < 0) throw new Error(`${name} does not exist`)
  const end = at + 1 < starts.length ? starts[at + 1].i : SRC.length
  return SRC.slice(starts[at].i, end)
}

describe('shared prompt blocks reach every wayout prompt', () => {
  CONSUMERS.forEach(consumer => {
    SHARED.forEach(shared => {
      it(`${consumer} splices ${shared}`, () => {
        expect(blockFor(consumer)).toContain(`\${${shared}}`)
      })
    })
  })

  /**
   * 🔴 `const` is not hoisted. A shared block defined BELOW the first prompt
   * that splices it sits in the temporal dead zone and the whole module throws
   * on import — every wayout generation 500s. This has nearly shipped twice in
   * one day, both times caught by checking position rather than by reading.
   */
  it('defines every shared block before its first use', () => {
    SHARED.forEach(name => {
      const defined = SRC.indexOf(`export const ${name} =`)
      const used = SRC.indexOf(`\${${name}}`)
      expect(defined).toBeGreaterThan(-1)
      expect(used, `${name} is never used`).toBeGreaterThan(-1)
      expect(used, `${name} is used before it is defined`).toBeGreaterThan(defined)
    })
  })

  /**
   * ⚠️ A stray backtick or `${` inside a shared block's prose ends the template
   * literal early. It has broken this file before — a code sample pasted into
   * a comment took the build down with "Missing opening {".
   */
  it('has no delimiter hiding in a shared block', () => {
    SHARED.forEach(name => {
      // ⚠️ The literal ends at `.trim(), NOT at the last backtick in the block —
      // the block runs to the next export and the JS COMMENTS in between may
      // legitimately contain backticks. The first version of this test read one
      // of those and reported a stray delimiter that was not there.
      const b = blockFor(name)
      const open = b.indexOf('`')
      const close = b.indexOf('`.trim()', open)
      expect(close, `${name} has no closing delimiter`).toBeGreaterThan(open)
      const body = b.slice(open + 1, close)
      expect(body.includes('`'), `${name} contains a backtick`).toBe(false)
      expect(body.includes('${'), `${name} contains an interpolation`).toBe(false)
    })
  })
})
