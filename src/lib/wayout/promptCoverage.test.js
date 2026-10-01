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
 * actually reaching every prompt that writes to a person. That is the part
 * that has silently regressed, over and over.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 REWRITTEN 26 Sep, BECAUSE THE TEST HAD THE SAME DISEASE IT WAS WRITTEN
 * TO CURE. Its list of prompts to check was HAND-MAINTAINED, and
 * WAYOUT_REFLECTION_PROMPT — the check-in email, the one surface that reaches
 * somebody unprompted a week later — was never added to it. So the check-in
 * carried no VOICE block at all and nobody found out, which is precisely the
 * failure mode of writing a rule where the bug was seen.
 *
 * ⭐⭐ THE PROMPTS ARE NOW DISCOVERED, NOT LISTED. A new wayout prompt is
 * covered the moment it is exported, without anybody remembering to come here.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const SRC = fs.readFileSync(
  path.resolve('supabase/functions/_shared/prompts.ts'), 'utf8',
)

const SHARED = ['WAYOUT_SAFETY', 'WAYOUT_MONEY', 'WAYOUT_METHOD', 'WAYOUT_VOICE']

/** Every `export const WAYOUT_*` and the source between it and the next one. */
function blocks() {
  const starts = [...SRC.matchAll(/export const (WAYOUT_[A-Z_]+)/g)]
    .map(m => ({ i: m.index, n: m[1] }))
  return Object.fromEntries(starts.map((s, k) => [
    s.n, SRC.slice(s.i, k + 1 < starts.length ? starts[k + 1].i : SRC.length),
  ]))
}

const BLOCKS = blocks()
const CONSUMERS = Object.keys(BLOCKS).filter(n => n.endsWith('_PROMPT'))

/**
 * Does `name` reach `shared`, directly or through a prompt it is composed from?
 *
 * ⭐⭐ COMPOSITION COUNTS, AND IT IS THE BETTER ANSWER. WAYOUT_NEXT_MAP_PROMPT
 * splices the whole of WAYOUT_MAP_PROMPT and then adds what is different about a
 * second plan — so it inherits all 47 map rules automatically and CANNOT drift
 * from them. Requiring it to splice the shared blocks itself would push it toward
 * being a second copy of the map prompt, which is the exact failure above.
 */
function reaches(name, shared, seen = new Set()) {
  if (seen.has(name)) return false           // a cycle is not a path
  seen.add(name)
  const body = BLOCKS[name]
  if (!body) throw new Error(`${name} does not exist`)
  if (body.includes(`\${${shared}}`)) return true
  return CONSUMERS.some(other => other !== name
    && body.includes(`\${${other}}`)
    && reaches(other, shared, seen))
}

describe('shared prompt blocks reach every wayout prompt', () => {
  it('found the prompts to check at all', () => {
    // ⚠️ A discovery bug would make every assertion below pass vacuously, which
    // is worse than a failing test. Names it found, so a rename is visible.
    expect(CONSUMERS.length).toBeGreaterThanOrEqual(6)
    expect(CONSUMERS).toContain('WAYOUT_REFLECTION_PROMPT')
    expect(CONSUMERS).toContain('WAYOUT_NEXT_MAP_PROMPT')
  })

  CONSUMERS.forEach(consumer => {
    SHARED.forEach(shared => {
      it(`${consumer} reaches ${shared}`, () => {
        expect(reaches(consumer, shared)).toBe(true)
      })
    })
  })

  /**
   * 🔴 `const` IS NOT HOISTED. A shared block referenced above its own definition
   * throws at import time and 500s EVERY generation in the whole function — not
   * just the one prompt. This has nearly shipped twice, and on 26 Sep it caught a
   * real one: WAYOUT_VOICE sat below WAYOUT_REFLECTION_PROMPT, so the check-in
   * could not have spliced it even though it should.
   */
  it('defines every shared block above every prompt that splices it', () => {
    const at = n => SRC.indexOf(`export const ${n}`)
    const broken = []
    CONSUMERS.forEach(consumer => {
      SHARED.forEach(shared => {
        if (BLOCKS[consumer].includes(`\${${shared}}`) && at(shared) > at(consumer)) {
          broken.push(`${consumer} splices ${shared}, which is defined below it`)
        }
      })
    })
    expect(broken).toEqual([])
  })
})

/**
 * ⭐ THE ABBREVIATION RULE RIDES IN WAYOUT_VOICE, so the coverage above carries
 * it to every prompt. This pins that it is still IN the block — Daniel, 30 Sep:
 * "whats str most people wont know abreviations".
 */
describe('no trade shorthand', () => {
  it('WAYOUT_VOICE carries the rule: everyday ones fine, trade shorthand written out', () => {
    expect(BLOCKS.WAYOUT_VOICE).toContain('NO TRADE SHORTHAND.')
    expect(BLOCKS.WAYOUT_VOICE).toContain('would an ordinary person use this abbreviation themselves')
    expect(BLOCKS.WAYOUT_VOICE).toContain('A currency code on a figure')
  })
})

/**
 * ⭐ Returns as a typical percentage, never dollars on their money — Daniel,
 * 1 Oct: "give a percent return which is typical but depends on many factors."
 * In WAYOUT_MONEY so every prompt has it, and the choose prompt defers to it.
 */
describe('returns', () => {
  it('WAYOUT_MONEY allows a typical percentage and forbids a forecast on their money', () => {
    expect(BLOCKS.WAYOUT_MONEY).toContain('RETURNS: A TYPICAL PERCENTAGE, NEVER A FORECAST ON THEIR MONEY.')
    expect(BLOCKS.WAYOUT_MONEY).toContain('it depends on many factors')
  })
  it('the choose prompt defers to it rather than contradicting it', () => {
    expect(BLOCKS.WAYOUT_CHOOSE_PROMPT).toContain('A typical yearly percentage for a kind of investment')
  })
})

/**
 * ⭐ Written TO them — Daniel, 1 Oct: "what danny said thats me why worded like
 * that." The rule had lived only inside the crisis section of WAYOUT_SAFETY,
 * where it read as crisis-only. It belongs to the voice of everything.
 */
describe('second person', () => {
  it('WAYOUT_VOICE carries it for every prompt', () => {
    expect(BLOCKS.WAYOUT_VOICE).toContain('WRITE TO THEM. "YOU", ALWAYS. NEVER ABOUT THEM.')
  })
})
