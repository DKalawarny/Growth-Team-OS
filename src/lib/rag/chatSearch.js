/**
 * Semantic search over past Advisor conversations.
 *
 * Finds past Q&A exchanges relevant to the current question and formats them
 * as a concise "relevant past conversations" block for the system prompt.
 * Solomon sees these as recalled memories, not as the live message thread.
 *
 * Why search per-user (not per-company):
 *   Different team members may have different conversations with Solomon.
 *   A hiring manager's chats about org structure shouldn't bleed into the
 *   founder's strategic conversations. User-scoped search keeps memories
 *   personal and reduces noise.
 *
 * Threshold: 0.35 — slightly higher than document search (0.28) because
 * we want past chats to be genuinely relevant, not just vaguely topical.
 * A past conversation about "team culture" shouldn't surface when asking
 * about cash flow, even if they share a few words.
 */

import { supabase } from '../supabase'
import { embed }    from './embeddings'

const DEFAULT_LIMIT     = 4     // top-k past exchanges to surface
const DEFAULT_THRESHOLD = 0.35  // cosine similarity floor

/**
 * Find past conversations relevant to the current query.
 *
 * @param {string} companyId
 * @param {string} userId       Scopes search to this user's chat history
 * @param {string} query        The user's current message
 * @param {object} [opts]
 * @param {number} [opts.limit=4]
 * @param {number} [opts.threshold=0.35]
 *
 * @returns {Promise<Array<{ content: string, occurred_at: string, similarity: number }>>}
 */
export async function searchChatHistory(companyId, userId, query, {
  limit     = DEFAULT_LIMIT,
  threshold = DEFAULT_THRESHOLD,
} = {}) {
  if (!query?.trim() || !companyId || !userId) return []

  try {
    const queryEmbedding = await embed(query)
    if (!queryEmbedding) return []

    const { data, error } = await supabase.rpc('search_chat_history', {
      p_company_id: companyId,
      p_user_id:    userId,
      p_embedding:  queryEmbedding,
      p_limit:      limit,
      p_threshold:  threshold,
    })

    if (error) {
      console.warn('[ChatRAG] Search RPC error:', error.message)
      return []
    }

    return data ?? []
  } catch (err) {
    console.warn('[ChatRAG] Search failed:', err)
    return []
  }
}

/**
 * Format retrieved chat history results into a prompt-ready string.
 * Returns null if no relevant history found.
 *
 * Output shape (injected into system prompt):
 *
 *   RELEVANT PAST CONVERSATIONS (retrieved from memory — use these as context,
 *   not as the current thread):
 *
 *   [3 weeks ago] Q: How should I price my retainer packages?
 *   A: Based on your current revenue of...
 *
 *   [2 months ago] Q: What's a good target profit margin for a service business?
 *   A: For your stage, 20–30% net...
 *
 * @param {Array}  results  From searchChatHistory()
 * @returns {string|null}
 */
export function formatChatHistory(results) {
  if (!results?.length) return null

  const lines = results.map(r => {
    const age = relativeAge(r.occurred_at)
    return `[${age}]\n${r.content}`
  })

  return [
    'RELEVANT PAST CONVERSATIONS (from long-term memory — use as background context, not as the current thread):',
    '',
    lines.join('\n\n'),
  ].join('\n')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeAge(isoString) {
  const then    = new Date(isoString)
  const now     = new Date()
  const diffMs  = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr  = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 60)  return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHr  < 24)  return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  if (diffDay < 7)   return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  if (diffDay < 30)  return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) === 1 ? '' : 's'} ago`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} month${Math.floor(diffDay / 30) === 1 ? '' : 's'} ago`
  return `${Math.floor(diffDay / 365)} year${Math.floor(diffDay / 365) === 1 ? '' : 's'} ago`
}
