/**
 * Claude — the browser-side client.
 *
 * Previously this file imported `@anthropic-ai/sdk` with
 * `dangerouslyAllowBrowser: true` and called Anthropic directly with
 * `VITE_ANTHROPIC_API_KEY`. That key shipped in every customer's bundle —
 * one DevTools Network tab away from being lifted and run up to the
 * Anthropic monthly limit.
 *
 * Now every call routes through the `claude` Supabase Edge Function:
 *
 *   Browser → POST /functions/v1/claude → Anthropic
 *                 (with user JWT)         (with secret key, server-side only)
 *
 * The Edge Function holds the Anthropic key, verifies the caller's JWT,
 * enforces caps server-side, and writes usage_events authoritatively.
 *
 * Public surface kept identical so existing tool pages don't need
 * touching: `callClaude`, `streamClaude`, `runToolCall`, `streamToolCall`,
 * plus the `SONNET` / `HAIKU` model constants.
 *
 * Setup checklist:
 *   1. Drop VITE_ANTHROPIC_API_KEY from .env.local — no longer needed.
 *   2. In Supabase → Edge Functions → Secrets, set ANTHROPIC_API_KEY.
 *   3. Deploy: `supabase functions deploy claude`.
 */

import { supabase } from './supabase'
import { assertWithinToolCap, assertWithinSpendCap, trackClaudeUsage } from './usage'
import { getCachedResponse, setCachedResponse } from './responseCache'

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

// ── Prompt caching helper ─────────────────────────────────────────────────────
//
// Anthropic charges 90% less for tokens served from the prompt cache (same
// system prompt within 5 minutes). We mark long system prompts with
// `cache_control: { type: 'ephemeral' }` and ship them as a structured
// block array; short prompts are passed as plain strings (Anthropic's
// minimum cacheable block is large enough that caching a greeting would
// be ignored anyway).
//
// The Edge Function accepts either shape on its `systemPrompt` /
// `systemBlocks` body fields, so the wire format mirrors what the SDK
// used to receive.

const MIN_CACHE_CHARS = 500

// Cache lifetime.
//
// Anthropic charges 1.25x base to write a 5-minute entry and 2x for a
// one-hour one; reads are 0.1x either way. So the question is simply how
// often a session crosses the window and has to pay the write again.
//
// Five minutes is too short for THIS product. Solomon's answers are long and
// meant to be thought about — the owner reads one, checks something in
// QuickBooks, gets interrupted by a job, and replies eight minutes later.
// Under a 5m entry most of those turns re-write at 1.25x. Over an eight-turn
// conversation with four such gaps that is roughly twice the cost of writing
// once at 2x and reading the rest at 0.1x.
//
// Tools keep the 5-minute default: they are one-shot generates, and the only
// follow-up (a refine) lands within seconds.
const TTL_CONVERSATION = '1h'

function buildSystemPayload(text, ttl) {
  if (!text || text.length < MIN_CACHE_CHARS) {
    return { systemPrompt: text || '' }
  }
  return {
    systemBlocks: [
      { type: 'text', text, cache_control: cacheControl(ttl) },
    ],
  }
}

function cacheControl(ttl) {
  return ttl ? { type: 'ephemeral', ttl } : { type: 'ephemeral' }
}

/**
 * Two-block system payload: a STABLE prefix that gets the cache marker, and a
 * VOLATILE suffix that does not.
 *
 * This exists because single-block caching was silently never hitting on the
 * Advisor. A cache entry is keyed on the exact text of everything up to and
 * including the marked block — so folding query-dependent material (semantic
 * search hits, the safety brief, recalled past conversations) into the same
 * block as the system prompt changes the text on every single turn and misses
 * the cache every single time. We were paying full freight for ~5k tokens of
 * instructions plus the whole business context on every message, while a
 * comment in this file claimed we were saving 90%.
 *
 * Order is load-bearing. Anthropic caches the prefix UP TO the marker, so
 * anything that varies per question must come after it.
 */
function buildSplitSystemPayload(stable, volatile, ttl) {
  if (!stable || stable.length < MIN_CACHE_CHARS) {
    return { systemPrompt: [stable, volatile].filter(Boolean).join('') }
  }
  const blocks = [{ type: 'text', text: stable, cache_control: cacheControl(ttl) }]
  if (volatile) blocks.push({ type: 'text', text: volatile })
  return { systemBlocks: blocks }
}

// ── Edge Function URL builder ─────────────────────────────────────────────────
//
// We can't use supabase.functions.invoke() for the streaming case (it
// awaits the full body), so we always go through a hand-rolled fetch
// for symmetry. The token is read from the live session, not a one-time
// snapshot, so a token refresh between calls keeps working.

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  return {
    'Authorization': `Bearer ${token}`,
    'apikey':        SUPABASE_ANON_KEY,
    'content-type':  'application/json',
  }
}

function claudeFunctionUrl() {
  return `${SUPABASE_URL}/functions/v1/claude`
}

// ── Low-level call ────────────────────────────────────────────────────────────

/**
 * Low-level Claude call. Does NOT enforce caps or log usage client-side —
 * the Edge Function handles both server-side. Use `runToolCall()` below for
 * anything the owner pays for; that adds an optimistic browser-side cap
 * check before the round-trip (faster failure UX).
 *
 * @param {object}  opts
 * @param {string}  opts.systemPrompt
 * @param {Array}   opts.messages
 * @param {number}  [opts.maxTokens=1024]
 * @param {boolean} [opts.json=false]
 * @param {string}  [opts.model=SONNET]
 * ⚠️ There is no skipCaps option any more. It was sent in the request body and
 * the edge function used it to disable its own cap check — meaning any signed-in
 * user could spend without limit. Exemption from the per-tool count is now
 * decided server-side from toolId; nothing is exempt from the spend cap.
 */
export async function callClaude({
  systemPrompt,
  systemVolatile,
  messages,
  maxTokens = 1024,
  json      = false,
  model     = SONNET,
}) {
  const sys     = systemVolatile
    ? buildSplitSystemPayload(systemPrompt, systemVolatile)
    : buildSystemPayload(systemPrompt)
  const headers = await authHeaders()

  const res = await fetch(claudeFunctionUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...sys,
      messages,
      maxTokens,
      model,
      json,
      stream: false,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Claude function error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const raw  = data.text ?? ''
  return json ? unwrapJson(raw) : raw
}

/**
 * Streaming Claude call — yields text chunks in real time via onChunk.
 * Used for the Advisor chat so responses appear word-by-word.
 *
 * The Edge Function emits a normalized SSE stream:
 *   data: {"type":"chunk","text":"..."}
 *   ...
 *   data: {"type":"done","usage":{...}}
 *
 * We parse line-by-line and call onChunk for each `chunk` event.
 *
 * @param {object}   opts
 * @param {string}   opts.systemPrompt
 * @param {Array}    opts.messages
 * @param {number}   [opts.maxTokens=2000]
 * @param {string}   [opts.model=SONNET]
 * @param {Function} opts.onChunk
 * @returns {Promise<string>} full response text
 */
export async function streamClaude({
  systemPrompt,
  systemVolatile,
  messages,
  maxTokens = 2000,
  model     = SONNET,
  onChunk,
}) {
  // Advisor conversation. Usage IS recorded and the spend cap DOES apply — it
  // just does not burn one of the ten monthly runs a tool gets, because a
  // conversation is not a tool run. That exemption lives server-side in
  // TOOL_CAP_EXEMPT, keyed on toolId, where the browser cannot reach it.
  //
  // This path used to be treated as "low-level": no cap check and, worse, no
  // usage recorded at all — so the product's biggest cost driver was invisible
  // to its own spend cap.
  return streamClaudeRaw({
    // Tagged so conversation spend is attributable in usage_events rather than
    // landing in 'untagged'. Both are exempt from the per-tool COUNT; only this
    // one tells you afterwards where the money went.
    toolId: 'advisor',
    kind:   'generate',
    systemPrompt,
    systemVolatile,
    // Streaming is the conversational path, so it gets the long entry.
    cacheTtl: TTL_CONVERSATION,
    messages,
    maxTokens,
    model,
    onChunk,
  })
}

// ── Gated billable call ───────────────────────────────────────────────────────

/**
 * Gated Claude call for tool generates + refines. Cap check happens twice:
 *
 *   1. Browser-side (this function) — for fast failure UX. If the cap is
 *      already known to be hit, we throw before the round-trip so the
 *      user sees the modal in <100ms instead of waiting on a request.
 *
 *   2. Edge Function — authoritative. The browser check could be stale or
 *      bypassed. The server is the source of truth.
 *
 * Usage tracking happens only server-side now (browser-side trackClaudeUsage
 * was bypassable by a malicious client and is no longer the source of
 * truth).
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
 * @param {boolean} [opts.noCache=false]
 * @throws {CapExceededError | SpendCapExceededError}
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
  noCache    = false,
}) {
  // Browser-side optimistic cap check. Fail fast on a known-over cap;
  // the Edge Function repeats the check authoritatively.
  await Promise.all([
    assertWithinToolCap(companyId, toolId),
    assertWithinSpendCap(companyId),
  ])

  // Response cache check — same shape and behaviour as before. The cache
  // lives in localStorage (see responseCache.js) so this happens entirely
  // in the browser.
  if (!noCache && kind === 'generate') {
    const cached = await getCachedResponse({ companyId, toolId, kind, systemPrompt, messages })
    if (cached) return cached
  }

  const sys     = buildSystemPayload(systemPrompt)
  const headers = await authHeaders()

  const res = await fetch(claudeFunctionUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...sys,
      messages,
      maxTokens,
      model,
      json,
      stream:    false,
      toolId,
      kind,
    }),
  })

  if (!res.ok) {
    // 429 means a cap was hit server-side — surface a structured error
    // so the existing isCapExceeded() / isSpendCapExceeded() guards in
    // tool pages still light up the right modal.
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}))
      const err  = new Error(body.error ?? 'Cap exceeded')
      err.code   = body.code ?? 'cap_exceeded'
      err.name   = body.code === 'spend_cap_exceeded' ? 'SpendCapExceededError' : 'CapExceededError'
      throw err
    }
    const errText = await res.text().catch(() => '')
    throw new Error(`Claude function error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = json ? unwrapJson(data.text ?? '') : (data.text ?? '')

  // Usage is now logged inside the Edge Function — no second client call.
  // We deliberately keep `trackClaudeUsage` exported so any non-Claude
  // callsite (Places, future providers) can still use it directly.
  void trackClaudeUsage // intentionally referenced to avoid dead-code import elimination

  if (!noCache && kind === 'generate') {
    setCachedResponse({ companyId, toolId, kind, systemPrompt, messages, response: text })
      .then(() => {})
  }

  return text
}

// ── Streaming gated call ──────────────────────────────────────────────────────

/**
 * Streaming gated call. Same cap check as runToolCall but yields text as it
 * arrives via onChunk(chunk, fullTextSoFar). Usage tracking is server-side.
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

  const fullText = await streamClaudeRaw({
    systemPrompt,
    messages,
    maxTokens,
    model,
    onChunk,
    toolId,
    kind,
    json,
  })

  return json ? unwrapJson(fullText) : fullText
}

// ── Internal: streaming fetch + SSE parser ────────────────────────────────────
//
// Shared by streamClaude (no caps) and streamToolCall (caps + tracking).
// The Edge Function does all the work; this just consumes its normalized
// SSE format.
//
// Wire format we expect, one event per `\n\n`-delimited block:
//   data: {"type":"chunk","text":"..."}
//   data: {"type":"error","message":"..."}
//   data: {"type":"done","usage":{...}}

async function streamClaudeRaw({
  systemPrompt,
  systemVolatile,
  cacheTtl,
  messages,
  maxTokens,
  model,
  onChunk,
  toolId,
  kind,
  json    = false,
}) {
  const sys     = systemVolatile
    ? buildSplitSystemPayload(systemPrompt, systemVolatile, cacheTtl)
    : buildSystemPayload(systemPrompt, cacheTtl)
  const headers = await authHeaders()

  const res = await fetch(claudeFunctionUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...sys,
      messages,
      maxTokens,
      model,
      stream:   true,
      toolId,
      kind,
      json,
    }),
  })

  if (!res.ok) {
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}))
      const err  = new Error(body.error ?? 'Cap exceeded')
      err.code   = body.code ?? 'cap_exceeded'
      err.name   = body.code === 'spend_cap_exceeded' ? 'SpendCapExceededError' : 'CapExceededError'
      throw err
    }
    const errText = await res.text().catch(() => '')
    throw new Error(`Claude function error ${res.status}: ${errText.slice(0, 200)}`)
  }
  if (!res.body) {
    throw new Error('Claude function returned no stream body')
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''
  let fullText  = ''

  // Iterate SSE events. We accumulate decoded bytes into `buffer`, split
  // on `\n\n`, and parse each event's `data:` line. `chunk` events drive
  // onChunk; `error` events throw; `done` is the natural terminator.
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const ev of events) {
      for (const line of ev.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload) continue
        try {
          const data = JSON.parse(payload)
          if (data.type === 'chunk' && typeof data.text === 'string') {
            fullText += data.text
            onChunk?.(data.text, fullText)
          } else if (data.type === 'error') {
            throw new Error(data.message || 'Stream error')
          }
          // `done` is informational — we end naturally when the reader closes
        } catch (e) {
          if (e instanceof SyntaxError) continue   // skip malformed line
          throw e
        }
      }
    }
  }

  return fullText
}

// ── JSON fence cleanup ────────────────────────────────────────────────────────
//
// Claude occasionally wraps JSON output in ``` fences even when told not
// to. We strip them defensively so JSON.parse() at callsites doesn't
// have to know about it. Mirrors the original implementation.

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
