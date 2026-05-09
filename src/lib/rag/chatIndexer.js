/**
 * Chat history indexer — embeds completed Q&A exchanges for long-term memory.
 *
 * Called after every Advisor turn completes (user message + Solomon reply both
 * saved to DB). Runs in the background — the user sees the reply immediately
 * and indexing happens silently. If it fails (no OpenAI key, network error),
 * the conversation still works; the exchange just won't be searchable later.
 *
 * Format stored:
 *   "Q: <user message>\nA: <solomon reply>"
 *
 * This format is readable as-is when injected back into the prompt, so
 * retrieved past exchanges need no transformation before Solomon sees them.
 *
 * Deduplication: we don't check for existing chunks before inserting. Each
 * exchange is unique by content + timestamp, so duplicates can't arise unless
 * the indexer is called twice for the same exchange (which the caller prevents
 * by running it once at the end of handleSend).
 */

import { supabase } from '../supabase'
import { embed }    from './embeddings'

/**
 * Embed and store a completed Q&A exchange from the Advisor chat.
 *
 * @param {object} opts
 * @param {string} opts.companyId     Company scope
 * @param {string} opts.userId        Which user's memory this belongs to
 * @param {string} opts.userMessage   The question the owner asked
 * @param {string} opts.assistantReply Solomon's response
 * @param {Date}   [opts.occurredAt]  When the exchange happened (defaults to now)
 */
export async function indexChatExchange({
  companyId,
  userId,
  userMessage,
  assistantReply,
  occurredAt = new Date(),
}) {
  if (!companyId || !userId || !userMessage?.trim() || !assistantReply?.trim()) return

  // Format the exchange as a readable Q&A chunk.
  // Keep it concise — we don't want retrieved memories dominating the prompt.
  const content = `Q: ${userMessage.trim()}\nA: ${assistantReply.trim()}`

  // Truncate very long exchanges to keep embedding cost and retrieved chunk
  // size reasonable. 2,000 chars ≈ 500 tokens — enough for full context.
  const truncated = content.length > 2_000
    ? content.slice(0, 2_000) + '…'
    : content

  // Embed the exchange. Returns null if OpenAI key is missing — stored without
  // vector in that case (won't be searchable but doesn't block the flow).
  let embedding = null
  try {
    embedding = await embed(truncated)
  } catch (err) {
    console.warn('[ChatRAG] Embedding failed — storing without vector:', err)
  }

  const { error } = await supabase
    .from('chat_chunks')
    .insert({
      company_id:  companyId,
      user_id:     userId,
      content:     truncated,
      embedding,
      occurred_at: occurredAt.toISOString(),
    })

  if (error) {
    console.warn('[ChatRAG] Failed to save chat chunk:', error.message)
  }
}
