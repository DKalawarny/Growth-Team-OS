import Anthropic from '@anthropic-ai/sdk'
import { assertWithinToolCap, assertWithinSpendCap, trackClaudeUsage } from './usage'
import { getCachedResponse, setCachedResponse } from './responseCache'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  // NOTE: move API calls to a Supabase Edge Function before going to production
  // to avoid exposing your API key in the browser bundle.
  dangerouslyAllowBrowser: true,
})

// ── Model constants ───────────────────────────────────────────────────────────
//
// Use these in every callClaude / runToolCall / streamToolCall call instead of
// hardcoding strings. Switching the whole app to a new model is then one edit.
//
// Haiku:  ~20× cheaper than Sonnet. Use for templated, structured, or short
//         outputs — greetings, newsletters, scorecards, safety checklists.
//         Noticeably faster (sub-second for short prompts).
//
// Sonnet: Full reasoning power. Use for strategy, nuanced financial analysis,
//         complex JSON with many interdependent fields, multi-turn conversation.

export const SONNET = 'claude-sonnet-4-6'
export const HAIKU  = 'claude-haiku-4-5'

// ── Prompt caching ────────────────────────────────────────────────────────────
//
// Anthropic charges 90% less for tokens that hit the prompt cache (the same
// system prompt re-sent within 5 minutes). We activate caching automatically
// for any system prompt over MIN_CACHE_CHARS — short greetings don't qualify
// (Anthropic's minimum cacheable block is 1024 tokens for Sonnet / 2048 for
// Haiku, so caching a 3-sentence greeting would just be ignored anyway).
//
// How it works: instead of passing `system` as a string, we pass an array with
// a `cache_control: { type: "ephemeral" }` marker. Anthropic then stores the
// tokenised system prompt and reuses it on matching requests within 5 minutes.
//
// Biggest wins: Advisor chat (same system prompt on every turn), tool generate
// + refine (same tool prompt sent twice per session).

const MIN_CACHE_CHARS = 500  // only cache prompts longer than this

function buildSystem(text) {
  if (text.length < MIN_CACHE_CHARS) return text
  return [{ type: 'text', text, cache_control: { type: 'ephemeral' } }]
}

// ── Low-level call ────────────────────────────────────────────────────────────

/**
 * Low-level Claude call. Does NOT enforce caps or log usage — use
 * `runToolCall()` below for anything the owner pays for.
 *
 * @param {object}  opts
 * @param {string}  opts.systemPrompt
 * @param {Array}   opts.messages
 * @param {number}  [opts.maxTokens=1024]
 * @param {boolean} [opts.json=false]
 * @param {string}  [opts.model=SONNET]
 */
export async function callClaude({
  systemPrompt,
  messages,
  maxTokens = 1024,
  json      = false,
  model     = SONNET,
}) {
  const { text } = await rawClaudeCall({ systemPrompt, messages, maxTokens, json, model })
  return text
}

/**
 * Streaming Claude call — yields text chunks in real time via onChunk.
 * Use for the Advisor chat so responses appear word-by-word.
 * Does NOT enforce caps or track usage (use streamToolCall for billable calls).
 *
 * @param {object}   opts
 * @param {string}   opts.systemPrompt
 * @param {Array}    opts.messages
 * @param {number}   [opts.maxTokens=2000]
 * @param {string}   [opts.model=SONNET]
 * @param {Function} opts.onChunk   (chunk: string, fullText: string) => void
 * @returns {Promise<string>}  The complete response text
 */
export async function streamClaude({
  systemPrompt,
  messages,
  maxTokens = 2000,
  model     = SONNET,
  onChunk,
}) {
  const system = buildSystem(systemPrompt)
  let fullText = ''

  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      fullText += event.delta.text
      onChunk?.(event.delta.text, fullText)
    }
  }

  return fullText
}

// ── Gated billable call ───────────────────────────────────────────────────────

/**
 * Gated Claude call for tool generates + refines. Cap check and usage tracking
 * always happen together here — no tool call can skip either.
 *
 * @param {object}  opts
 * @param {string}  opts.companyId
 * @param {string}  [opts.userId]
 * @param {string}  opts.toolId
 * @param {'generate'|'refine'} [opts.kind='generate']
 * @param {string}  opts.systemPrompt
 * @param {Array}   opts.messages
 * @param {number}  [opts.maxTokens=1024]
 * @param {boolean} [opts.json=false]
 * @param {string}  [opts.model=SONNET]
 * @throws {CapExceededError}
 */
export async function runToolCall({
  companyId,
  userId     = null,
  toolId,
  kind       = 'generate',
  systemPrompt,
  messages,
  maxTokens  = 1024,
  json       = false,
  model      = SONNET,
  noCache    = false,   // set true for refine calls where personalised edits shouldn't be cached
}) {
  await Promise.all([
    assertWithinToolCap(companyId, toolId),
    assertWithinSpendCap(companyId),
  ])

  // ── Cache check ─────────────────────────────────────────────────────────────
  // Only cache 'generate' calls (refines are personalised follow-up edits).
  // On a hit we return immediately — no Claude call, no token spend, no cap decrement.
  if (!noCache && kind === 'generate') {
    const cached = await getCachedResponse({ companyId, toolId, kind, systemPrompt, messages })
    if (cached) return cached
  }

  const { text, usage } = await rawClaudeCall({ systemPrompt, messages, maxTokens, json, model })

  await trackClaudeUsage({
    companyId,
    userId,
    toolId,
    kind,
    tokensIn:  usage?.input_tokens  ?? 0,
    tokensOut: usage?.output_tokens ?? 0,
  })

  // ── Cache store ──────────────────────────────────────────────────────────────
  if (!noCache && kind === 'generate') {
    setCachedResponse({ companyId, toolId, kind, systemPrompt, messages, response: text })
      .then(() => {}) // fire-and-forget
  }

  return text
}

// ── Streaming gated call ──────────────────────────────────────────────────────

/**
 * Streaming gated call. Same cap check + usage tracking as runToolCall but
 * yields text as it arrives via onChunk(chunk, fullTextSoFar).
 *
 * @param {object}   opts
 * @param {string}   opts.companyId
 * @param {string}   [opts.userId]
 * @param {string}   opts.toolId
 * @param {'generate'|'refine'} [opts.kind='generate']
 * @param {string}   opts.systemPrompt
 * @param {Array}    opts.messages
 * @param {number}   [opts.maxTokens=4000]
 * @param {boolean}  [opts.json=false]
 * @param {string}   [opts.model=SONNET]
 * @param {Function} [opts.onChunk]
 */
export async function streamToolCall({
  companyId,
  userId     = null,
  toolId,
  kind       = 'generate',
  systemPrompt,
  messages,
  maxTokens  = 4000,
  json       = false,
  model      = SONNET,
  onChunk,
}) {
  await Promise.all([
    assertWithinToolCap(companyId, toolId),
    assertWithinSpendCap(companyId),
  ])

  const rawSystem = json
    ? `${systemPrompt}\n\nRespond with valid JSON only. Do not include any text outside the JSON. Do not wrap the JSON in markdown code fences.`
    : systemPrompt

  const system   = buildSystem(rawSystem)
  let fullText   = ''
  let tokensIn   = 0
  let tokensOut  = 0

  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  })

  for await (const event of stream) {
    if (event.type === 'message_start') {
      tokensIn = event.message?.usage?.input_tokens ?? 0
    }
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      fullText += event.delta.text
      onChunk?.(event.delta.text, fullText)
    }
    if (event.type === 'message_delta') {
      tokensOut = event.usage?.output_tokens ?? tokensOut
    }
  }

  await trackClaudeUsage({ companyId, userId, toolId, kind, tokensIn, tokensOut })

  return json ? unwrapJson(fullText) : fullText
}

// ── Shared API call ───────────────────────────────────────────────────────────

async function rawClaudeCall({ systemPrompt, messages, maxTokens, json, model = SONNET }) {
  const rawSystem = json
    ? `${systemPrompt}\n\nRespond with valid JSON only. Do not include any text outside the JSON. Do not wrap the JSON in markdown code fences.`
    : systemPrompt

  const system = buildSystem(rawSystem)

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  })

  const raw  = response.content[0].text
  const text = json ? unwrapJson(raw) : raw
  return { text, usage: response.usage }
}

// ── JSON fence cleanup ────────────────────────────────────────────────────────

function unwrapJson(text) {
  if (typeof text !== 'string') return text
  let s = text.trim()

  const fenceMatch = s.match(/^```(?:json|javascript|js)?\s*([\s\S]*?)\s*```$/i)
  if (fenceMatch) return fenceMatch[1].trim()

  const firstBrace   = s.indexOf('{')
  const firstBracket = s.indexOf('[')
  const firstOpen    = [firstBrace, firstBracket]
    .filter(i => i !== -1)
    .sort((a, b) => a - b)[0]
  if (firstOpen === undefined) return s

  const lastBrace   = s.lastIndexOf('}')
  const lastBracket = s.lastIndexOf(']')
  const lastClose   = Math.max(lastBrace, lastBracket)
  if (lastClose <= firstOpen) return s

  return s.slice(firstOpen, lastClose + 1).trim()
}
