import { supabase } from '../supabase'
import { callClaude, SONNET, HAIKU } from '../anthropic'
import { movesLibraryForPrompt } from '../../content/wayoutMoves'
import { readingForPrompt } from '../../content/wayoutReading'
import { enforceMapContract, enforcePlaybookContract, mapProblems, mapStyleNotes } from './mapContract'
import { parseModelJson } from './parseModelJson'
import { loadDraft, clearDraft } from './draft'

export { enforceMapContract, mapProblems } from './mapContract'

/**
 * The way out — session persistence and the two Solomon calls.
 *
 * ⚠️ `wayout_sessions` is user-scoped, not company-scoped — the one
 * customer-facing table in this schema that is. The reasoning is written into
 * migration 046 and it is a privacy decision, not a style one: this table holds
 * a person's custody arrangement and what they are running from, and a company
 * is a shared scope.
 *
 * The user still has a company row (profiles.company_id is NOT NULL, and
 * bootstrap_company provisions one). That is what lets the existing `claude`
 * edge function serve this product with no edit at all — its spend cap, tool
 * cap and usage_events write are company-scoped and keep working.
 */

const TOOL_ID = 'wayout'

/**
 * 🔴 THE WHOLE PRODUCT DEPENDS ON THIS AND IT IS EASY TO MISS.
 *
 * The `claude` edge function's `authedUser()` looks up `profiles` and THROWS
 * "auth: no profile for user" when there isn't one. Every Eliv8 OS user has a
 * profile because business onboarding calls `bootstrap_company` on its first
 * screen — but a person who arrives here signs up and goes straight to the
 * questions, and never touches that flow.
 *
 * Without this, the intake looks like it works: rows save (RLS only needs
 * auth.uid()), reflections fail silently because reflect() swallows errors by
 * design, and then the MAP fails — after the person has paid. The failure lands
 * at the only point in the product where it is indefensible, and it would look
 * like a model problem rather than a missing row.
 *
 * ⚠️ `bootstrap_company` is idempotent and SECURITY DEFINER — it returns the
 * existing company_id if there is one, so an Eliv8 OS owner who wanders in here
 * keeps their real company and nothing is overwritten.
 *
 * ⚠️ The company name is deliberately generic. This person does not have a
 * business, the row is a billing container, and it is never shown to them —
 * inventing "Jake's Company" would put a business they don't own into a product
 * about not having one.
 */
async function ensureProfile(user) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  // A read error is not proof of absence — calling bootstrap on a transient
  // failure is harmless (it is idempotent), so fall through and let it decide.
  if (!error && profile) return

  // ⭐ bootstrap_personal_account, NOT bootstrap_company — it does the same
  // provisioning and then marks the company `is_personal` (migration 047), so
  // the row is excluded from every company count and its owner is never routed
  // into business onboarding. It is guarded so an existing Eliv8 OS customer
  // who opens this intake keeps their real company unflagged.
  const { error: rpcErr } = await supabase.rpc('bootstrap_personal_account', {
    p_full_name: user.user_metadata?.full_name ?? null,
  })
  if (rpcErr) throw new Error(`Could not set up your account: ${rpcErr.message}`)
}

// ── Persistence ─────────────────────────────────────────────────────────────

/**
 * The person's current session, or a new draft.
 *
 * Deliberately returns the most recent rather than enforcing one per user: the
 * v2 check-in product re-runs the intake as life changes, and a unique
 * constraint now would be a migration then.
 */
export async function loadOrCreateSession() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('wayout: not signed in')

  await ensureProfile(user)

  const { data: existing, error: readErr } = await supabase
    .from('wayout_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (readErr) throw new Error(`Could not load your answers: ${readErr.message}`)

  // A paid session is finished. Starting a new draft on top of it would hide
  // the map they bought behind an empty form.
  if (existing && existing.status !== 'paid') return existing
  if (existing?.status === 'paid') return existing

  // ⭐ ADOPT WHATEVER THEY ANSWERED BEFORE THEY HAD AN ACCOUNT. They filled in
  // six screens as a stranger; this is the moment that becomes theirs.
  const draft = loadDraft()
  const answers = draft?.answers ?? {}

  const { data: created, error: insErr } = await supabase
    .from('wayout_sessions')
    .insert({ user_id: user.id, answers })
    .select()
    .single()
  if (insErr) throw new Error(`Could not start: ${insErr.message}`)

  // 🔴 CLEARED THE MOMENT IT IS SAVED, not eventually. It holds a custody
  // arrangement, their pay, their debts and whatever they wrote at the end, and
  // the machine may not be theirs alone.
  if (draft) clearDraft()
  return created
}

/**
 * Carry a draft into a session that already exists but is still empty — the
 * case where someone made an account earlier, came back, answered as a guest in
 * another tab, and then signed in.
 */
export async function adoptDraftInto(session) {
  const draft = loadDraft()
  if (!draft || !Object.keys(draft.answers ?? {}).length) return session
  const existing = Object.keys(session.answers ?? {}).length
  // ⚠️ Never overwrite real answers with a stray draft. Theirs wins.
  if (existing > 0) { clearDraft(); return session }

  const { data, error } = await supabase
    .from('wayout_sessions')
    .update({ answers: draft.answers })
    .eq('id', session.id)
    .select()
    .single()
  if (error) return session
  clearDraft()
  return data
}

/**
 * Save the whole answers document.
 *
 * ⚠️ Whole-document write, on purpose. The answers are read and reasoned about
 * as one thing, a person can go back and change screen two after screen five,
 * and a per-field patch would need a merge strategy for a form nobody else is
 * editing concurrently.
 */
/**
 * ⭐⭐ ONE. Daniel's call, and it is better than the three I argued for.
 *
 * Three was me hedging — leaving room for somebody to be wrong twice. But a
 * person who knows they get ONE go back reads their answers properly and fixes
 * everything they can see, which is a better use of the same rebuild. Three
 * invites exactly the drift he was worried about: change one thing, look,
 * change another, look again, and never start.
 *
 * ⚠️ It also has to be one for the go-back to be worth walking. Somebody with
 * three cheap rewrites tweaks; somebody with one thinks first.
 */
export const WAYOUT_MAX_REBUILDS = 1

/**
 * ⭐⭐ THEY WANT THE ONE WE CROSSED OFF.
 *
 * ⚠️ This is a real change of input, not a re-roll, so it is NOT capped like a
 * rebuild. The cap exists to stop somebody fishing for a different answer to
 * the same question; this is a different question.
 */
export async function insistOn(sessionId, label, current = []) {
  const next = [...new Set([...(current ?? []), String(label).trim()])].filter(Boolean).slice(0, 3)
  const { error } = await supabase
    .from('wayout_sessions')
    .update({ insisted: next })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
  return next
}

/** Count a regeneration. Returns what the count now is. */
export async function countRebuild(sessionId, current = 0) {
  const next = (current ?? 0) + 1
  const { error } = await supabase
    .from('wayout_sessions')
    .update({ rebuilds: next })
    .eq('id', sessionId)
  // ⚠️ Not fatal. Failing to COUNT a rebuild must never stop the rebuild — the
  // person asked for a plan and the bookkeeping is ours, not theirs.
  if (error) console.warn('[wayout] rebuild not counted:', error.message)
  return next
}

/** They asked to be told when the play-by-play is ready. */
export async function wantPlaybook(sessionId) {
  const { error } = await supabase
    .from('wayout_sessions')
    .update({ wants_playbook: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

export async function saveAnswers(sessionId, answers) {
  const { error } = await supabase
    .from('wayout_sessions')
    .update({ answers })
    .eq('id', sessionId)
  if (error) throw new Error(`Could not save: ${error.message}`)
}

export async function markComplete(sessionId, answers) {
  const { error } = await supabase
    .from('wayout_sessions')
    .update({ answers, status: 'complete', completed_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw new Error(`Could not save: ${error.message}`)
}

// ── Reflection (between screens) ────────────────────────────────────────────

/**
 * Two sentences shown at the top of the NEXT screen.
 *
 * Runs on Haiku: it sees one screen's answers, has to restate them and name one
 * consequence, and the whole output is two sentences. Sonnet costs ~12x for a
 * job this shaped. ⚠️ If reflections start reading generic, check the model
 * before the prompt — that was the lesson from extractImage, where Haiku misread
 * the same date twice and Sonnet read it right.
 *
 * ⭐ NEVER BLOCKS. A reflection is a grace note; the next screen must render
 * whether or not it arrives. Every failure path here returns null and the card
 * simply does not appear.
 */
export async function reflect(screenAnswers) {
  try {
    // ⚠️ callClaude returns the text directly (or the parsed object when
    // json:true) — not a wrapper with .text on it.
    const raw = await callClaude({
      promptKey: 'WAYOUT_REFLECTION_PROMPT',
      messages: [{ role: 'user', content: JSON.stringify(screenAnswers) }],
      maxTokens: 150,
      model: HAIKU,
      temperature: 0,
      toolId: TOOL_ID,
      kind: 'reflection',
    })
    const text = String(raw ?? '').trim()
    if (!text) return null

    // A model that ignores "two sentences" usually does so by adding a third
    // that praises or asks something. Cutting to two is a better failure than
    // showing it — and this is exactly the tic the repo keeps hitting, where an
    // instruction about behaviour surfaces as text.
    const sentences = text.match(/[^.!?]+[.!?]+/g)
    if (sentences && sentences.length > 2) return sentences.slice(0, 2).join('').trim()
    return text
  } catch (err) {
    console.warn('[wayout] reflection unavailable (non-fatal):', err)
    return null
  }
}

// ── The map ─────────────────────────────────────────────────────────────────

/**
 * Generate the map from a completed intake.
 *
 * The moves library rides in `stableContext` so it sits inside the cached
 * prefix — it is byte-identical on every call in the product's life, and paying
 * to write it per request rather than per person is the difference between this
 * costing cents and dollars.
 */
/**
 * ⚠️ NINETY SECONDS, AND THE NUMBER IS MEASURED RATHER THAN CHOSEN.
 *
 * Driving the real page repeatedly: the same generation came back in 27s, then
 * 28s, then over 60s. A 28k-character system prompt with a 3,000-token answer
 * is simply not a fast request, and the variance is wide — a cold prompt cache
 * costs most of it. My first guess at 60s killed a call that was still working,
 * which turns "slow" into "broken" and is the worse of the two.
 *
 * ⭐ The timeout exists to end a HANG, not to enforce a speed. Past ninety
 * seconds something is genuinely wrong; before it, the honest thing is to wait
 * and say so.
 */
const MAP_TIMEOUT_MS = 90_000

/**
 * Prose where JSON was asked for, when the prose is deliberate.
 *
 * ⚠️ The test has to separate a CRISIS ANSWER from BROKEN JSON, and it does it
 * by looking for the shape we asked for rather than for distress words. A
 * truncated or malformed map still starts with a brace or carries "headline";
 * an answer that never tried to be a map has neither. Sniffing for the word
 * "safety" instead would make the check wrong in both directions — it would
 * swallow a genuinely broken response that happened to mention it, and miss a
 * crisis answer phrased any other way.
 */
export function crisisFrom(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  if (text.startsWith('{') || text.startsWith('[')) return null
  if (/"headline"|"moves"|"stats"/.test(text)) return null
  if (text.length < 150) return null
  return { crisis: true, message: text }
}

export async function generateMap(answers, onProgress = () => {}) {
  // ⭐⭐ IT GETS TWO GOES, AND THE SECOND ONE IS TOLD WHAT IT DID WRONG.
  //
  // 🔴 Daniel's first real map invented "$120,000 cash in hand at sale" from a
  // person who had written six words about a house and no figure at all. The
  // contract now catches that (see inventedFigures) — but catching it and
  // showing an error screen to someone who answered thirty questions is not a
  // product, it is a complaint. So a rejected map is written again with the
  // rejection in front of it, and only a second failure is ever seen.
  //
  // ⚠️ The correction rides in the USER turn, not the system prompt. The system
  // prefix is byte-identical on every call in this product's life and that is
  // what makes the moves library affordable to send — a per-request line in it
  // would bust the cache for everybody.
  let problems = []

  // 🔴 TWO GOES WAS NOT ENOUGH AND DANIEL HIT THE WALL — three rewrites, no
  // plan, "That didn't come through" over and over. A guard that can refuse
  // forever is a guard that ships nothing.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const content = attempt === 1
      ? JSON.stringify(answers, null, 2)
      : `${JSON.stringify(answers, null, 2)}\n\n`
        + `REJECTED, ATTEMPT ${attempt - 1}. They have not seen it. What was wrong:\n`
        + `${problems.map(p => `  - ${p}`).join('\n')}\n\n`
        // ⚠️ SAY WHAT TO DO, NOT ONLY WHAT WAS WRONG. The first version of this
        // handed back "$120,000 put on something they never priced" and the
        // model produced the same figure again — being told a sentence is wrong
        // does not tell you what the right sentence looks like.
        + 'Write the whole plan again, and this time:\n'
        + '  - Delete every figure listed above. Do not replace it with a different one.\n'
        + '  - The sentence survives without it. "That would clear roughly $120,000" '
        + 'becomes "Find out what it would actually clear" — which is true, and is '
        + 'something they can do this week.\n'
        + '  - A gate may be a COUNT instead of a sum: three paying customers, '
        + 'two months in a row, one signed contract.\n'
        + '  - If you genuinely had to take something as given, it goes in '
        + '"assumptions" and nowhere else.'

    // ⭐ SAY WHICH GO THIS IS. The screen promises twenty seconds; three
    // attempts is three minutes, and a person watching an unchanging spinner
    // has no way to tell working from broken. Telling them it is being written
    // again is also the honest reason — something in the first one was not
    // theirs.
    onProgress(attempt)

    // ⚠️ One controller per attempt. Reusing an aborted signal makes every
    // later attempt fail instantly with the same error, which would turn one
    // slow call into three and look identical to a three-attempt failure.
    const controller = new AbortController()
    const bell = setTimeout(() => controller.abort(), MAP_TIMEOUT_MS)

    let map
    try {
      // ⚠️ json:true returns a STRING — unwrapJson strips fences and slices to
      // the outer braces but does not parse. See parseModelJson.
      const raw = await callClaude({
        signal: controller.signal,
        promptKey: 'WAYOUT_MAP_PROMPT',
        // ⚠️ Both libraries ride in the CACHED prefix — byte-identical on
        // every call in this product's life, so they are paid for once rather
        // than per person.
        stableContext:
          `\n\nMOVES LIBRARY\n\n${movesLibraryForPrompt()}\n`
          + `\n\nTHE SHELF — the only books you may name\n\n${readingForPrompt()}\n`,
        messages: [{ role: 'user', content }],
        maxTokens: 3000,
        json: true,
        model: SONNET,
        // ⭐⭐ STABLE. The same answers should produce the same plan — that is
        // what "this is what your answers produce" means, and it is the whole
        // basis for believing any single plan.
        temperature: 0,
        toolId: TOOL_ID,
        kind: 'map',
      })
      // ⭐⭐ A CRISIS ANSWER IS ALLOWED TO BREAK THE JSON, AND THE PRODUCT HAS
      // TO CATCH IT. Found by testing: given somebody describing violence at
      // home, the model correctly abandoned the three-move shape and wrote
      // prose — 211 for a transition house, 911 for immediate danger, 988 to
      // talk. It was a better answer than any JSON could have been.
      //
      // 🔴 And the client threw "The plan came back unreadable." The single
      // most vulnerable person this product will ever meet got a parser error.
      //
      // ⚠️ The fix is NOT to force a crisis into the plan shape. It is to let
      // the safety rule outrank the format, exactly as written, and render what
      // comes back. See crisisFrom().
      const crisis = crisisFrom(raw)
      if (crisis) return crisis
      map = enforceMapContract(parseModelJson(raw, 'The plan'), answers)
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error('That took longer than it should have — something is wrong at our end, not yours. Try again.')
      }
      // ⚠️ A CAP IS OUR LIMIT, NOT THEIR MISTAKE, AND IT MUST NOT READ AS ONE.
      // The edge function's wording is written for a business owner watching a
      // budget ("get in touch if you need it raised"). Somebody who has just
      // written down what they are running from should not be handed an
      // accounting message — they should be told it is us, and that their
      // answers are safe.
      if (err?.code === 'daily_limit_exceeded' || err?.code === 'spend_cap_exceeded' || err?.status === 429) {
        throw new Error('We\u2019ve hit our own limit for today — this one is on us, not you. Everything you wrote is saved. Try again tomorrow, or sooner if you can.')
      }
      throw err
    } finally {
      clearTimeout(bell)
    }

    problems = mapProblems(map, answers)

    // ⭐⭐ STYLE NEVER CAUSES A REWRITE. IT ONLY RIDES ONE THAT IS HAPPENING.
    //
    // 🔴 It used to force one, and that is what Daniel was sitting through.
    // Driving the real page in a browser showed two and three full generations
    // at ~25 seconds each — a minute and a half of "Reading it back" — and some
    // of those rounds were bought for nothing more than a gate running to 150
    // characters. Twenty-five seconds and a Sonnet call to shorten a sentence
    // is a terrible trade, and the person paying for it is the one waiting.
    //
    // ⚠️ Truth still refuses outright. A figure that is not theirs is worth any
    // number of seconds; prose is not.
    if (!problems.length) return map
    const notes = attempt < 3 ? mapStyleNotes(map) : []
    problems = [...problems, ...notes]

    // ⭐ The map itself, not just the verdict. While Daniel is the only person
    // running this, being able to read what it tried is worth more than any
    // error copy — and it costs nothing.
    console.warn(`[wayout] map attempt ${attempt} rejected:`, problems, map)
  }

  throw new Error(`The plan came back with something in it that isn’t yours (${problems.join(', ')}). Try again.`)
}

// ── The play-by-play ────────────────────────────────────────────────────────

/**
 * How to actually do one move.
 *
 * ⭐ The separate, recurring half of the product. The map is bought once and
 * says what to do and in what order; this says how, for the move they are
 * standing on — because if they knew how, they would have done it already.
 *
 * ⚠️ It is generated for ONE move at a time and only when they reach it. Not as
 * a paywall trick: move two's play-by-play written in January would be written
 * against a situation that has changed by the time they get there, and a
 * confident answer built on stale facts is worse than no answer.
 */
/**
 * The two or three things worth asking before writing a week of instructions.
 *
 * ⭐⭐ THIS IS WHAT MAKES THE PAID HALF WORTH PAYING FOR. Anybody can generate
 * advice from a form. Asking the questions that change the answer, and then
 * answering THAT, is what somebody who knows the work does — and it is the
 * only version of a paywall this product can defend, because the person gets
 * something on the way in rather than merely past a gate.
 *
 * ⚠️ Haiku, not Sonnet. Three questions is a small job and the cost of the
 * paid half is already one Sonnet call; doubling it to ask would make the
 * asking something to economise on, which is the wrong incentive to build in.
 */
export async function generateMoveQuestions({ answers, map, move }) {
  try {
    const raw = await callClaude({
      promptKey: 'WAYOUT_MOVE_QUESTIONS_PROMPT',
      messages: [{
        role: 'user',
        content: JSON.stringify({
          answers,
          the_plan: { headline: map?.headline, moves: map?.moves },
          the_move: move,
        }, null, 2),
      }],
      maxTokens: 700,
      json: true,
      model: HAIKU,
      temperature: 0,
      toolId: TOOL_ID,
      kind: 'move-questions',
    })
    const parsed = parseModelJson(raw, 'The questions')
    const questions = (parsed?.questions ?? [])
      .filter(q => String(q?.q ?? '').trim())
      .slice(0, 3)
      .map(q => ({
        q: String(q.q).trim(),
        why: String(q.why ?? '').trim(),
        options: Array.isArray(q.options) ? q.options.map(String).slice(0, 4) : [],
      }))
    return questions
  } catch (err) {
    // ⚠️ NON-FATAL, ALWAYS. If the questions cannot be written, the person
    // still gets their play-by-play — slightly less accurate and entirely
    // usable. Blocking the thing they came for on the step that improves it
    // would be the tail wagging the dog.
    console.warn('[wayout] move questions unavailable (non-fatal):', err)
    return []
  }
}

export async function generatePlaybook({ answers, map, move, asked = null }) {
  const raw = await callClaude({
    promptKey: 'WAYOUT_PLAYBOOK_PROMPT',
    stableContext: `\n\nMOVES LIBRARY\n\n${movesLibraryForPrompt()}\n`,
    messages: [{
      role: 'user',
      content: JSON.stringify({
        // The whole picture, because the value is entirely in it being theirs.
        answers,
        the_move: move,
        the_plan: { headline: map?.headline, moves: map?.moves, cut: map?.cut },
        // ⭐ What they said thirty seconds ago, about this exact week, knowing
        // what it was for. The freshest and most targeted thing in the call.
        asked: asked ?? undefined,
      }, null, 2),
    }],
    // ⚠️ The schema is large — a script, three arrays and nine fields. 2500 was
    // tight enough that a wordy answer would truncate, and truncated JSON fails
    // in a way that reads like a model problem rather than a budget one.
    maxTokens: 4000,
    json: true,
    model: SONNET,
    temperature: 0,
    toolId: TOOL_ID,
    kind: 'playbook',
  })

  // ⚠️ THE SAME CRISIS PATH AS THE MAP. Somebody reaches the play-by-play
  // AFTER the plan, which means they have been living with it for a while and
  // things may have changed since they answered. The safety rule outranks the
  // JSON here for exactly the same reason it does there.
  const crisis = crisisFrom(raw)
  if (crisis) return crisis

  // ⭐⭐ AND THE SAME FIGURES GUARD. This is where money actually gets used —
  // what to charge, what it costs to start — so it is the likeliest place in
  // the whole product for a number that is not theirs to do damage. The map
  // has been checked since the day it invented $120,000; the play-by-play was
  // never checked at all, which made it the bigger hole of the two.
  return enforcePlaybookContract(parseModelJson(raw, 'The play-by-play'), answers)
}

/**
 * Answer a question about the move somebody is on.
 *
 * ⚠️ THE THREAD IS CAPPED, AND THE CAP IS NOT ONLY ABOUT COST. Twenty questions
 * deep on one move is somebody using this instead of doing the thing — and
 * every turn also re-sends the whole context, so a long thread gets slower and
 * worse at the same time as it gets more expensive.
 */
export const WAYOUT_MAX_ASKS = 12

export async function askAboutMove({ answers, map, move, play, thread = [], question }) {
  const asked = String(question ?? '').trim()
  if (!asked) throw new Error('Ask it and I will answer.')

  const raw = await callClaude({
    promptKey: 'WAYOUT_ASK_PROMPT',
    messages: [{
      role: 'user',
      content: JSON.stringify({
        answers,
        the_plan: { headline: map?.headline, moves: map?.moves },
        the_move: move,
        the_play: play,
        // ⚠️ Only the last few turns. The play-by-play is the context that
        // matters; the back-and-forth is there so they are not repeating
        // themselves, not so every word is remembered forever.
        so_far: thread.slice(-6).map(m => ({ role: m.role, content: m.content })),
        their_question: asked,
      }, null, 2),
    }],
    maxTokens: 500,
    model: SONNET,
    // ⚠️ Not zero. A reply to a question is allowed some air — and unlike the
    // plan, nobody re-asks the same question expecting the same words back.
    temperature: 0.4,
    toolId: TOOL_ID,
    kind: 'ask',
  })

  const text = String(raw ?? '').trim()
  if (!text) throw new Error('That did not come back. Ask again.')
  return text
}

/** Keep the conversation. */
export async function saveThread(sessionId, moveOrder, thread) {
  const { error } = await supabase
    .from('wayout_playbooks')
    .update({ thread })
    .eq('session_id', sessionId)
    .eq('move_order', moveOrder)
  if (error) throw new Error(error.message)
}

// ── Storing a play-by-play ──────────────────────────────────────────────────

/**
 * The play-by-play for one move, written once and kept.
 *
 * ⚠️ IT IS NOT REGENERATED ON EVERY VISIT, AND THAT IS NOT ONLY ABOUT COST.
 * Somebody comes back to this page mid-week, having half-done the thing. A
 * different answer waiting for them — different words to send, a different
 * first step — would mean the instructions changed underneath them while they
 * were following them. The plan may be re-planned; the play they are working
 * from stays put.
 */
export async function loadPlaybook(sessionId, moveOrder) {
  const { data, error } = await supabase
    .from('wayout_playbooks')
    .select('id, move_order, move, play, asked, thread')
    .eq('session_id', sessionId)
    .eq('move_order', moveOrder)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? null
}

/**
 * ⚠️ The MOVE is stored beside the play, as it was when the play was written.
 * A plan can be rebuilt, and a play-by-play for a move that no longer exists is
 * worse than none — it is confident instructions for somebody else's week. The
 * snapshot is what lets the page notice and say so.
 */
export async function savePlaybook({ sessionId, moveOrder, move, play, asked }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Signed out.')

  const { error } = await supabase
    .from('wayout_playbooks')
    .upsert({
      user_id: user.id,
      session_id: sessionId,
      move_order: moveOrder,
      move,
      play,
      ...(asked !== undefined ? { asked } : {}),
    }, { onConflict: 'session_id,move_order' })
  if (error) throw new Error(error.message)
}

/**
 * Everything written so far for this session, so the plan can show what is
 * done and what is reachable.
 *
 * ⚠️ One query, not three. The plan page renders three moves and a naive
 * implementation asks per move — which is fine at this size and becomes the
 * `useAuth` mistake at any other: the same row fetched N times because nobody
 * looked at the shape of the page.
 */
export async function loadProgress(sessionId) {
  const { data, error } = await supabase
    .from('wayout_playbooks')
    .select('move_order, done_at')
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
  const done = new Set()
  const started = new Set()
  ;(data ?? []).forEach(r => {
    started.add(r.move_order)
    if (r.done_at) done.add(r.move_order)
  })
  return { done, started }
}

/**
 * ⚠️ THEIR CLAIM, NOT A VERIFICATION, AND NOTHING ASKS FOR PROOF.
 *
 * Requiring evidence — a number, a receipt, three named customers — turns this
 * into something that audits people, and being audited is what they are
 * already avoiding. Somebody who ticks a move they have not done has misled
 * themselves, and the play-by-play it unlocks will plainly not fit. The product
 * does not have to be the one to say so.
 */
export async function markMoveDone(sessionId, moveOrder, done = true) {
  const { error } = await supabase
    .from('wayout_playbooks')
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq('session_id', sessionId)
    .eq('move_order', moveOrder)
  if (error) throw new Error(error.message)
}

/**
 * Can they open the play-by-play for this move yet?
 *
 * ⭐ The gate is the product. Move one is always open. Anything after it opens
 * when the move before it is done — which is exactly what the plan already
 * promises in writing under every move, and until now nothing enforced.
 */
export function moveIsOpen(order, done) {
  if (order <= 1) return true
  return done.has(order - 1)
}

/** Did the plan change under a play we already wrote? */
export function playbookIsStale(stored, currentMove) {
  if (!stored?.move || !currentMove) return false
  return String(stored.move.title ?? '').trim() !== String(currentMove.title ?? '').trim()
}

// ── What happened ───────────────────────────────────────────────────────────

/**
 * ⭐⭐ THE ONLY HONEST MEASURE THIS PRODUCT HAS.
 *
 * Everything else counted so far is interest — intakes finished, plans
 * generated, play-by-plays opened. All of it is people BELIEVING it might work.
 * This is the first thing that says whether it did.
 *
 * ⚠️ The negative answers are the valuable ones. A plan that got followed and
 * did not land is a fixable problem, and until now there has been no way to
 * see one.
 */
export async function recordOutcome(sessionId, outcome, note = '') {
  const { error } = await supabase
    .from('wayout_sessions')
    .update({
      outcome,
      outcome_at: new Date().toISOString(),
      outcome_note: note.trim() || null,
    })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}
