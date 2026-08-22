/**
 * claude
 *
 * Server-side proxy for every Claude call the app makes. Replaces the
 * browser-side `@anthropic-ai/sdk` client with `dangerouslyAllowBrowser:
 * true` — which leaked our Anthropic API key in every customer's network
 * tab. This function now holds the key, verifies the caller's JWT, enforces
 * spend/tool caps authoritatively, and writes usage_events on the server
 * side where the client can't bypass it.
 *
 * One endpoint, two modes:
 *
 *   stream: false  → returns { text, usage: { input_tokens, output_tokens } }
 *   stream: true   → returns text/event-stream of normalized chunks:
 *                      data: {"type":"chunk","text":"..."}
 *                      ...
 *                      data: {"type":"done","usage":{"input_tokens":n,"output_tokens":n}}
 *                    or on error:
 *                      data: {"type":"error","message":"..."}
 *
 * The normalized SSE format is deliberately simpler than Anthropic's
 * wire format. Browser only cares about text deltas; everything else
 * (content_block_start, message_stop, etc.) is noise from the caller's
 * perspective and we'd rather not couple the client to Anthropic's
 * event taxonomy.
 *
 * Request body (JSON):
 *   systemPrompt:  string                     — raw system text, OR
 *   systemBlocks:  Array<{type,text,cache_control?}>
 *                                             — pre-built blocks (for prompt caching)
 *   messages:      Array<{role,content}>       — Anthropic messages array
 *   model:         'claude-sonnet-4-6' | 'claude-haiku-4-5' | string
 *   maxTokens:     number
 *   json:          boolean                    — if true, appends a "respond JSON only" suffix
 *   stream:        boolean
 *
 *   toolId:        string  — for usage tracking ('advisor', 'gbp-optimizer', ...)
 *   kind:          'generate' | 'refine'   — for usage tracking
 *   (skipCaps is GONE — it was client-settable and disabled the cap check.
 *    Exemption from the per-tool COUNT is now decided server-side from toolId
 *    via TOOL_CAP_EXEMPT. Nothing is ever exempt from the spend cap.)
 *
 * Required env vars (set in Supabase → Edge Functions → Secrets):
 *   ANTHROPIC_API_KEY        sk-ant-...   — production Anthropic key
 *   SUPABASE_URL             auto-set by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  auto-set by Supabase
 */

// deno-lint-ignore-file no-external-import
import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser, serviceClient }    from '../_shared/supabase.ts'

// ── Pricing (mirrors src/lib/usage.js — keep in sync) ─────────────────────────
//
// Sonnet 4.6 — $3 in / $15 out per 1M tokens.
// Haiku 4.5 priced lower; the input/output rates differ but for now we
// log everything at Sonnet rates so we over-attribute cost rather than
// under-attribute (matches the conservative pre-edge-function code).
const CLAUDE_INPUT_PER_M  = 3.00
const CLAUDE_OUTPUT_PER_M = 15.00

function computeClaudeCost(tokensIn: number, tokensOut: number): number {
  const inCost  = (tokensIn  || 0) / 1_000_000 * CLAUDE_INPUT_PER_M
  const outCost = (tokensOut || 0) / 1_000_000 * CLAUDE_OUTPUT_PER_M
  return Number((inCost + outCost).toFixed(5))
}

// ⚠️ DAILY BURN LIMIT — a FRACTION of the monthly cap, not a fixed figure.
//
// I first wrote this as a flat $25 and it was useless: the default monthly cap
// is $10, so the monthly check always fired first and the backstop could never
// trigger. A backstop set above the limit it is meant to sit behind is
// decoration.
//
// Proportional works because it scales with whatever plan a company is on. At
// the $10 default this is $4 a day — roughly 40-80 Solomon turns, far beyond
// any real day's use, and minutes for a script.
const DAILY_FRACTION   = 0.4
const DAILY_FLOOR_USD  = 2.00   // so a very small cap still leaves room to work

// Largest max_tokens any caller may request. The client used to be able to ask
// for anything; a single request could be made arbitrarily expensive.
const MAX_TOKENS_CEILING = 8192

// ⭐ Tools exempt from the per-TOOL count cap (10 runs/month). They are NOT
// exempt from the spend cap — nothing is.
//
// This replaces a `skipCaps` boolean that was read straight out of the request
// body. The comment above the old check said "we re-check here because the
// browser is untrusted code", and then trusted a flag from the browser to
// disable the check. Any authenticated user could pass skipCaps:true and spend
// without limit on our Anthropic key.
//
// The exemption now lives on the server and is keyed on what the call IS.
// Conversation and internal bookkeeping should not burn a tool run; they must
// still respect the money.
const TOOL_CAP_EXEMPT = new Set([
  'advisor',          // Solomon conversation — metered by spend, not by count
  'morning-opener',   // generated greeting
  'solomon-memory',   // memory extraction, fires after an exchange
  'untagged',         // low-level calls with no declared tool
])

const DEFAULT_SPEND_CAP_USD = 10.00
const DEFAULT_TOOL_CAP      = 10

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
if (!ANTHROPIC_KEY) {
  console.warn('[claude] ANTHROPIC_API_KEY env var not set — every request will fail')
}

// Anthropic version header. Bump when we adopt new API features.
const ANTHROPIC_VERSION = '2023-06-01'

// ── Date helpers ──────────────────────────────────────────────────────────────

function firstOfThisMonth(): Date {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0))
}

// ── Cap checks (authoritative — duplicate the browser checks server-side) ────

interface CompanyCapRow {
  monthly_spend_cap: number | null
  monthly_tool_cap:  number | null
}

async function assertCapsServerSide(
  admin: ReturnType<typeof serviceClient>,
  companyId: string,
  toolId: string,
): Promise<void> {
  const since = firstOfThisMonth().toISOString()

  // Pull cap config + this month's usage in parallel. created_at comes back so
  // the last-24h window can be summed from the same rows — one query, both
  // limits, rather than a second round trip on every single request.
  const [companyRes, spendRes, toolRes] = await Promise.all([
    admin
      .from('companies')
      .select('monthly_spend_cap, monthly_tool_cap')
      .eq('id', companyId)
      .maybeSingle(),
    admin
      .from('usage_events')
      .select('cost_usd, created_at')
      .eq('company_id', companyId)
      .gte('created_at', since),
    admin
      .from('usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('tool_id',    toolId)
      .eq('provider',   'anthropic')
      .gte('created_at', since),
  ])

  const company  = (companyRes.data ?? {}) as CompanyCapRow
  const spendCap = company.monthly_spend_cap ?? DEFAULT_SPEND_CAP_USD
  const toolCap  = company.monthly_tool_cap  ?? DEFAULT_TOOL_CAP

  // ⚠️ FAIL CLOSED. This used to proceed when the usage read errored, with the
  // comment "fail open on read errors — same policy as browser". Failing open
  // is right in the browser, where the server still backstops it, and wrong
  // here, where nothing does: a transient database error became uncapped spend.
  if (spendRes.error) {
    const err = new Error('Could not verify usage against your plan — try again in a moment.')
    ;(err as Error & { code?: string }).code = 'cap_check_failed'
    throw err
  }

  const spendRows = (spendRes.data ?? []) as Array<{ cost_usd: number | null; created_at: string }>
  const spent     = spendRows.reduce((s, r) => s + Number(r.cost_usd || 0), 0)

  // Daily burn, from the same rows. Checked BEFORE the monthly cap so a runaway
  // loop is stopped within hours rather than after it has eaten the month.
  const dayAgo    = Date.now() - 24 * 60 * 60 * 1000
  const dailyCap  = Math.max(DAILY_FLOOR_USD, spendCap * DAILY_FRACTION)
  const spentToday = spendRows
    .filter(r => new Date(r.created_at).getTime() >= dayAgo)
    .reduce((s, r) => s + Number(r.cost_usd || 0), 0)
  if (spentToday >= dailyCap) {
    const err = new Error(
      `Daily limit reached ($${spentToday.toFixed(2)} of $${dailyCap.toFixed(2)} in the last 24 hours). It resets automatically — get in touch if you need it raised.`,
    )
    ;(err as Error & { code?: string }).code = 'daily_limit_exceeded'
    throw err
  }

  if (spent >= spendCap) {
    const err = new Error(`Monthly spend cap of $${spendCap.toFixed(2)} reached ($${spent.toFixed(2)} used)`)
    ;(err as Error & { code?: string }).code = 'spend_cap_exceeded'
    throw err
  }

  // Per-tool count cap. Conversation and internal calls are exempt from the
  // COUNT but were already held to the spend cap above.
  if (!TOOL_CAP_EXEMPT.has(toolId)) {
    const used = toolRes.count ?? 0
    if (used >= toolCap) {
      const err = new Error(`Monthly cap reached for ${toolId}: ${used}/${toolCap}`)
      ;(err as Error & { code?: string }).code = 'cap_exceeded'
      throw err
    }
  }
}


// ── Usage write ───────────────────────────────────────────────────────────────

async function recordUsage(
  admin: ReturnType<typeof serviceClient>,
  args: {
    companyId: string
    userId:    string | null
    toolId:    string
    kind:      string
    tokensIn:  number
    tokensOut: number
  },
): Promise<void> {
  const cost = computeClaudeCost(args.tokensIn, args.tokensOut)
  const { error } = await admin.from('usage_events').insert({
    company_id: args.companyId,
    user_id:    args.userId,
    tool_id:    args.toolId,
    provider:   'anthropic',
    kind:       args.kind || 'generate',
    tokens_in:  args.tokensIn,
    tokens_out: args.tokensOut,
    units:      1,
    cost_usd:   cost,
  })
  // Swallow on failure — same policy as the old browser-side code. We
  // never want a usage-log hiccup to fail a user-visible operation.
  if (error) console.warn('[claude] usage insert failed:', error.message)
}

// ── System payload builder ────────────────────────────────────────────────────
//
// The browser sends EITHER a `systemPrompt` string OR a pre-built
// `systemBlocks` array (when the caller has already structured cache_control
// markers). We accept both and forward whichever was set.
//
// `json: true` appends the standard "respond with valid JSON only" suffix.
// This mirrors the old browser logic so nothing breaks for tool-call sites
// that toggle the flag.

function buildSystem(
  body: { systemPrompt?: string; systemBlocks?: unknown[]; json?: boolean },
): string | unknown[] {
  const jsonSuffix = '\n\nRespond with valid JSON only. Do not include any text outside the JSON. Do not wrap the JSON in markdown code fences.'

  // Caller pre-built the blocks (used when they want prompt caching with
  // a specific cache_control marker). We trust the shape; if json mode is
  // on, append the suffix to the last text block.
  if (Array.isArray(body.systemBlocks)) {
    const blocks = body.systemBlocks.slice() as Array<{ type: string; text: string; cache_control?: unknown }>
    if (body.json && blocks.length > 0) {
      const last = blocks[blocks.length - 1]
      blocks[blocks.length - 1] = { ...last, text: (last.text || '') + jsonSuffix }
    }
    return blocks
  }

  // Plain string. Anthropic accepts string-or-array for `system`; we just
  // pass the string through.
  const text = (body.systemPrompt ?? '') + (body.json ? jsonSuffix : '')
  return text
}

// ── SSE parsing for the observer side-channel ─────────────────────────────────
//
// We tee() Anthropic's stream into (a) the response body forwarded to the
// browser and (b) a side-channel we parse for usage tokens. Anthropic's
// streaming protocol emits:
//
//   event: message_start    { message: { usage: { input_tokens } } }
//   event: content_block_delta { delta: { type: 'text_delta', text: '...' } }
//   event: message_delta    { usage: { output_tokens } }
//   event: message_stop
//
// The side-channel watches for message_start (in tokens) and message_delta
// (out tokens running total) so we have authoritative usage to log on close.

interface ObservedUsage {
  tokensIn:  number
  tokensOut: number
}

async function observeUpstream(
  observe: ReadableStream<Uint8Array>,
  out: ObservedUsage,
): Promise<void> {
  const reader  = observe.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE events are \n\n delimited
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const ev of events) {
        for (const line of ev.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          try {
            const data = JSON.parse(payload)
            if (data.type === 'message_start') {
              out.tokensIn = data.message?.usage?.input_tokens ?? out.tokensIn
            }
            if (data.type === 'message_delta') {
              out.tokensOut = data.usage?.output_tokens ?? out.tokensOut
            }
          } catch {
            // Ignore malformed lines — Anthropic occasionally sends
            // keepalive comments (lines starting with `: `) which
            // aren't valid JSON. Not worth bailing the stream over.
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST')    return json({ error: 'POST only' }, 405)

  try {
    const user = await authedUser(req)
    const body = await req.json().catch(() => ({})) as {
      systemPrompt?: string
      systemBlocks?: unknown[]
      messages?:     unknown[]
      model?:        string
      maxTokens?:    number
      json?:         boolean
      stream?:       boolean
      toolId?:       string
      kind?:         string
      // ⚠️ skipCaps was here and is GONE. It let the caller disable the cap
      // check from the request body. If you are tempted to re-add a client
      // flag that turns off billing limits: that is the vulnerability.
    }

    if (!ANTHROPIC_KEY) {
      return json({ error: 'Server is missing ANTHROPIC_API_KEY' }, 500)
    }

    const admin    = serviceClient()
    const toolId   = body.toolId ?? 'untagged'
    const kind     = body.kind   ?? 'generate'
    // Clamped. An unbounded max_tokens makes any single request arbitrarily
    // expensive, which defeats a spend cap that can only measure after the fact.
    const maxTok   = Math.min(Math.max(1, body.maxTokens ?? 1024), MAX_TOKENS_CEILING)
    const model    = body.model     ?? 'claude-sonnet-4-6'

    // Authoritative cap check. The browser does its own optimistic check for
    // fast UX; this one is the real thing, and it runs on EVERY request.
    //
    // There is no longer any caller-supplied way around it. Whether a call is
    // exempt from the per-tool COUNT is decided here, from toolId, against
    // TOOL_CAP_EXEMPT. Nothing is exempt from the money.
    try {
      await assertCapsServerSide(admin, user.companyId, toolId)
    } catch (err) {
      const code = (err as Error & { code?: string }).code
      return json(
        { error: (err as Error).message, code },
        429,
      )
    }

    const system = buildSystem(body)

    const anthropicReq = {
      model,
      max_tokens: maxTok,
      system,
      messages:   body.messages ?? [],
      stream:     !!body.stream,
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
        // Required for prompt-caching `cache_control` markers in the
        // system payload. Always-on is safe — for requests that don't
        // use cache_control, the header is a no-op.
        'anthropic-beta':    'prompt-caching-2024-07-31',
        'content-type':      'application/json',
      },
      body: JSON.stringify(anthropicReq),
    })

    // Non-2xx from Anthropic — bubble the message up cleanly so the
    // browser can show it. Don't leak the request body.
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      console.error('[claude] upstream error', upstream.status, text.slice(0, 500))
      return json(
        { error: `Anthropic error ${upstream.status}: ${text.slice(0, 200)}` },
        502,
      )
    }

    // ── Non-streaming path ────────────────────────────────────────────────
    if (!body.stream) {
      const data = await upstream.json() as {
        content?: Array<{ type: string; text?: string }>
        usage?:   { input_tokens?: number; output_tokens?: number }
      }
      const text = (data.content ?? []).map(c => c.text ?? '').join('')
      const tokensIn  = data.usage?.input_tokens  ?? 0
      const tokensOut = data.usage?.output_tokens ?? 0

      // Log usage server-side. Don't await — if it fails, we still want
      // the response to reach the user. Edge functions hold open for
      // background work via waitUntil-style patterns, but a simple
      // fire-and-forget is fine here since the function lifecycle
      // hasn't returned the response yet.
      // ⚠️ ALWAYS RECORD. This was gated on !body.skipCaps, and streamClaude —
      // the Solomon conversation — sends skipCaps:true. So the product's single
      // largest cost driver wrote no usage_event at all, which meant the spend
      // cap summed zero for it and could never fire.
      //
      // The bypass and the blindness compounded: an attacker did not even need
      // the flag to spend freely, because ordinary conversation was already
      // uncounted. Recording is now unconditional; what a call is EXEMPT from
      // is decided by TOOL_CAP_EXEMPT, and that only ever waives the per-tool
      // count, never the money.
      await recordUsage(admin, {
        companyId: user.companyId,
        userId:    user.userId,
        toolId,
        kind,
        tokensIn,
        tokensOut,
      })

      return json({
        text,
        usage: { input_tokens: tokensIn, output_tokens: tokensOut },
      })
    }

    // ── Streaming path ────────────────────────────────────────────────────
    //
    // We tee Anthropic's SSE stream into two readers:
    //   1) `forward` — re-emitted to the client as our normalized SSE
    //   2) `observe` — parsed for usage tokens, fired into usage_events
    //                  on stream close
    //
    // The normalized SSE is deliberately tighter than Anthropic's raw
    // format. The client only cares about text deltas; everything
    // else is noise.

    if (!upstream.body) {
      return json({ error: 'No upstream stream body' }, 502)
    }

    const [forward, observe] = upstream.body.tee()
    const observedUsage: ObservedUsage = { tokensIn: 0, tokensOut: 0 }

    // Kick off the side-channel observer. We *don't* await it here —
    // we want the forward stream to start flowing to the client
    // immediately. The observer runs in parallel; when it finishes
    // (i.e. when the upstream closes), it writes usage_events.
    const observerDone = observeUpstream(observe, observedUsage).then(async () => {
      // Unconditional — see the note on the non-streaming path. This is the
      // branch the Advisor actually uses, so it is the one that was silent.
      await recordUsage(admin, {
        companyId: user.companyId,
        userId:    user.userId,
        toolId,
        kind,
        tokensIn:  observedUsage.tokensIn,
        tokensOut: observedUsage.tokensOut,
      })
    }).catch((err) => {
      console.error('[claude] observer failed:', err)
    })

    // Translate Anthropic SSE → normalized SSE on the fly.
    const enc = new TextEncoder()
    const transformer = new TransformStream<Uint8Array, Uint8Array>({
      start() {
        // initialize per-stream parser state
        (this as unknown as { buffer: string }).buffer = ''
      },
      transform(chunk, controller) {
        const self = this as unknown as { buffer: string }
        self.buffer += new TextDecoder().decode(chunk, { stream: true })
        const events = self.buffer.split('\n\n')
        self.buffer  = events.pop() ?? ''
        for (const ev of events) {
          for (const line of ev.split('\n')) {
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (!payload) continue
            try {
              const data = JSON.parse(payload)
              if (
                data.type === 'content_block_delta' &&
                data.delta?.type === 'text_delta' &&
                typeof data.delta.text === 'string'
              ) {
                const out = `data: ${JSON.stringify({ type: 'chunk', text: data.delta.text })}\n\n`
                controller.enqueue(enc.encode(out))
              }
              if (data.type === 'error') {
                const out = `data: ${JSON.stringify({ type: 'error', message: data.error?.message ?? 'unknown error' })}\n\n`
                controller.enqueue(enc.encode(out))
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      },
      async flush(controller) {
        // Wait for the observer (so usage is written and tokens are
        // accurate) before sending the final `done` event. This keeps
        // the client-side "stream ended" signal tied to the
        // server-side "usage logged" signal.
        try { await observerDone } catch { /* already logged */ }
        const out = `data: ${JSON.stringify({
          type:  'done',
          usage: { input_tokens: observedUsage.tokensIn, output_tokens: observedUsage.tokensOut },
        })}\n\n`
        controller.enqueue(enc.encode(out))
      },
    })

    const sseStream = forward.pipeThrough(transformer)

    return new Response(sseStream, {
      status:  200,
      headers: {
        ...corsHeaders,
        'content-type':  'text/event-stream',
        'cache-control': 'no-cache',
        'connection':    'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[claude]', message)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401 : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
