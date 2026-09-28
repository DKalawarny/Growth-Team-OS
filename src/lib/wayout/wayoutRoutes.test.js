import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * 🔴🔴 A BASE PATH IS NOT AN ADDRESS, AND USING IT AS ONE BROKE THE ONLY EXIT
 * FROM THE FREE DIAGNOSTIC ON THE PRODUCT'S OWN DOMAIN.
 *
 * `WAYOUT_BASE` is a PREFIX. On eliv8os.com it is `/wayout`, which happens to
 * also be the address of the intake — so five call sites were written as
 * `` `${WAYOUT_BASE}?edit=1` `` or plain `navigate(WAYOUT_BASE)` and worked
 * perfectly, because the prefix and the destination were the same string.
 *
 * On getunstuckmap.com the prefix is the EMPTY STRING. Every one of those became
 * a relative link: `to="?start=1"` resolves against the page you are standing on,
 * so the "Keep going" button on the result screen led back to the result screen.
 * Daniel: "now i cant get past here it wont let me go forward."
 *
 * ⚠️ NOTHING THREW. The router resolved a perfectly valid URL, the page rendered,
 * and the only symptom was a person unable to leave — which is the class of bug
 * that reaches a user because it has no stack trace to catch.
 *
 * ⭐⭐ SO THE RULE IS STRUCTURAL: `WAYOUT_BASE` may only ever appear with a path
 * segment after it. A destination that is the base ALONE is `WAYOUT_INTAKE` or
 * `WAYOUT_HOME`, both of which are correct on both hosts.
 *
 * ⚠️ AND THE DETECTOR IS CHECKED AGAINST A KNOWN-BAD STRING BEFORE IT IS
 * TRUSTED. Twelve guards in this product have been wrong, every one a word test
 * standing in for a structural one, and a guard that has never been seen to fail
 * is a guard nobody has tested.
 */

/** Lines where WAYOUT_BASE is used as a whole path rather than as a prefix. */
export function bareBaseUses(source) {
  return source.split('\n').flatMap((line, i) => {
    // Imports and the one legitimate prefix test are not destinations.
    if (/^\s*import\s/.test(line)) return []
    if (/startsWith\(WAYOUT_BASE\)/.test(line)) return []
    // Comments explain the bug; they must not trip the guard that describes it.
    const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '')

    const hits = []
    // `${WAYOUT_BASE}` must be followed immediately by a path segment.
    for (const m of code.matchAll(/\$\{WAYOUT_BASE\}(.?)/g)) {
      if (m[1] !== '/') hits.push({ line: i + 1, text: line.trim() })
    }
    // A bare identifier passed somewhere it will be read as a path.
    if (/(navigate|to=|next\s*=|redirect\w*\s*=|\|\|)\s*\(?\s*WAYOUT_BASE\s*([,)}\s]|$)/.test(code)) {
      hits.push({ line: i + 1, text: line.trim() })
    }
    return hits
  })
}

const FILES = []
;(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walk(full)
    else if (/\.jsx?$/.test(name) && !/\.test\.jsx?$/.test(name)) FILES.push(full)
  }
})(path.resolve('src'))

describe('WAYOUT_BASE is a prefix, never a destination', () => {
  // ⚠️ THE DETECTOR FIRST. If these two ever disagree the findings below mean
  // nothing, and a silent guard is worse than none.
  it('flags the shape that actually shipped', () => {
    expect(bareBaseUses('  <Link to={`${WAYOUT_BASE}?start=1`}>')).toHaveLength(1)
    expect(bareBaseUses('    navigate(WAYOUT_BASE, { replace: true })')).toHaveLength(1)
    expect(bareBaseUses("  const next = params.get('next') || WAYOUT_BASE")).toHaveLength(1)
  })

  it('leaves a real prefix alone', () => {
    expect(bareBaseUses('  navigate(`${WAYOUT_BASE}/plan`)')).toHaveLength(0)
    expect(bareBaseUses('  if (pathname.startsWith(WAYOUT_BASE)) return')).toHaveLength(0)
    expect(bareBaseUses("  import { WAYOUT_BASE } from '../../lib/wayout/brand'")).toHaveLength(0)
  })

  it('finds none in src/', () => {
    const found = FILES.flatMap(f =>
      bareBaseUses(fs.readFileSync(f, 'utf8')).map(h => `${f}:${h.line}  ${h.text}`),
    )
    expect(found).toEqual([])
  })
})
