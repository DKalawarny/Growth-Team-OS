import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      /**
       * 🔴🔴 THIS SHIPPED A WHITE SCREEN ON /plan, 28 Sep.
       *
       * A `const` read fifty lines above its own declaration. `const` is not
       * hoisted, so the minified build died on load with "Cannot access 'J'
       * before initialization" — and NOTHING caught it: the tests never render
       * that component with data, the build only compiles, and the prerender
       * cannot reach an authenticated route.
       *
       * ⭐⭐ The same TDZ trap is already documented for the prompt file, where a
       * shared block defined below its first use 500s every generation. It is
       * not a prompts problem — it is a `const` problem, and it belongs to the
       * whole codebase.
       *
       * ⚠️ `functions: false` deliberately. Function declarations ARE hoisted,
       * and the house style here calls helpers defined further down a file;
       * flagging those would be noise with no bug behind it. Variables and
       * classes are the ones that throw.
       */
    },
  },
  {
    /**
     * ⚠️ SCOPED TO UNSTUCK MAP, AND THAT IS A DELIBERATE COMPROMISE. Turned on
     * across the whole repo it reports 17 existing files — module-level
     * constants referenced inside component bodies, which are safe at runtime
     * because the function runs long after module init. Making `npm run lint`
     * red everywhere would buy nothing and cost the rule its readership: a test
     * nobody can make pass stops being read, which is already written down here
     * after `anthropic.test.js` sat red for weeks.
     * ⭐ So it guards the product being actively built, where the bug class has
     * now cost a live white screen, and the rest is a separate cleanup.
     */
    files: ['src/pages/wayout/**/*.{js,jsx}', 'src/lib/wayout/**/*.{js,jsx}', 'src/content/wayout*.js'],
    rules: {
      'no-use-before-define': ['error', {
        functions: false,
        classes: true,
        variables: true,
        allowNamedExports: true,
      }],
    },
  },
])
