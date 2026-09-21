import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * ⭐⭐ EVERY JSX COMPONENT USED IS ACTUALLY DEFINED SOMEWHERE.
 *
 * 🔴 Daniel got "AskBox is not defined" on a live page. The component was
 * rendered and never written: the edit that should have added it anchored on a
 * string that exists in a DIFFERENT file, so the replacement silently did
 * nothing — and every gate we have waved it through. `npx eslint` passed,
 * `npx vite build` passed, 154 tests passed, and the first thing that noticed
 * was a person opening the page.
 *
 * ⚠️ ESLINT CANNOT SEE THIS HERE. `no-undef` checks identifier references and a
 * JSX element name is a JSXIdentifier, which it does not inspect. The rule that
 * catches it — react/jsx-no-undef — lives in eslint-plugin-react, which this
 * repo does not have. Rather than take a dependency for one rule, the check
 * lives here, where it runs with everything else.
 *
 * ⚠️ Deliberately crude: it parses with regular expressions rather than a real
 * AST, because the failure it is looking for is crude. A component that is
 * used and nowhere defined is not a subtle mistake, it is a missing function.
 */
function jsxFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) jsxFiles(full, out)
    else if (entry.name.endsWith('.jsx')) out.push(full)
  }
  return out
}

describe('every JSX component used is defined', () => {
  const files = jsxFiles(path.resolve('src'))

  it('finds files to check at all', () => {
    // ⚠️ A scan that silently matches nothing is the same shape of bug as the
    // one this test exists for.
    expect(files.length).toBeGreaterThan(20)
  })

  // ⚠️ `path.relative` against the repo root, not process.cwd() — this file is
  // linted with browser globals, where `process` does not exist.
  const root = path.resolve('src', '..')
  it.each(files.map(f => [path.relative(root, f), f]))('%s', (_label, file) => {
    const src = fs.readFileSync(file, 'utf8')

    // ⚠️ COMMENTS ONLY. My first version also blanked template literals and
    // quoted strings, and that ate real code: an unbalanced backtick swallowed
    // a thousand lines of Advisor.jsx including the `const Composer` it was
    // meant to find, and the test reported a missing component that was right
    // there. A checker that destroys the thing it is checking is worse than no
    // checker, because its failures look like real ones.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')

    // <Thing ...>, taking the root of <Thing.Nested>
    const used = new Set(
      [...code.matchAll(/<([A-Z][A-Za-z0-9_]*)(?:\.[A-Za-z0-9_]+)?[\s/>]/g)].map(m => m[1]),
    )

    const declared = new Set([
      ...[...code.matchAll(/(?:function|const|let|class)\s+([A-Z][A-Za-z0-9_]*)/g)].map(m => m[1]),
      // ⚠️ BOUNDED ON THE QUOTE, and that is the whole trick. My first version
      // ended the match at `\s+from`, which let it run past one import's end
      // into the next one and capture two statements as a single name. Per
      // line fixed that and broke multi-line imports — `import {\n A,\n B\n}
      // from 'recharts'` is nine components in one statement. Ending at the
      // opening quote of the module path allows newlines AND cannot overrun,
      // because every import has exactly one.
      // ⚠️ AND THE CAPTURE MAY NOT START WITH A QUOTE. `import './index.css'`
      // has no `from`, so a match beginning there runs on to the NEXT
      // statement's `from` and swallows it — which is how main.jsx ended up
      // reporting that <App> was undefined on the line directly below its own
      // import. Every side-effect import in the codebase was doing this.
      ...[...code.matchAll(/import\s+([^'"\s][\s\S]*?)\s+from\s*['"]/g)].flatMap(m =>
        m[1]
          .replace(/[{}]/g, ' ')
          .split(',')
          .map(part => part.trim().split(/\s+as\s+/).pop().trim())
          .filter(Boolean),
      ),
    ])

    const missing = [...used].filter(name => !declared.has(name))
    expect(missing, `${path.basename(file)} renders <${missing.join('>, <')}> and never defines or imports it`).toEqual([])
  })
})
