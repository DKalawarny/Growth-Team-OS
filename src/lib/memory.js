import { supabase } from './supabase'
import { runToolCall, HAIKU } from './anthropic'

/**
 * Solomon's memory.
 *
 * Read is cheap and unconditional — every active row goes into every turn,
 * because a few dozen sentences is nothing next to the context we already
 * send, and the whole point is that he doesn't have to go looking.
 *
 * Write is a small Haiku pass over one exchange. It runs fire-and-forget
 * after Solomon answers, so it never sits between the owner and a reply.
 *
 * The bar for writing something down is deliberately high. A confidently
 * remembered wrong fact is worse than a forgotten one — it makes every later
 * answer subtly wrong and the owner has no idea why. So the extractor is told
 * to prefer silence, and everything it does write is visible and correctable
 * at /context.
 */

const MAX_ACTIVE = 80

/**
 * Cheap gate before spending a model call on extraction.
 *
 * This used to run on every single turn, including "thanks" and "ok" — a
 * Haiku call each time to reliably learn nothing. The extractor only ever
 * records what the OWNER revealed, so a turn with nothing first-person in it
 * has nothing for it to find.
 *
 * Deliberately loose. A missed fact costs almost nothing (they will say it
 * again, and check-ins and tools write memory too); a wrongly skipped
 * extraction is invisible. So this only filters the obviously empty.
 */
function worthExtracting(text) {
  const t = String(text).trim()
  if (t.length < 60) return false                       // acknowledgements, one-word replies
  if (!/\b(i|i'm|im|we|we're|my|our|us|me)\b/i.test(t)) return false  // nothing about them in it
  return true
}

/** Every durable fact for this company, plus this user's personal ones. */
export async function loadMemory(companyId, userId) {
  if (!companyId) return []
  const { data, error } = await supabase
    .from('solomon_memory')
    .select('id, kind, statement, detail, source, first_seen, last_confirmed, user_id, due_on, asked_at, outcome, outcome_note, outcome_at')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('last_confirmed', { ascending: false })
    .limit(MAX_ACTIVE)
  if (error) { console.warn('[memory] load failed', error.message); return [] }
  return (data ?? []).filter(r => r.user_id == null || r.user_id === userId)
}

/**
 * Shape memory for the prompt.
 *
 * Grouped by kind so Solomon reads "here is what is true of this business"
 * rather than a flat pile, and dated so he can say "you told me in June"
 * instead of asserting things as timeless.
 */
export function formatMemory(rows) {
  if (!rows?.length) return null
  const LABEL = {
    constraint: 'Lines they have drawn',
    decision:   'Decisions already made',
    person:     'People',
    commitment: 'Things they said they would do',
    preference: 'How they want to be advised',
    context:    'Background that stays true',
  }
  const byKind = {}
  for (const r of rows) (byKind[r.kind] ??= []).push(r)

  return Object.entries(byKind).map(([kind, items]) => {
    const lines = items.map(r => {
      const when = r.first_seen
        ? new Date(r.first_seen).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : null
      // A commitment that has been answered reads as history, not as an open
      // item. Without this Solomon sees "said he would hire a second lead"
      // forever and asks about a thing that was settled in March.
      const OUTCOME = {
        kept:    'he did it',
        dropped: 'it did not happen',
        changed: 'he changed his mind',
      }
      const resolved = r.outcome ? ` — ${OUTCOME[r.outcome] ?? r.outcome}${r.outcome_note ? `: ${r.outcome_note}` : ''}` : ''
      const due = !r.outcome && r.due_on ? ` (by ${r.due_on})` : ''
      return `  - ${r.statement}${due}${when ? ` (told you ${when})` : ''}${r.detail ? ` — ${r.detail}` : ''}${resolved}`
    })
    return `${LABEL[kind] ?? kind}:\n${lines.join('\n')}`
  }).join('\n\n')
}

const EXTRACT_PROMPT = `
You maintain an advisor's memory of one business. You are reading a single
exchange between the owner and their advisor, plus what is already remembered.

Return ONLY valid JSON:
{ "remember": [ { "kind": "...", "statement": "...", "detail": "...|null", "scope": "business"|"personal", "due": "YYYY-MM-DD|null" } ],
  "resolve":  [ { "id": "...", "outcome": "kept"|"dropped"|"changed", "note": "...|null" } ] }

RESOLVE is for commitments listed under OPEN COMMITMENTS below. If the owner
said anything in this exchange about one of them, close it:
- kept     they did it
- dropped  it did not happen
- changed  they decided not to, or decided to do something else instead
"changed" is NOT a failure. An owner who reconsidered because the facts moved
did the right thing; record it plainly and move on.
⚠️ Only ever resolve on something the OWNER actually said about that specific
commitment. Do not infer it from the topic coming up, from progress on
something adjacent, or from the advisor's reply. Silence is not an outcome and
an empty resolve list is the normal answer.

Write something down ONLY when it will still matter in six months:
- constraint  a line they have drawn. "Won't work past 50 hours a week."
- decision    something settled AND why. "Decided against the second truck in
              March because the cash gap was too tight."
- person      who someone is and what they carry. "Dwayne is lead tech, has
              been there about six years, currently carries the most work."
- commitment  something they said they would do, that someone should follow up.
              Set "due" to a YYYY-MM-DD date ONLY when they named a real
              timeframe ("by the end of the month", "before the Vernon job
              starts" where you know that date). Otherwise "due": null. Never
              invent a deadline they did not give — an owner asked about a date
              he never set will stop saying what he intends to do out loud, and
              that is the only input this runs on.
- preference  how they want to be advised. "Wants the number first, not the
              context."
- context     durable background. "Two thirds of revenue is commercial."

Do NOT write down:
- anything already remembered, or a reworded version of it
- passing states: today's mood, this week's weather, one busy afternoon
- anything the advisor said — only what the OWNER revealed
- inferences or guesses. If they did not say it, it is not a fact.
- numbers that will be stale next month (this week's bank balance)

Rules:
- statement: one plain sentence, in the owner's own terms, under 200 chars.
- Prefer writing nothing. Most exchanges contain nothing worth keeping, and
  an empty list is a correct and common answer.
- scope "personal" only for facts about this individual rather than the
  business — their own hours, their own preferences.
- At most 3 items from one exchange. If you are tempted by more, you are
  recording conversation rather than remembering facts.
`.trim()

/**
 * Read one exchange and store anything durable. Fire-and-forget: callers
 * should not await this, and a failure here must never surface to the owner.
 */
export async function rememberFromExchange({ companyId, userId, userMessage, assistantMessage, sourceRef }) {
  if (!companyId || !userMessage) return
  if (!worthExtracting(userMessage)) return
  try {
    const existing = await loadMemory(companyId, userId)
    const known = existing.map(r => `- [${r.kind}] ${r.statement}`).join('\n') || '(nothing yet)'

    // Anything he said he would do that has no answer yet. Sent with ids so
    // the extractor can close one when he mentions it — including when he
    // volunteers it without ever being asked, which is the common case.
    const open = existing.filter(r => r.kind === 'commitment' && !r.outcome)
    const openBlock = open.length
      ? open.map(r => `- ${r.id} :: ${r.statement}`).join('\n')
      : '(none)'

    const raw = await runToolCall({
      model:     HAIKU,
      companyId,
      userId,
      toolId:    'solomon-memory',
      kind:      'extract',
      systemPrompt: `${EXTRACT_PROMPT}\n\nALREADY REMEMBERED:\n${known}\n\nOPEN COMMITMENTS:\n${openBlock}`,
      messages: [{ role: 'user', content: JSON.stringify({
        owner_said:   userMessage.slice(0, 4000),
        advisor_said: (assistantMessage ?? '').slice(0, 2000),
      }) }],
      maxTokens: 700,
      json:      true,
    })

    const parsed = JSON.parse(raw)

    // Close anything he answered. Done before the early return below, because
    // an exchange that resolves a commitment very often contains nothing new
    // worth remembering — "yeah, did that last week" is exactly that shape.
    const openIds = new Set(open.map(r => r.id))
    for (const r of (Array.isArray(parsed?.resolve) ? parsed.resolve : [])) {
      if (!openIds.has(r?.id)) continue                       // never trust an id we did not send
      if (!['kept', 'dropped', 'changed'].includes(r?.outcome)) continue
      await supabase.from('solomon_memory').update({
        outcome:      r.outcome,
        outcome_note: r.note ? String(r.note).slice(0, 600) : null,
        outcome_at:   new Date().toISOString(),
      }).eq('id', r.id)
    }

    const items = Array.isArray(parsed?.remember) ? parsed.remember.slice(0, 3) : []
    if (!items.length) return

    const rows = items
      .filter(i => i?.statement && i?.kind)
      .map(i => ({
        company_id: companyId,
        user_id:    i.scope === 'personal' ? userId : null,
        kind:       i.kind,
        statement:  String(i.statement).slice(0, 400),
        detail:     i.detail ? String(i.detail).slice(0, 1200) : null,
        source:     'conversation',
        source_ref: sourceRef ?? null,
        due_on:     i.kind === 'commitment' && /^\d{4}-\d{2}-\d{2}$/.test(i.due ?? '') ? i.due : null,
      }))
    if (!rows.length) return

    // The unique index handles the same sentence arriving twice; ignoring the
    // conflict is the correct behaviour, not an error worth surfacing.
    const { error } = await supabase.from('solomon_memory').insert(rows)
    if (error && !/duplicate key/i.test(error.message)) {
      console.warn('[memory] insert failed', error.message)
    }
  } catch (err) {
    console.warn('[memory] extraction skipped:', err?.message ?? err)
  }
}

/** Owner corrections. Dismissing keeps the row so it is never re-learned. */
export async function dismissMemory(id) {
  return supabase.from('solomon_memory').update({ status: 'dismissed' }).eq('id', id)
}

export async function editMemory(id, statement) {
  return supabase.from('solomon_memory')
    .update({ statement, source: 'owner', last_confirmed: new Date().toISOString() })
    .eq('id', id)
}

/**
 * The one thing he said he would do that is worth asking about this morning.
 *
 * ⚠️ Returns AT MOST ONE, ever, and marks it asked in the same breath. Both
 * halves of that are the feature, not an optimisation:
 *
 * - One, because "never stack them" enforced in a prompt is a rule the model
 *   drifts from, and three commitments in one message is a performance review.
 *   If only one is ever available, it cannot stack them. Structure beats
 *   instruction — this codebase has learned that four times now.
 *
 * - Marked asked BEFORE the message is written, and never offered again even
 *   if the opener decides to SKIP. The cost of that is losing an occasional
 *   ask. The cost of the alternative is a question that keeps coming back
 *   until the owner answers it, which is nagging, and nagging is how this
 *   feature turns into the thing people mute.
 *
 * Silence is not an outcome. An unanswered commitment stays open in memory
 * forever — Solomon simply stops raising it, and nothing anywhere marks it
 * as dropped on the owner's behalf.
 */
const UNDATED_GRACE_DAYS = 30

export async function claimDueCommitment(companyId, userId) {
  if (!companyId) return null
  const today = new Date()
  const iso = today.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('solomon_memory')
    .select('id, statement, detail, due_on, first_seen, user_id')
    .eq('company_id', companyId)
    .eq('kind', 'commitment')
    .eq('status', 'active')
    .is('outcome', null)
    .is('asked_at', null)
    .order('due_on', { ascending: true, nullsFirst: false })
    .limit(20)
  if (error) { console.warn('[memory] due commitments failed', error.message); return null }

  const cutoff = new Date(today.getTime() - UNDATED_GRACE_DAYS * 864e5)
  const due = (data ?? [])
    .filter(r => r.user_id == null || r.user_id === userId)
    // A dated commitment is due on its date. An undated one is fair to raise
    // after a month — that is a real advisor noticing, not a deadline being
    // invented, and it is why the extractor is told never to guess a date.
    .filter(r => (r.due_on ? r.due_on <= iso : new Date(r.first_seen) <= cutoff))
    .sort((a, b) => (a.due_on ?? '9999') < (b.due_on ?? '9999') ? -1 : 1)[0]
  if (!due) return null

  // Guarded on asked_at so two tabs opening at once cannot both claim it.
  const { data: claimed } = await supabase
    .from('solomon_memory')
    .update({ asked_at: new Date().toISOString() })
    .eq('id', due.id)
    .is('asked_at', null)
    .select('id')
  if (!claimed?.length) return null

  return { statement: due.statement, detail: due.detail ?? null, due_on: due.due_on ?? null, said: due.first_seen }
}
