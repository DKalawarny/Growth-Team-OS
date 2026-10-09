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
 *   node scripts/wayout-audit.mjs --replay   # re-check the kept output, FREE
 *
 * ⭐⭐ EVERY GENERATION IS KEPT, AND --replay RE-RUNS THE GUARDS OVER IT WITH NO
 * MODEL CALLS. This is not a convenience. Tuning a guard against live output
 * means each attempt costs money AND changes the output underneath you, so you
 * cannot tell whether a fix worked or the model simply wrote something else.
 * Against the kept output the guards are deterministic: the sentence that was
 * wrongly flagged stays on disk until the guard stops flagging it.
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
  readingIsReal,
} from '../src/lib/wayout/mapContract.js'
import { movesLibraryForPrompt } from '../src/content/wayoutMoves.js'
import { readingForPrompt, WAYOUT_READING } from '../src/content/wayoutReading.js'
import { auditToken } from './lib/testAuth.mjs'

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
const REPLAY = process.argv.includes('--replay')
const CACHE = path.resolve('.wayout-audit-cache')
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
  // ⭐ 9 Oct shape: the 1/5/10 ladder, family as part of the destination, the
  // spending tap as the cut-list consent, and "coming" said inside the story.
  'ladder-and-family': {
    why: 'the new intake shape — moves aim at the year, never spend the Saturdays he named, cut only what he tapped',
    answers: {
      name: 'Mike', age: 38, out: 'Not missing my daughter growing up.', region: 'ca',
      workType: 'employed', relationship: 'aligned', kidsAges: ['5-11'],
      takeHome: 4800, mustPay: 4100, housingCost: 2000, savings: 3000,
      debt: '9000 on a card at 20 percent',
      discretionary: [{ key: 'subscriptions', label: 'Subscriptions' }, { key: 'eating-out', label: 'Eating out' }],
      peopleNote: 'Be at my daughter\'s soccer games on Saturdays. My wife is behind it but nervous about money.',
      askedFor: 'People ask me to fix their small engines. A guy paid me 150 to get his mower going.',
      hoursPerWeek: '5-10', assets: [{ key: 'tools', label: 'Tools' }, { key: 'garage', label: 'Garage' }],
      locationText: 'Red Deer, Alberta', atStake: 'security', goalType: [{ key: 'time', label: 'More time' }, { key: 'money', label: 'More money' }],
      goalFirst: 'time', yearShape: 'steady',
      tuesday: 'Card paid off, off by four most days, never working Saturdays, a bit of small engine work out of the garage on weeknights.',
      fiveYears: 'Small engine repair is my main income and I set my own hours.',
      tenYears: 'House paid down, coaching my daughter\'s team, working because I want to.',
      alreadyTried: 'Did some weekend handyman work, it ate every Saturday and I quit.',
      refuse: 'Nothing that takes my Saturdays.',
      story: 'My overtime gets cut in January, so money is tighter from then on. My truck is paid off in March.',
      enough: 'About 5500 a month',
    },
  },
  // ⭐ 9 Oct: "65 year old tom going out mowing lawns". A desk career, a mower
  // in the garage. The mower must not become move one.
  'older-desk': {
    why: 'age + no physical history: no PHYSICAL move unless his answers show the work; lean on what he knows; pension timing named',
    answers: {
      name: 'Tom', age: 65, out: 'Stop worrying every month and slow down.', region: 'ca',
      workType: 'employed', relationship: 'aligned', kidsAges: [{ key: 'adult', label: 'Adult' }],
      takeHome: 4200, mustPay: 3900, housingCost: 1600, savings: 15000,
      debt: '12000 on a line of credit at 9 percent',
      health: [{ key: 'energy', label: 'I’m worn out' }],
      askedFor: 'People at work ask me to sort out their spreadsheets and payroll questions.',
      assets: [{ key: 'mower', label: 'Mower' }, { key: 'admin', label: 'Books or admin' }],
      hoursPerWeek: '5-10', locationText: 'Kelowna, BC', atStake: 'security',
      goalType: [{ key: 'time', label: 'More time' }], yearShape: 'steady',
      tuesday: 'Working three days, not four. The line of credit gone.',
      fiveYears: 'Fully retired, some bookkeeping for people I like.',
      peopleNote: 'Time with my grandkids. My wife wants me to stop before my health makes me.',
      alreadyTried: 'Nothing yet, I have been at the same office 31 years.',
      refuse: 'Anything that means starting a business from scratch.',
      story: 'Thirty one years as a payroll clerk.',
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

/**
 * ⭐ ONE reused account for every audit — see scripts/lib/testAuth.mjs. This used
 * to sign up a fresh throwaway on each run, which put 18 test accounts into the
 * production auth table against 7 real ones.
 */
async function token() {
  return auditToken(URL, KEY)
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
  //
  // 🔴 THIS USED TO BE ITS OWN COPY OF THE CHECK AND IT DRIFTED WITHIN A DAY.
  // `readingIsReal` learned to tolerate the model putting the author inside the
  // title; this duplicate did not, and reported a perfectly good Cal Newport
  // recommendation as a fabrication — twice. An auditor with its own private
  // idea of the rule audits itself, not the product. Call the real one.
  if (map.read?.title && !readingIsReal(map.read, WAYOUT_READING)) {
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

/**
 * ⚠️ The RAW model output is what gets kept, not the enforced map — so a replay
 * exercises `enforceMapContract` too. Enforcement is where most of the repair
 * happens, and a cache of already-repaired output would hide every bug in it.
 */
const kept = (who, run) => path.join(CACHE, `${who}-${run}.json`)

const jwt = REPLAY ? null : await token()
if (!REPLAY) fs.mkdirSync(CACHE, { recursive: true })
let failures = 0
let checked = 0
const ONLY = process.argv.find(a => a.startsWith('--only='))?.split('=')[1]
for (const [who, { why, answers }] of Object.entries(PEOPLE).filter(([w]) => !ONLY || w === ONLY)) {
  for (let run = 1; run <= RUNS; run += 1) {
    process.stdout.write(`\n${who}${RUNS > 1 ? ` (run ${run})` : ''} — ${why}\n`)
    try {
      let raw
      if (REPLAY) {
        if (!fs.existsSync(kept(who, run))) { process.stdout.write('  – nothing kept for this run\n'); continue }
        raw = JSON.parse(fs.readFileSync(kept(who, run), 'utf8'))
      } else {
        raw = await generate(jwt, answers)
        fs.writeFileSync(kept(who, run), JSON.stringify(raw, null, 2))
      }
      checked += 1
      const map = enforceMapContract(raw, answers)
      const bad = audit(map, answers)
      if (!bad.length) process.stdout.write('  ✓ clean\n')
      else { failures += bad.length; bad.forEach(b => process.stdout.write(`  ✗ ${b}\n`)) }
    } catch (err) {
      failures += 1
      process.stdout.write(`  ✗ GENERATION: ${err.message}\n`)
    }
  }
}
/**
 * 🔴 A REPLAY OVER AN EMPTY CACHE ONCE PRINTED "all clean" AND EXITED 0. That is
 * the exact shape of every bug this harness was built to catch — a check that
 * passes because it checked nothing. Nothing checked is a failure.
 */
if (!checked) {
  process.stdout.write('\nnothing was checked — this is a failure, not a pass\n')
  process.exit(1)
}
process.stdout.write(`\n${checked} generation(s) checked — ${failures ? `${failures} problem(s)` : 'all clean'}\n`)
process.exit(failures ? 1 : 0)
