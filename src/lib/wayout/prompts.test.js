import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * A backtick inside a prompt is a broken edge function.
 *
 * 🔴 EVERY PROMPT IN `_shared/prompts.ts` IS A JS TEMPLATE LITERAL, so one bare
 * backtick in the prose ends the string and the file stops parsing. Writing
 * `gate` in a rule — the obvious way to name a field — does exactly that.
 *
 * ⚠️ NOTHING LOCAL CATCHES IT. prompts.ts is Deno, it is not part of the vite
 * build, eslint does not look at it, and no test imported it. `npm run build`
 * passes, the tests pass, and the failure surfaces only at
 * `supabase functions deploy claude` — the slowest and most expensive place to
 * find a typo, and the one step a session might skip because a git push looks
 * like shipping.
 *
 * That happened on 11 Sep. This is the check instead of the promise.
 */

const PROMPTS = fileURLToPath(new URL('../../../supabase/functions/_shared/prompts.ts', import.meta.url))

describe('_shared/prompts.ts stays parseable', () => {
  const source = readFileSync(PROMPTS, 'utf8')

  // Each prompt is `export const NAME = ` … `.trim()`.
  const templates = [...source.matchAll(/export const (\w+) = `([\s\S]*?)`\.trim\(\)/g)]

  it('finds every prompt (a change to the declaration shape must not silently skip them all)', () => {
    // ⚠️ Without this, a refactor that changes how prompts are declared would
    // make the regex match nothing and the suite below would pass vacuously —
    // a green check that is looking at an empty list.
    expect(templates.length).toBeGreaterThan(15)
    const names = templates.map(t => t[1])
    expect(names).toContain('ADVISOR_SYSTEM_PROMPT')
    expect(names).toContain('WAYOUT_MAP_PROMPT')
    expect(names).toContain('WAYOUT_REFLECTION_PROMPT')
  })

  it.each(
    // Laid out so a failure names the prompt rather than a line number.
    [...source.matchAll(/export const (\w+) = `([\s\S]*?)`\.trim\(\)/g)].map(m => [m[1], m[2]]),
  )('%s contains no unescaped backtick', (name, body) => {
    const offenders = body
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /(^|[^\\])`/.test(line))
    expect(offenders.map(o => `line ${o.n}: ${o.line.trim()}`)).toEqual([])
  })

  it('has no unterminated template — every opener has a closer', () => {
    const opens = (source.match(/export const \w+ = `/g) ?? []).length
    const closes = (source.match(/`\.trim\(\)/g) ?? []).length
    expect(closes).toBe(opens)
  })
})
