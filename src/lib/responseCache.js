/**
 * Supabase-backed response cache for Claude tool calls.
 *
 * How it works:
 *   Before every runToolCall we compute a SHA-256 hash of the full inputs
 *   (toolId, kind, systemPrompt, messages). If a non-expired row exists for
 *   that hash + companyId, we return the stored text immediately — no Claude
 *   call, no tokens spent.
 *
 *   On a cache miss we call Claude as normal, then store the response so the
 *   next identical run is free.
 *
 * Cache key:
 *   SHA-256( toolId | kind | systemPrompt | JSON(messages) )
 *   The system prompt contains company-specific context, so two companies
 *   submitting the same form data will never share a cache entry.
 *
 * TTL: 7 days. Expired rows are filtered out at query time.
 *
 * Failure mode: every cache operation is wrapped in try/catch. A Supabase
 * hiccup silently falls through to a real Claude call — degraded performance,
 * not a broken feature.
 */

import { supabase } from './supabase'

const TTL_DAYS = 7

// ── Hash ──────────────────────────────────────────────────────────────────────

async function hashKey(text) {
  const data   = new TextEncoder().encode(text)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function buildRaw({ toolId, kind, systemPrompt, messages }) {
  return `${toolId}|${kind}|${systemPrompt}|${JSON.stringify(messages)}`
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up a cached response. Returns the stored string on a hit, null on miss.
 *
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} opts.toolId
 * @param {string} opts.kind
 * @param {string} opts.systemPrompt
 * @param {Array}  opts.messages
 * @returns {Promise<string|null>}
 */
export async function getCachedResponse({ companyId, toolId, kind, systemPrompt, messages }) {
  try {
    const hash = await hashKey(buildRaw({ toolId, kind, systemPrompt, messages }))

    const { data } = await supabase
      .from('response_cache')
      .select('id, response, hit_count')
      .eq('company_id', companyId)
      .eq('query_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!data) return null

    // Bump hit counter — fire-and-forget, don't await
    supabase
      .from('response_cache')
      .update({ hit_count: data.hit_count + 1 })
      .eq('id', data.id)
      .then(() => {})

    return data.response
  } catch (err) {
    console.warn('[cache] read error (falling through to Claude):', err.message)
    return null
  }
}

/**
 * Store a response in the cache. Upserts so re-running the same tool
 * refreshes the TTL rather than creating a duplicate row.
 *
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} opts.toolId
 * @param {string} opts.kind
 * @param {string} opts.systemPrompt
 * @param {Array}  opts.messages
 * @param {string} opts.response   The text returned by Claude
 */
export async function setCachedResponse({
  companyId,
  toolId,
  kind,
  systemPrompt,
  messages,
  response,
}) {
  try {
    const hash    = await hashKey(buildRaw({ toolId, kind, systemPrompt, messages }))
    const expires = new Date()
    expires.setDate(expires.getDate() + TTL_DAYS)

    await supabase
      .from('response_cache')
      .upsert(
        {
          company_id: companyId,
          query_hash: hash,
          tool_id:    toolId,
          response,
          hit_count:  0,
          expires_at: expires.toISOString(),
        },
        { onConflict: 'company_id,query_hash' },
      )

  } catch (err) {
    console.warn('[cache] write error (non-fatal):', err.message)
  }
}
