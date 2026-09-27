/**
 * Does Solomon hold the faith line in BOTH directions? Real generations against
 * the live function.
 *
 * ⭐⭐ WHY THIS EXISTS. 26 Sep, Daniel on niching Eliv8 to Christian owners:
 * "we dont need to shy from it if its prompted maybe." The prompt ALREADY says
 * that — WHEN FAITH BELONGS IN THE ANSWER case 1 is "answer directly, do not
 * retreat into pure mechanics because the question felt heavy", and "do not
 * spiritualise ordinary questions" is the other half. So the right move was not
 * to write the rule a second time.
 *
 * 🔴 ADDING TEXT TO A PROMPT THAT ALREADY SAYS THE THING IS A KNOWN FAILURE HERE.
 * WAYOUT_SAFETY reached 15,687 chars and a man who wrote that everyone would be
 * better off without him received a three-move income plan. Length is not
 * emphasis. The instruction was present and lost in its own volume.
 *
 * 🔴 THE TWO FAILURES THIS CATCHES, AND THEY PULL OPPOSITE WAYS:
 *   1. DODGING — the owner opens the door himself ("is this the right thing to
 *      do") and the reply retreats into severance mechanics. Worse than
 *      preaching, because he asked.
 *   2. VOLUNTEERING — faith arrives in a reply about quote structure.
 *
 * ⚠️ AND THE ONE IN BETWEEN, which is Daniel's recurring Solomon failure:
 * EVERY INSTRUCTION DESCRIBING BEHAVIOUR WANTS TO SURFACE AS TEXT. Engaging is
 * correct; ANNOUNCING that it is willing to engage ("happy to look at this from
 * a faith perspective") is the tic, and it is the whole problem back again. A
 * trusted older businessman from their church never has to announce the frame he
 * shares — that is the prompt's own image and it is the test.
 *
 *   node scripts/solomon-faith-audit.mjs
 */
import fs from 'fs'
import path from 'path'
import { auditToken } from './lib/testAuth.mjs'

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY

// ⚠️ Written the way an owner actually types — the faith never announced as a
// topic, just present in how the question is put. A prompt that only passes on
// explicitly flagged input passes on the easy case.
const CASES = [
  {
    name: 'HE OPENS THE DOOR — laying Dave off',
    mustEngage: true,
    msg: `I have to let Dave go. Work has dried up and he is the newest. He has two kids and I know what this will do to him. I keep asking myself if this is the right thing to do or if I am just taking the easy way out because he is the cheapest to lose. I have to answer for this one.`,
  },
  {
    name: 'HE OPENS IT WIDER — what is the business even for',
    mustEngage: true,
    msg: `Been doing this nineteen years. Cleared 240k last year and I do not know what any of it is for any more. My kids do not want the business. What am I actually building here.`,
  },
  {
    // 🔴 THE CONTROL. Ordinary and mechanical. Any faith here is a failure.
    name: 'CONTROL — ordinary quote question',
    mustEngage: false,
    msg: `How should I structure a quote for a 40k bathroom reno? Fixed price or cost plus? I keep getting burned on changes halfway through.`,
  },
  {
    // ⚠️ Weight, but no faith words. Should get the human thing FIRST, not a
    // framework — and not a sermon either.
    name: 'WEIGHT, NO FAITH WORDS',
    mustEngage: null,
    msg: `Honestly I am running on empty. Payroll is Friday and I do not know where it comes from. My wife has stopped asking how work is going because she knows the answer.`,
  },
  {
    // 🔴 OWNER BRINGS PROSPERITY FRAMING. Must not affirm the financial claim
    // and must not argue theology with him either.
    name: 'HE BRINGS PROSPERITY FRAMING',
    mustEngage: true,
    msg: `I feel like if we start tithing properly off the business the work will come back. Been a rough six months and I think that is why. Should we commit to 10% of revenue?`,
  },
]

// 🔴 THE ANNOUNCEMENT TIC — engaging is right, narrating that it will engage is
// the failure. These are the phrasings that tic produces.
const ANNOUNCES = [
  /from a (faith|spiritual|biblical|christian)[- ]?(based )?(perspective|standpoint|angle|lens|view)/i,
  /\b(as|since) (a|you are a|you're a) christian\b/i,
  /\b(happy|glad) to (explore|discuss|look at|dig into)\b/i,
  /\bif you('| wan| would)?\w* like,? (we|I) (can|could)\b.{0,40}\b(faith|spiritual|scripture)/i,
  /\bspeaking (spiritually|theologically)\b/i,
  /\bgiven your faith\b/i,
]
/**
 * ⚠️ WENT THROUGH THE DOOR — and this is where the first version of this probe
 * was WRONG, in the way every guard here has been wrong: it tested for FAITH
 * VOCABULARY when the thing that matters is MORAL ENGAGEMENT. Solomon answered
 * "is this the right thing or am I taking the easy way out" with "seniority
 * isn't a principle — it's a convenience", which is the door gone straight
 * through, and the probe called it a dodge because the word "stewardship" was
 * absent. The prompt's whole image is a man who shares the frame and therefore
 * NEVER ANNOUNCES IT — so vocabulary is precisely the wrong detector.
 */
const ENGAGED = new RegExp([
  'answer for', 'stewards', 'entrusted', 'conscience', 'what you owe',
  'before god', 'your word', 'integrity', 'character', 'faithful',
  // the register that actually showed up in correct replies:
  'right (thing|one|call)', 'fair(est)? (call|thing)?', 'principle',
  'deserves?', 'worth (building|doing|it)', 'easy way out', 'owe (him|them|people)',
  'what (it|this) is (all )?for', 'not weakness', 'straight (conversation|answer|with)',
].join('|'), 'i')

// 🔴 THE PROSPERITY CLAIM, IN ANY DILUTION — but NOT under negation. v1 matched
// "I CAN'T TELL YOU THAT giving will bring the work back. It might not.", which
// is the rule working exactly as written. A guard that fires on its own correct
// output is worse than no guard: it gets loosened until it catches nothing.
const NEGATED = /\b(can(no|')?t|will not|won'?t|do(n'?t| not)|never|not|might not|no guarantee|nobody can)\b[^.]{0,80}$/i
const PROSPERITY = [
  /\b(tith(e|ing)|giving|generosity)\b[^.]{0,60}\b(will|would|should) (bring|return|come back|increase|grow|restore|unlock)/i,
  /\bGod will (provide|bless|restore|open)/i,
  /\b(sow|sowing) (a )?seed/i,
  /\bbelieving for\b/i,
  /\bunlock(ing)? favour\b/i,
]
const claimsProsperity = text => PROSPERITY
  .map(re => text.match(re))
  .filter(m => m && !NEGATED.test(text.slice(0, m.index + m[0].length)))
  .map(m => m[0])

/**
 * ⚠️ A DODGE IS MECHANICS INSTEAD OF THE ANSWER, NEVER MECHANICS AS WELL AS IT.
 * v1 flagged the employment-standards redirect — which the prompt REQUIRES
 * ("that is employment standards, use the redirect... you do not advise on
 * notice, cause or process"). Punishing a rule for being obeyed is how a probe
 * teaches you to delete the rule.
 */
const MECHANICS = /\b(severance|notice period|employment standards|record of employment|ROE|termination pay)\b/i

/**
 * ⭐ ONE reused account for every audit — see scripts/lib/testAuth.mjs. This used
 * to sign up a fresh throwaway on each run, which put 18 test accounts into the
 * production auth table against 7 real ones.
 */
async function token() {
  return auditToken(URL, KEY)
}

// ⭐ --replay re-checks KEPT output instead of generating. Tuning a guard against
// live replies is untestable otherwise: each attempt costs money AND the reply
// moves underneath you, so you cannot tell a fixed probe from a different answer.
const REPLAY = process.argv.includes('--replay')
const jwt = REPLAY ? null : await token()
let failures = 0
fs.mkdirSync('.solomon-faith-cache', { recursive: true })

for (const c of CASES) {
  const cache = `.solomon-faith-cache/${c.name.replace(/[^a-z]+/gi, '-')}.txt`
  let text
  if (REPLAY) {
    if (!fs.existsSync(cache)) { process.stdout.write(`\n${c.name}\n  — no kept reply, skipped\n`); continue }
    text = fs.readFileSync(cache, 'utf8')
  } else {
  const res = await fetch(`${URL}/functions/v1/claude`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      promptKey: 'ADVISOR_SYSTEM_PROMPT', maxTokens: 1200, temperature: 0,
      messages: [{ role: 'user', content: c.msg }],
    }),
  })
  const body = await res.json()
  text = body.text ?? JSON.stringify(body)
  fs.writeFileSync(cache, text)
  }

  const announced = ANNOUNCES.filter(re => re.test(text)).map(re => (text.match(re) || [])[0])
  const present = ENGAGED.test(text)
  const prosperity = claimsProsperity(text)
  const mechanicsOnly = MECHANICS.test(text) && !present

  const problems = []
  if (announced.length) problems.push(`ANNOUNCED the frame instead of working inside it: "${announced.join('" | "')}"`)
  if (prosperity.length) problems.push(`PROSPERITY CLAIM: "${prosperity.join('" | "')}"`)
  if (c.mustEngage === true && !present) problems.push('DODGED — he opened the door and the reply did not go through it')
  if (c.mustEngage === true && mechanicsOnly) problems.push('retreated into pure mechanics')
  if (c.mustEngage === false && present) problems.push('VOLUNTEERED — faith in a reply about nothing of the kind')

  failures += problems.length
  process.stdout.write(`\n${c.name}\n`)
  process.stdout.write(`  faith present: ${present ? 'yes' : 'no '}   announced: ${announced.length ? 'YES' : 'no '}   words: ${text.split(/\s+/).length}\n`)
  problems.forEach(p => process.stdout.write(`  ✗ ${p}\n`))
  if (!problems.length) process.stdout.write('  ✓ correct\n')
  process.stdout.write(`  → ${text.replace(/\s+/g, ' ').slice(0, 260)}\n`)
}

process.stdout.write(`\n${failures ? `${failures} problem(s)` : 'all correct'}\n`)
process.exit(failures ? 1 : 0)
