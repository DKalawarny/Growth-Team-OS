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

/** Every durable fact for this company, plus this user's personal ones. */
export async function loadMemory(companyId, userId) {
  if (!companyId) return []
  const { data, error } = await supabase
    .from('solomon_memory')
    .select('id, kind, statement, detail, source, first_seen, last_confirmed, user_id')
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
      return `  - ${r.statement}${when ? ` (told you ${when})` : ''}${r.detail ? ` — ${r.detail}` : ''}`
    })
    return `${LABEL[kind] ?? kind}:\n${lines.join('\n')}`
  }).join('\n\n')
}

const EXTRACT_PROMPT = `
You maintain an advisor's memory of one business. You are reading a single
exchange between the owner and their advisor, plus what is already remembered.

Return ONLY valid JSON:
{ "remember": [ { "kind": "...", "statement": "...", "detail": "...|null", "scope": "business"|"personal" } ] }

Write something down ONLY when it will still matter in six months:
- constraint  a line they have drawn. "Won't work past 50 hours a week."
- decision    something settled AND why. "Decided against the second truck in
              March because the cash gap was too tight."
- person      who someone is and what they carry. "Dwayne is lead tech, has
              been there about six years, currently carries the most work."
- commitment  something they said they would do, that someone should follow up.
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
  try {
    const existing = await loadMemory(companyId, userId)
    const known = existing.map(r => `- [${r.kind}] ${r.statement}`).join('\n') || '(nothing yet)'

    const raw = await runToolCall({
      model:     HAIKU,
      companyId,
      userId,
      toolId:    'solomon-memory',
      kind:      'extract',
      systemPrompt: `${EXTRACT_PROMPT}\n\nALREADY REMEMBERED:\n${known}`,
      messages: [{ role: 'user', content: JSON.stringify({
        owner_said:   userMessage.slice(0, 4000),
        advisor_said: (assistantMessage ?? '').slice(0, 2000),
      }) }],
      maxTokens: 700,
      json:      true,
    })

    const parsed = JSON.parse(raw)
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
