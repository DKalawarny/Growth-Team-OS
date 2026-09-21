/**
 * The way out — run real generations and check every guard against them.
 *
 * ⭐⭐ THIS EXISTS BECAUSE EVERY FAILURE SO FAR REACHED DANIEL FIRST.
 *
 * The guards are unit-tested against fixtures I wrote, which proves the code
 * does what I think it does and nothing about what the model actually writes.
 * Three times now a class of bug has been "fixed", reappeared in a new shape,
 * and been found by a person reading their own plan: an invented $120,000, a
 * must-pay relabelled as a mortgage, savings that were not savings.
 *
 * ⚠️ A unit test cannot catch those. They are properties of real output. So
 * this generates real plans for real-shaped people against the live function
 * and runs every check over the result — the same checks the product runs, plus
 * the assertions a unit test cannot make because they need the answers and the
 * output side by side.
 *
 *   node scripts/wayout-audit.mjs            # every persona, one run each
 *   node scripts/wayout-audit.mjs --runs 3   # three runs each, for stability
 *
 * ⚠️ It costs real money — roughly 6¢ a generation — and it needs
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local. It signs up a
 * throwaway account, which is the only way to reach the function the way the
 * product does.
 */
import fs from 'fs'
import path from 'path'
import {
  enforceMapContract, mapProblems, mapStyleNotes, inventedFigures, fieldNamesLeaked,
} from '../src/lib/wayout/mapContract.js'
import { movesLibraryForPrompt } from '../src/content/wayoutMoves.js'
import { readingForPrompt, WAYOUT_READING } from '../src/content/wayoutReading.js'

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
const RUNS = Number((process.argv.find(a => a.startsWith('--runs='))
  ?? `--runs=${process.argv[process.argv.indexOf('--runs') + 1] || 1}`).split('=')[1]) || 1

/**
 * ⚠️ Deliberately different SHAPES, not different stories. Each one exists to
 * put pressure on a rule that has failed before or is easy to get wrong.
 */
const PEOPLE = {
  'capital-and-debt': {
    why: 'named quantities everywhere — the shape that produced savings that were not savings',
    answers: {
      name: 'Ray', age: 58, out: 'My mother left me the house and I do not know what to do with it.',
      mustPay: 4200, housingCost: 1800, takeHome: 3800, savings: 20000,
      debt: '30000 on cards at 21 percent, 22000 on the truck at 4 percent',
      coming: 'house sale, should clear about 600000',
      locationText: 'Peterborough, Ontario', region: 'ca', goalType: ['More time'],
      horizon: 'a year', hoursPerWeek: 'under 5', atStake: 'cannot-fail', enough: 'enough to stop nights',
    },
  },
  'nothing-spare': {
    why: 'no capital, no slack — the plan must not invent room that is not there',
    answers: {
      name: 'Dave', age: 41, out: 'I am doing 55 hours and it is never enough.',
      mustPay: 3900, housingCost: 1900, takeHome: 4300, savings: 800,
      locationText: 'Sudbury, Ontario', region: 'ca', goalType: ['More money'],
      horizon: 'a year', hoursPerWeek: 'under 5', atStake: 'security', enough: '6000 a month',
      refuse: "I won't move away from my kids", alreadyTried: 'Uber on weekends, it wrecked me',
    },
  },
  'already-clear': {
    why: 'no gap at all — the arithmetic must say spare, not a gap of zero',
    answers: {
      name: 'Richard', age: 56, out: 'I have done well and I want less of everything.',
      mustPay: 9000, housingCost: 4000, takeHome: 28000, savings: 900000,
      locationText: 'Oakville, Ontario', region: 'ca', goalType: ['More time', 'Less to look after'],
      horizon: 'a year', hoursPerWeek: '20+', atStake: 'savings', enough: 'far less than I think',
    },
  },
  'thin-answers': {
    why: 'almost nothing given — the likeliest place to invent detail to fill space',
    answers: {
      out: 'stuck', mustPay: 2000, locationText: 'Kamloops BC', region: 'ca',
      goalType: ['More money'], horizon: 'a year', hoursPerWeek: '10-15', atStake: 'security',
    },
  },
}

async function token() {
  const email = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`
  const res = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: `Audit-${Date.now()}-xQ7` }),
  })
  const { access_token: jwt } = await res.json()
  if (!jwt) throw new Error('could not create an audit account')
  await fetch(`${URL}/rest/v1/rpc/bootstrap_personal_account`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  return jwt
}

async function generate(jwt, answers) {
  const res = await fetch(`${URL}/functions/v1/claude`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      promptKey: 'WAYOUT_MAP_PROMPT',
      stableContext: `\n\nMOVES LIBRARY\n\n${movesLibraryForPrompt()}\n`
        + `\n\nTHE SHELF — the only books you may name\n\n${readingForPrompt()}\n`,
      messages: [{ role: 'user', content: JSON.stringify(answers, null, 2) }],
      maxTokens: 3000, json: true, model: 'claude-sonnet-4-6', temperature: 0,
      toolId: 'wayout', kind: 'map',
    }),
  })
  const body = await res.json()
  if (!body.text) throw new Error(`no text back (${res.status}): ${JSON.stringify(body).slice(0, 120)}`)
  return JSON.parse(body.text.replace(/^```json\s*|\s*```$/g, ''))
}

/**
 * ⚠️ These are the assertions a unit test cannot make, because each one needs
 * the ANSWERS and the OUTPUT together. Every single one is a bug that has
 * actually shipped.
 */
function audit(map, answers) {
  const bad = []
  const text = JSON.stringify(map)
  const push = (t, m) => bad.push(`${t}: ${m}`)

  mapProblems(map, answers).forEach(p => push('CONTRACT', p))
  inventedFigures(map, answers).forEach(p => push('FIGURE', p))
  fieldNamesLeaked(map).forEach(n => push('JARGON', `"${n}" reached the page`))

  // Shipped 17 Sep: a stat labelled for a different number than the one under it.
  ;(map.stats ?? []).forEach(s => {
    if (!s.label || !String(s.label).trim()) push('STAT', 'a stat with no label')
    if (/freed by cutting/i.test(s.label) && !Number(answers.discretionary)) {
      push('STAT', `"Freed by cutting" with nothing being cut`)
    }
  })

  // Shipped 19 Sep: a book that is not on the shelf.
  if (map.read?.title && !WAYOUT_READING.some(b => b.title.replace(/[’']/g, "'") === String(map.read.title).replace(/[’']/g, "'"))) {
    push('SHELF', `recommended "${map.read.title}", which is not on the shelf`)
  }

  // Shipped 20 Sep: an assumption that carries a verdict about the person.
  ;(map.assumptions ?? []).forEach(a => {
    if (/\bbecause\b|—|\byou have already\b/i.test(a)) push('ASSUMPTION', `explains itself: "${a.slice(0, 70)}…"`)
  })

  // Shipped 21 Sep: the highlight overflowing its column.
  if (map.highlight && map.headline && map.highlight.length > map.headline.length * 0.5) {
    push('HIGHLIGHT', 'covers more than half the headline')
  }

  // Shipped all week: advice this product is not licensed to give.
  if (/\byou should incorporate\b|\bset up an LLC\b|\byou will owe\b|\byou qualify for\b/i.test(text)) {
    push('BOUNDARY', 'states a tax, legal or eligibility outcome')
  }

  mapStyleNotes(map).forEach(n => push('STYLE', n))
  return bad
}

const jwt = await token()
let failures = 0
for (const [who, { why, answers }] of Object.entries(PEOPLE)) {
  for (let run = 1; run <= RUNS; run += 1) {
    process.stdout.write(`\n${who}${RUNS > 1 ? ` (run ${run})` : ''} — ${why}\n`)
    try {
      const map = enforceMapContract(await generate(jwt, answers), answers)
      const bad = audit(map, answers)
      if (!bad.length) process.stdout.write('  ✓ clean\n')
      else { failures += bad.length; bad.forEach(b => process.stdout.write(`  ✗ ${b}\n`)) }
    } catch (err) {
      failures += 1
      process.stdout.write(`  ✗ GENERATION: ${err.message}\n`)
    }
  }
}
process.stdout.write(`\n${failures ? `${failures} problem(s)` : 'all clean'}\n`)
process.exit(failures ? 1 : 0)
