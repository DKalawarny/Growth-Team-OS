/**
 * One-time chat history backfill for long-term memory RAG.
 *
 * Fetches all existing Advisor chat_messages for a user, pairs each user
 * question with the assistant reply that followed it, embeds every pair,
 * and stores them in chat_chunks so Solomon can search past conversations
 * from before the memory feature existed.
 *
 * Idempotent: deletes the user's existing chat_chunks before inserting, so
 * running this twice produces the same result without duplicates.
 *
 * Progress is reported via onProgress({ done, total, status }) so the UI
 * can show a real-time progress bar.
 */

import { supabase }       from '../supabase'
import { embedBatch }     from './embeddings'

const MAX_CHARS = 2_000   // truncate very long exchanges before embedding
const BATCH     = 80      // embed 80 pairs per OpenAI API call

/**
 * Backfill chat history for one user.
 *
 * @param {object}   opts
 * @param {string}   opts.companyId
 * @param {string}   opts.userId
 * @param {function} [opts.onProgress]  ({ done, total, status: string }) => void
 *
 * @returns {{ pairs: number, chunks: number, skipped: number }}
 */
export async function backfillChatHistory({ companyId, userId, onProgress }) {
  const report = (done, total, status) => {
    try { onProgress?.({ done, total, status }) } catch {}
  }

  report(0, 0, 'Fetching conversation history…')

  // ── 1. Fetch all advisor messages for this user ───────────────────────────
  // We page through 1,000 at a time to handle large histories.
  const allMessages = []
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('chat_type', 'advisor')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`)
    if (!data?.length) break

    allMessages.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  if (!allMessages.length) {
    report(0, 0, 'No conversation history found.')
    return { pairs: 0, chunks: 0, skipped: 0 }
  }

  // ── 2. Pair user → assistant turns ───────────────────────────────────────
  // Walk the sorted message list. When we see a user message immediately
  // followed by an assistant message, that's a complete Q&A pair.
  const pairs = []
  for (let i = 0; i < allMessages.length - 1; i++) {
    const curr = allMessages[i]
    const next = allMessages[i + 1]
    if (curr.role === 'user' && next.role === 'assistant') {
      const content = `Q: ${curr.content.trim()}\nA: ${next.content.trim()}`
      pairs.push({
        content:    content.length > MAX_CHARS ? content.slice(0, MAX_CHARS) + '…' : content,
        occurredAt: next.created_at,   // timestamp of the completed exchange
      })
      i++ // skip the assistant message we just consumed
    }
  }

  if (!pairs.length) {
    report(0, 0, 'No complete exchanges found to index.')
    return { pairs: 0, chunks: 0, skipped: 0 }
  }

  report(0, pairs.length, `Found ${pairs.length} conversations — clearing old memory…`)

  // ── 3. Delete existing chat_chunks for this user (idempotent reset) ───────
  const { error: delErr } = await supabase
    .from('chat_chunks')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', userId)

  if (delErr) throw new Error(`Failed to clear old chunks: ${delErr.message}`)

  // ── 4. Embed pairs in batches ─────────────────────────────────────────────
  report(0, pairs.length, 'Generating embeddings…')

  const allEmbeddings = []
  let done = 0

  for (let i = 0; i < pairs.length; i += BATCH) {
    const batch  = pairs.slice(i, i + BATCH)
    const texts  = batch.map(p => p.content)
    const embeds = await embedBatch(texts)
    allEmbeddings.push(...embeds)
    done += batch.length
    report(done, pairs.length, `Embedding ${done} of ${pairs.length}…`)
  }

  // ── 5. Insert chunks ──────────────────────────────────────────────────────
  report(done, pairs.length, 'Saving to memory…')

  const rows = pairs.map((p, i) => ({
    company_id:  companyId,
    user_id:     userId,
    content:     p.content,
    embedding:   allEmbeddings[i] ?? null,
    occurred_at: p.occurredAt,
  }))

  // Insert in pages of 500 to avoid request size limits
  let inserted = 0
  for (let i = 0; i < rows.length; i += 500) {
    const { error: insErr } = await supabase
      .from('chat_chunks')
      .insert(rows.slice(i, i + 500))
    if (insErr) throw new Error(`Failed to insert chunks: ${insErr.message}`)
    inserted += Math.min(500, rows.length - i)
  }

  const skipped = allEmbeddings.filter(e => e === null).length

  report(pairs.length, pairs.length, `Done — ${inserted} conversations indexed.`)
  return { pairs: pairs.length, chunks: inserted, skipped }
}
