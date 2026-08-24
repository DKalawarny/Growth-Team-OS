/**
 * Smoke tests — the Claude request body.
 *
 * Why this file exists: `runToolCall` accepted `promptKey` / `stableContext`
 * and then never put them in the request. Every tool page had switched to
 * promptKey when the prompts moved server-side, so the edge function received
 * no prompt of any kind and fell through to its legacy branch — meaning every
 * tool generate ran with a system prompt of "" plus "respond with valid JSON
 * only". The model still returned parseable JSON and the pages still rendered
 * it, so nothing looked wrong from either end.
 *
 * That is the failure mode worth a test: not a crash, not an error, just a
 * request quietly missing the thing that makes the answer worth anything. The
 * assertions below check the WIRE, because both halves of this were internally
 * consistent and only the bytes between them disagreed.
 *
 * Run:  npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
  },
}))

vi.mock('./usage', () => ({
  assertWithinToolCap:  async () => {},
  assertWithinSpendCap: async () => {},
  trackClaudeUsage:     () => {},
}))

vi.mock('./responseCache', () => ({
  getCachedResponse: async () => null,
  setCachedResponse: async () => {},
}))

const { runToolCall, callClaude } = await import('./anthropic')

/** The body of the most recent fetch, parsed. */
function lastRequestBody() {
  const call = globalThis.fetch.mock.calls.at(-1)
  return JSON.parse(call[1].body)
}

beforeEach(() => {
  globalThis.fetch = vi.fn(async () => ({
    ok:   true,
    json: async () => ({ text: '{"summary":"ok"}' }),
  }))
})

describe('runToolCall — the tool pages\' path', () => {
  it('sends promptKey and stableContext to the edge function', async () => {
    await runToolCall({
      companyId:     'company-1',
      userId:        'user-1',
      toolId:        'cash-flow',
      promptKey:     'CASH_FLOW_PROMPT',
      stableContext: '\n\nBUSINESS_CONTEXT:\n{"business":{"name":"Acme"}}',
      messages:      [{ role: 'user', content: '{"starting_balance":45000}' }],
      json:          true,
    })

    const body = lastRequestBody()
    expect(body.promptKey).toBe('CASH_FLOW_PROMPT')
    expect(body.stableContext).toContain('Acme')
  })

  it('never sends an empty system prompt when a promptKey was given', async () => {
    // The regression itself. With promptKey dropped, the body carried neither
    // promptKey nor systemBlocks nor a non-empty systemPrompt, and the edge
    // function's legacy branch turned that into "" — a Solomon with no
    // instructions, which still answers.
    await runToolCall({
      companyId: 'company-1',
      toolId:    'decision',
      promptKey: 'DECISION_PROMPT',
      messages:  [{ role: 'user', content: '{}' }],
      json:      true,
    })

    const body = lastRequestBody()
    const hasSomePrompt =
      Boolean(body.promptKey) ||
      Boolean(body.systemBlocks?.length) ||
      Boolean(body.systemPrompt)
    expect(hasSomePrompt).toBe(true)
  })

  it('still supports the inline systemPrompt path', async () => {
    // Newsletter builds its prompt in the page (the tone is interpolated into
    // the string), so it is the one caller that has no promptKey to send.
    await runToolCall({
      companyId:    'company-1',
      toolId:       'team-newsletter',
      systemPrompt: 'x'.repeat(600),
      messages:     [{ role: 'user', content: '{}' }],
    })

    const body = lastRequestBody()
    expect(body.promptKey).toBeUndefined()
    // Long prompts ship as blocks so the cache marker can ride along.
    expect(body.systemBlocks?.[0]?.text).toHaveLength(600)
    expect(body.systemBlocks?.[0]?.cache_control?.type).toBe('ephemeral')
  })
})

describe('callClaude', () => {
  it('forwards promptKey and the volatile half separately', async () => {
    await callClaude({
      promptKey:      'MORNING_OPENER_PROMPT',
      stableContext:  '\n\nBUSINESS_CONTEXT:\n{}',
      systemVolatile: '\n\nTODAY: Monday',
      messages:       [{ role: 'user', content: 'open' }],
    })

    const body = lastRequestBody()
    expect(body.promptKey).toBe('MORNING_OPENER_PROMPT')
    expect(body.volatileContext).toContain('Monday')
  })
})

describe('tool definitions', () => {
  it('are a stable module constant — they sit inside the cached prefix', async () => {
    // Anthropic renders `tools` before `system`, so the tool list is part of
    // the prompt-cache key. Rebuilt or reordered per turn, it would throw the
    // cached prefix away on every single Advisor message while the code still
    // claimed a ~90% saving. Same shape of bug as the one caching had before.
    const { SOLOMON_TOOLS } = await import('./solomonTools')
    const first  = JSON.stringify(SOLOMON_TOOLS)
    const second = JSON.stringify((await import('./solomonTools')).SOLOMON_TOOLS)
    expect(second).toBe(first)
    expect(SOLOMON_TOOLS.map(t => t.name)).toEqual(['search_library', 'run_tool'])
  })
})
