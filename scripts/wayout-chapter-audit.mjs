/**
 * Does the SECOND plan actually read the first one?
 *
 * ⭐⭐ WHY THIS EXISTS. Daniel: "once they hit their plan there could be an
 * advanced section... what to do next to make this live longer." The product
 * finishes — three moves, a gate between each — so a subscription's whole life
 * was one plan long, and the page that asked how it went offered nothing but
 * "Back to the plan".
 *
 * 🔴 THE FAILURE THIS CATCHES IS NOT "did it produce a plan". It is a second plan
 * THAT COULD HAVE BEEN WRITTEN WITHOUT READING THE FIRST. They have already seen
 * a plan by someone who did not know them; getting one again after three months
 * of work is the clearest possible reason to stop paying.
 *
 * Four things, and each one is a different plan:
 *   1. HANDING BACK A MOVE THAT DID NOT WORK. If they wrote that the raise was
 *      refused, a new plan containing "ask for a raise" is the whole product
 *      failing in one line.
 *   2. CHANGING THE DESTINATION WHEN THEY HAVE NOT ARRIVED. "partly" and "no"
 *      mean the Tuesday stands; writing them a new ambition is changing the
 *      subject to avoid the hard part.
 *   3. CONGRATULATING. Ticked boxes are not the same as being out, and praise
 *      from software is worth nothing to somebody who did the work.
 *   4. LAUNDERING LAST ROUND'S INVENTIONS. Figures in the old MAP are the
 *      model's, not theirs — see the provenance note in generateMap.
 *
 * ⚠️ It sends the same history string production sends, imported from
 * chapterHistory.js rather than reimplemented here. A probe that builds its own
 * version of the thing it checks has been wrong every time in this repo.
 *
 *   node scripts/wayout-chapter-audit.mjs
 *   node scripts/wayout-chapter-audit.mjs --replay     (free, re-checks kept output)
 */
import fs from 'fs'
import path from 'path'
import { auditToken } from './lib/testAuth.mjs'
import { historyForPrompt } from '../src/lib/wayout/chapterHistory.js'

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY

/**
 * ⚠️ ONE PERSON, FOUR ENDINGS. Same first plan every time so the only variable is
 * what they said happened — otherwise a difference in the second plan proves
 * nothing about whether the outcome was read.
 */
const FIRST_ANSWERS = {
  name: 'Dave', age: 41, workType: 'employed',
  takeHome: 4200, mustPay: 3900, savings: 600,
  out: 'I am doing 55 hours and it is never enough.',
  tuesday: 'Home for dinner. Not working Saturdays.',
  locationText: 'Sudbury, Ontario', region: 'ca',
}

const FIRST_MAP = {
  headline: 'Home for dinner, Saturdays back — in twelve months',
  moves: [
    { order: 1, title: 'Ask for the rate you are already worth' },
    { order: 2, title: 'Put the spare room to work with a long-term tenant' },
    { order: 3, title: 'The same work, for someone who pays more' },
  ],
}

const CASES = [
  {
    name: 'no — did the work, it did not land',
    outcome: 'no',
    ticked: [1, 2, 3],
    note: 'I asked for the raise twice and got told no both times. The tenant fell through when my sister moved back in. I am still at 55 hours.',
    answers: { ...FIRST_ANSWERS, takeHome: 4300, mustPay: 4000, savings: 300 },
    // 🔴 The refused raise and the impossible spare room must not come back.
    mustNotRepeat: [/\b(ask|asking).{0,30}\b(raise|rate)\b/i, /\bspare room\b/i, /\blong-?term tenant\b/i],
    mustKeepDestination: true,
    mustAcknowledgeFailure: true,
  },
  {
    name: 'partly — real ground, still short',
    outcome: 'partly',
    ticked: [1, 2],
    note: 'Got a 2 dollar an hour raise and the room is rented at 700. Down to 48 hours but still working most Saturdays.',
    answers: { ...FIRST_ANSWERS, takeHome: 5200, mustPay: 3900, savings: 1400 },
    mustNotRepeat: [/\bspare room\b/i],
    mustKeepDestination: true,
  },
  {
    name: 'landed — arrived, new Tuesday given',
    outcome: 'landed',
    ticked: [1, 2, 3],
    note: 'Changed employer in March. Home every night now and I have not worked a Saturday since June.',
    answers: {
      ...FIRST_ANSWERS, takeHome: 5600, mustPay: 3900, savings: 4200,
      tuesday: 'Running my own two-man crew, and still home for dinner.',
      out: 'I want to work for myself but I am not risking the evenings I just got back.',
    },
    mustKeepDestination: false,
  },
  {
    name: 'changed — wants something different now',
    outcome: 'changed',
    ticked: [1],
    note: 'Dad got ill in February and none of this matters the way it did. I need to be twenty minutes from him.',
    answers: {
      ...FIRST_ANSWERS, takeHome: 4400, mustPay: 3900, savings: 900,
      tuesday: 'Twenty minutes from Dad, working something steady.',
      out: 'I need to be near my father and I cannot do 55 hours any more.',
    },
    mustKeepDestination: false,
  },
]

// 🔴 Praise from software, in any wording. Same rule as Done.jsx, which says it
// out loud: three ticked boxes is not the same as being out.
const CONGRATULATES = [
  /\b(well done|congratulations|congrats|great (work|job)|nice work|proud of you|you should be proud)\b/i,
  /\b(amazing|fantastic|brilliant|excellent) (work|progress|job)\b/i,
  /\byou (crushed|nailed|smashed) (it|that)\b/i,
]
// ⚠️ Evidence it read the outcome at all, rather than the answers alone.
const READS_HISTORY = /\b(last time|first plan|previous plan|since (then|March|June|February)|you (said|wrote|told)|that route|did not work|didn'?t work|already|three months|last quarter)\b/i

async function main() {
  const REPLAY = process.argv.includes('--replay')
  const jwt = REPLAY ? null : await auditToken(URL, KEY)
  fs.mkdirSync('.wayout-chapter-cache', { recursive: true })
  let failures = 0

  for (const c of CASES) {
    const cachePath = `.wayout-chapter-cache/${c.name.replace(/[^a-z]+/gi, '-')}.txt`
    let text
    if (REPLAY) {
      if (!fs.existsSync(cachePath)) { process.stdout.write(`\n${c.name}\n  — no kept reply, skipped\n`); continue }
      text = fs.readFileSync(cachePath, 'utf8')
    } else {
      // ⚠️ Assembled exactly as generateMap assembles it: the history string in
      // front of the answers, and the PREVIOUS MAP NEVER merged into the answers,
      // because figures in it are the model's own.
      const history = historyForPrompt({
        chapter: 2,
        previousAnswers: FIRST_ANSWERS,
        previousMap: FIRST_MAP,
        ticked: new Set(c.ticked),
        outcome: c.outcome,
        outcomeNote: c.note,
      })
      const answers = {
        ...c.answers,
        theirPreviousAnswers: FIRST_ANSWERS,
        whatTheySaidHappened: c.note,
        continuesFromOutcome: c.outcome,
      }
      const res = await fetch(`${URL}/functions/v1/claude`, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptKey: 'WAYOUT_NEXT_MAP_PROMPT', json: true, maxTokens: 4000,
          temperature: 0, kind: 'map',
          messages: [{ role: 'user', content: history + JSON.stringify(answers, null, 2) }],
        }),
      })
      const body = await res.json()
      text = body.text ?? JSON.stringify(body)
      fs.writeFileSync(cachePath, text)
    }

    let parsed = {}
    try {
      const j = text.slice(Math.max(0, text.search(/\{\s*"/)))
      for (let e = j.lastIndexOf('}'); e > 0; e = j.lastIndexOf('}', e - 1)) {
        try { parsed = JSON.parse(j.slice(0, e + 1)); break } catch { /* shrink */ }
      }
    } catch { /* leave empty */ }

    const titles = (parsed.moves ?? []).map(m => m.title ?? '').join(' | ')
    const problems = []

    ;(c.mustNotRepeat ?? []).forEach(re => {
      const hit = titles.match(re)
      if (hit) problems.push(`HANDED BACK A MOVE THAT DID NOT WORK: "${hit[0]}"`)
    })

    const congrats = CONGRATULATES.filter(re => re.test(text)).map(re => (text.match(re) || [])[0])
    if (congrats.length) problems.push(`CONGRATULATED: "${congrats.join('" | "')}"`)

    if (!READS_HISTORY.test(text)) {
      problems.push('NO SIGN IT READ THE PREVIOUS ROUND — could have been a first plan')
    }

    /**
     * ⚠️ The destination test is deliberately loose: it asks whether the old
     * Tuesday's own words still drive the headline, not whether a sentence
     * matches. "Home for dinner" and "Saturdays" are Dave's words for it.
     */
    /**
     * ⚠️ MEASURED ACROSS THE WHOLE PLAN, NOT THE HEADLINE ALONE — the 10th time a
     * probe here tested a proxy instead of the thing. The "no" case came back
     * headed "Same destination. Different route", which KEPT the destination
     * (move 3 was "trade the extra hours for the dinner table") and this check
     * called it changed. Whether the plan still aims there is a fact about the
     * plan; the headline is a separate fault with its own check below.
     */
    const aimsAtOld = /\b(home for dinner|saturdays?|dinner table)\b/i
      .test(`${parsed.headline ?? ''} ${titles} ${(parsed.moves ?? []).map(m => m.detail ?? '').join(' ')}`)

    // 🔴 A HEADLINE THAT DESCRIBES THE DOCUMENT INSTEAD OF THEIR LIFE.
    if (/\b(same destination|different route|new (route|approach|plan)|revised plan)\b/i.test(parsed.headline ?? '')) {
      problems.push(`HEADLINE NARRATES THE PLAN instead of naming the destination: "${parsed.headline}"`)
    }
    if (c.mustKeepDestination && !aimsAtOld) {
      problems.push(`CHANGED THE DESTINATION they have not reached: "${parsed.headline ?? ''}"`)
    }
    if (!c.mustKeepDestination && aimsAtOld && !/crew|dad|father|steady/i.test(parsed.headline ?? '')) {
      problems.push(`IGNORED THE NEW DESTINATION they gave: "${parsed.headline ?? ''}"`)
    }

    if (c.mustAcknowledgeFailure && !/\b(did not|didn'?t) work\b|\bno both times\b|\brefused\b|\bfell through\b|\bthat route\b/i.test(text)) {
      problems.push('DID NOT ACKNOWLEDGE that the last route failed')
    }

    failures += problems.length
    process.stdout.write(`\n${c.name}\n`)
    process.stdout.write(`  headline: ${parsed.headline ?? '(none)'}\n`)
    process.stdout.write(`  moves   : ${titles || '(none)'}\n`)
    problems.forEach(p => process.stdout.write(`  ✗ ${p}\n`))
    if (!problems.length) process.stdout.write('  ✓ correct\n')
  }

  process.stdout.write(`\n${failures ? `${failures} problem(s)` : 'all correct'}\n`)
  process.exit(failures ? 1 : 0)
}

await main()
