/**
 * scripts/check-undefined.mjs — fails the build when code uses a name that was
 * never defined, or reads a `const` above its own declaration.
 *
 * Why this is a BUILD step and not advice:
 *   10 Oct 2026. A change renamed one state variable in the wrong component of
 *   the crew page. Every later use of the old name, and every use of the new
 *   one, pointed at nothing. The bundler compiles that happily, the tests never
 *   render that form, and it went live: the crew's daily log form crashed on
 *   every phone for a day ("micField is not defined") until Daniel clicked it.
 *   The linter names that mistake in two seconds. Nothing ran the linter.
 *
 * It runs the project's own ESLint config and keeps only the findings that are
 * a certain runtime crash. The rest of the lint output (style, hook advice) is
 * deliberately NOT a gate: a gate that fails for reasons nobody will fix today
 * gets switched off, and then it catches nothing.
 */
import { ESLint } from 'eslint'
import react from 'eslint-plugin-react'

// react/jsx-no-undef is the one that catches a component used without its
// import (<Link> with no `import { Link }`): plain no-undef does not look
// inside JSX tags, so on its own it would have missed half of this class.
const CRASHES = new Set(['no-undef', 'no-use-before-define', 'react/jsx-no-undef'])

const eslint = new ESLint({
  overrideConfig: [{
    files: ['**/*.{js,jsx}'],
    plugins: { react },
    rules: { 'no-undef': 'error', 'react/jsx-no-undef': 'error' },
  }],
})
const results = await eslint.lintFiles(['src'])

const found = []
for (const r of results) {
  for (const m of r.messages) {
    if (m.fatal || CRASHES.has(m.ruleId)) {
      found.push(`${r.filePath.replace(process.cwd() + '/', '')}:${m.line}:${m.column}  ${m.message}`)
    }
  }
}

if (found.length > 0) {
  console.error(`\n[check-undefined] ${found.length} thing${found.length === 1 ? '' : 's'} that will crash in the browser:\n`)
  for (const f of found) console.error('  ' + f)
  console.error('\nFix these before building. Each one is a white screen for whoever opens that page.\n')
  process.exit(1)
}
console.log(`[check-undefined] ${results.length} files, nothing undefined.`)
