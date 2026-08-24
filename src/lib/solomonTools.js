/**
 * solomonTools.js — the tools Solomon can run himself.
 *
 * Until now Solomon could only SEED a tool: the launcher dropped a sentence
 * into the composer and he answered it conversationally. He could talk about
 * a thirteen-week cash position; he could not produce one. That was the widest
 * distance between what the product is and what /about says it is.
 *
 * Two tools, and each one has to earn its place against the same test the rest
 * of the product is held to — does it tell Solomon something true about the
 * business, or does it act on what Solomon said?
 *
 *   search_library   tells him something true — the library, searched again,
 *                    mid-conversation. The advisor context already runs one
 *                    semantic search per turn, but only ever against the
 *                    owner's own last message. Four turns into a conversation
 *                    the retrieval is answering a question nobody is asking
 *                    any more.
 *
 *   run_tool         acts on what he said — the real tool, the real prompt,
 *                    the real structured artifact, saved to the Library where
 *                    the existing renderer already knows how to draw it.
 *
 * ── Where the loop runs ──────────────────────────────────────────────────────
 *
 * In the browser, not the Edge Function. Every tool here is something the app
 * already does with the owner's own session: RLS scopes it, the existing tool
 * prompts drive it, the existing caps meter it. Running the loop server-side
 * would mean rebuilding all of that against the service-role key — more code,
 * and a strictly wider blast radius for a bug.
 *
 * The tool NAMES come from the model; the executors do not. Anything not in
 * RUNNABLE below is refused here, so a hallucinated tool name is a tool_result
 * saying "no such tool", not an action.
 *
 * ── Costs ────────────────────────────────────────────────────────────────────
 *
 * A run_tool call is a full tool generate: it burns one of the ten monthly runs
 * for that tool, exactly as clicking the tool page would, and it is metered by
 * the same spend cap. That is deliberate. Running it from the chat is a
 * different door onto the same thing, not a way around the meter.
 *
 * ── Deliberately absent ──────────────────────────────────────────────────────
 *
 * `team-newsletter` is not runnable yet: its prompt is still built inline in
 * Newsletter.jsx with the tone interpolated into the string, so there is no
 * promptKey to point at. Moving it into _shared/prompts.ts (with tone as an
 * input) is what unblocks it — until then Solomon writes the update in prose
 * rather than pretending to run the tool.
 *
 * `gbp-optimizer` is left out on purpose too — it is legacy and surfaced
 * nowhere, and whether it survives at all is an open decision.
 */

import { supabase } from './supabase'
import { runToolCall, SONNET, HAIKU } from './anthropic'
import { searchKnowledge, formatRagResults } from './rag/search'
import { isCapExceeded, isSpendCapExceeded } from './usage'

// How much of a tool's output we hand back to Solomon. The artifact itself is
// saved whole; this only bounds what re-enters the conversation, because the
// result is replayed on every subsequent turn of the same exchange.
const MAX_RESULT_CHARS = 8000

// Library search — deliberately tighter than the per-turn context search.
// This one is Solomon going to look something up on purpose, so precision
// matters more than coverage.
const SEARCH_LIMIT     = 6
const SEARCH_THRESHOLD = 0.30
const SEARCH_EXCERPT   = 1200

/**
 * Everything Solomon may run, and what running it means.
 *
 * `promptKey` resolves server-side — the prompt text never crosses the wire,
 * same as every other tool call in the app.
 *
 * `title(result, inputs)` builds the Library title. These mirror the
 * buildTitle() helpers on the tool pages so an artifact Solomon made and one
 * the owner made sit side by side in the Library without looking like they
 * came from different products.
 *
 * ⚠️ Some titles come from the FORM, not the result — the hiring and offer
 * prompts never echo the role or offer name back in their JSON. On the tool
 * pages the form field supplies it; here the equivalent is whatever Solomon
 * passed in `inputs`, which is why both are checked.
 */
const RUNNABLE = {
  'cash-flow': {
    label:     'Building the 13-week cash flow',
    promptKey: 'CASH_FLOW_PROMPT',
    model:     HAIKU,
    maxTokens: 4000,
    title:     r => `Cash Flow${r?.runway_weeks != null ? ` · ${r.runway_weeks}wk runway` : ''} · ${monthYear()}`,
  },
  'cfo-dashboard': {
    label:     'Reading the numbers',
    promptKey: 'CFO_DASHBOARD_PROMPT',
    model:     SONNET,
    maxTokens: 3500,
    title:     (r, i) => `CFO · ${(r?.period_label || i?.period_label || 'Period').trim()}${r?.health_grade ? ` · ${r.health_grade}` : ''}`,
  },
  'hiring-scorecard': {
    label:     'Building the role scorecard',
    promptKey: 'HIRING_SCORECARD_PROMPT',
    model:     HAIKU,
    maxTokens: 2000,
    title:     (r, i) => `${(i?.role_title || r?.role_title || 'Role').trim()} · ${monthYear()}`,
  },
  'org-chart': {
    label:     'Mapping the team',
    promptKey: 'ORG_CHART_PROMPT',
    model:     SONNET,
    maxTokens: 3500,
    title:     r => `Org Chart${r?.horizon_label ? ` · ${r.horizon_label}` : ''} · ${monthYear()}`,
  },
  'offer-builder': {
    label:     'Working out the offer',
    promptKey: 'OFFER_BUILDER_PROMPT',
    model:     SONNET,
    maxTokens: 3000,
    title:     (r, i) => `${(i?.offer_name || r?.headline || 'Offer').trim().slice(0, 80)} · ${monthYear()}`,
  },
  'decision': {
    label:     'Arguing it more than one way',
    promptKey: 'DECISION_PROMPT',
    model:     SONNET,
    maxTokens: 2600,
    title:     r => (r?.decision || 'A decision').slice(0, 120),
  },
  'rocks-tracker': {
    label:     'Setting the quarter',
    promptKey: 'ROCKS_TRACKER_PROMPT',
    model:     HAIKU,
    maxTokens: 3500,
    title:     (r, i) => `Rocks · ${(r?.quarter_label || i?.quarter_label || 'Quarter').trim()}${
      r?.theme && r.theme.trim().length <= 40 ? ` · ${r.theme.trim()}` : ''
    }`,
  },
  'exit-readiness': {
    label:     'Scoring what a buyer would see',
    promptKey: 'EXIT_READINESS_PROMPT',
    model:     SONNET,
    maxTokens: 3000,
    title:     r => `Exit Readiness${r?.grade ? ` · ${r.grade}` : ''} · ${monthYear()}`,
  },
}

export const RUNNABLE_TOOL_IDS = Object.keys(RUNNABLE)

/**
 * The tool definitions sent to Anthropic.
 *
 * ⚠️ This array is part of the cached prompt prefix — Anthropic renders tools
 * BEFORE the system blocks, so the cache entry covers it. It must stay a
 * module-level constant with stable key order. Building it per-turn, or
 * sorting it differently, silently throws away the ~90% input saving on every
 * Advisor message.
 */
export const SOLOMON_TOOLS = [
  {
    name: 'search_library',
    description:
      "Search the owner's uploaded documents for something specific — a contract clause, a number in a P&L, " +
      'a line in an SOP or a handbook. ' +
      'You are already given the most relevant passages for the owner\'s latest message, so do not use this ' +
      'to re-fetch what is already in your context. Use it when the conversation has moved on to something ' +
      'those passages do not cover, or when you need to check a specific detail before you state it. ' +
      'Returns excerpts with the document each came from. Returns nothing when the library holds nothing ' +
      'relevant — which is a real answer, not a failure.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'What to look for, in full words. Search is semantic, so write it as the question you are ' +
            'actually trying to answer rather than as keywords.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'run_tool',
    description:
      'Run one of the owner\'s tools and get its finished result back. The artifact is saved to their ' +
      'Library automatically, formatted, where they can open it any time.\n\n' +
      'Run one when the owner asks for the thing the tool produces — a projection, a scorecard, a ' +
      'dashboard, a plan — rather than for your opinion about it. If they are thinking out loud, or ' +
      'the question is answerable in three sentences, just answer it. A tool run costs them one of ' +
      'their monthly runs for that tool, so it is not free and it is not the default.\n\n' +
      'Available tools:\n' +
      '  cash-flow         13-week cash projection: weekly balances, the lowest point, runway, actions.\n' +
      '  cfo-dashboard     This period\'s numbers read back in plain English, with a health grade.\n' +
      '  hiring-scorecard  Turns "I need someone" into a role scorecard you can interview against.\n' +
      '  org-chart         The team the business needs next, and the order to build it in.\n' +
      '  offer-builder     Scopes an offer and prices it.\n' +
      '  decision          Argues a hard decision several ways and names where they conflict.\n' +
      '  rocks-tracker     The two or three priorities that actually matter this quarter.\n' +
      '  exit-readiness    Scores the business against what a buyer cares about.\n\n' +
      'Each tool reads the same business context you have, so you do not need to restate it. Pass ' +
      'anything the owner has told you IN THIS CONVERSATION that the tool would otherwise have to ' +
      'guess at — a balance, a date, a name, a constraint. Do not invent inputs to fill the form: a ' +
      'number you made up will come back looking like one of theirs.',
    input_schema: {
      type: 'object',
      properties: {
        tool: {
          type: 'string',
          enum: RUNNABLE_TOOL_IDS,
          description: 'Which tool to run.',
        },
        brief: {
          type: 'string',
          description:
            'What the owner is actually asking for, in a sentence or two, in your own words. This is ' +
            'what the tool works from, so say what matters and what they are worried about.',
        },
        inputs: {
          type: 'object',
          description:
            'Optional. Specifics the owner has given you that the tool would otherwise assume — ' +
            'starting_balance, comfort_threshold, role_title, period_label, offer_name, quarter_label, ' +
            'and so on. Only include values they actually stated.',
          additionalProperties: true,
        },
      },
      required: ['tool', 'brief'],
    },
  },
]

/**
 * Run one tool call and produce the block that goes back to Anthropic.
 *
 * Never throws for an ordinary failure. A cap hit, a bad tool name, a model
 * that returned unparseable JSON — each comes back as a tool_result carrying
 * the reason, so Solomon can tell the owner what happened in his own words.
 * Letting it throw would kill the whole turn and lose the answer he had
 * already started writing.
 *
 * @param {object} args
 * @param {{id: string, name: string, input: object}} args.toolUse
 * @param {string} args.companyId
 * @param {string} args.userId
 * @param {object} args.context  The advisor context already built for this turn
 * @returns {Promise<{
 *   block:    object,                     // tool_result block for the next request
 *   label:    string,                     // what to show the owner while it runs
 *   artifact: {id, tool_id, title}|null,  // saved document, if one was produced
 * }>}
 */
export async function runSolomonTool({ toolUse, companyId, userId, context }) {
  const { id, name, input } = toolUse
  const label = describeToolUse(toolUse)

  try {
    const result = name === 'search_library'
      ? await doSearchLibrary({ companyId, input })
      : name === 'run_tool'
        ? await doRunTool({ companyId, userId, context, input })
        : { error: `No such tool: ${name}.` }

    return {
      block: {
        type:        'tool_result',
        tool_use_id: id,
        content:     truncate(JSON.stringify(result.payload ?? result)),
        ...(result.error ? { is_error: true } : {}),
      },
      label,
      artifact: result.artifact ?? null,
    }
  } catch (err) {
    // Only unexpected failures land here — the handlers below convert the
    // expected ones themselves.
    console.error('[solomonTools]', name, err)
    return {
      block: {
        type:        'tool_result',
        tool_use_id: id,
        content:     JSON.stringify({ error: err?.message || 'The tool failed to run.' }),
        is_error:    true,
      },
      label,
      artifact: null,
    }
  }
}

/** Human-readable line shown in the thread while a tool runs. */
export function describeToolUse({ name, input }) {
  if (name === 'search_library') return 'Searching your library'
  if (name === 'run_tool')       return RUNNABLE[input?.tool]?.label ?? 'Running a tool'
  return 'Working'
}

// ── search_library ────────────────────────────────────────────────────────────

async function doSearchLibrary({ companyId, input }) {
  const query = String(input?.query ?? '').trim()
  if (!query) return { error: 'No search query was given.' }

  const chunks = await searchKnowledge(companyId, query, {
    limit:     SEARCH_LIMIT,
    threshold: SEARCH_THRESHOLD,
  })

  if (!chunks.length) {
    // Distinguish "nothing matched" from "nothing to match against" — they
    // lead to different answers, and only one of them is worth an apology.
    const { count } = await supabase
      .from('knowledge_files')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'ready')

    return {
      payload: {
        query,
        results: [],
        note: (count ?? 0) === 0
          ? 'The library is empty — nothing has been uploaded yet.'
          : `Nothing in the ${count} document(s) in the library matched this closely enough to quote.`,
      },
    }
  }

  // formatRagResults needs the file metadata to put a title on each hit;
  // without it every excerpt comes back as "Untitled document".
  const fileIds = [...new Set(chunks.map(c => c.knowledge_file_id))]
  const { data: files } = await supabase
    .from('knowledge_files')
    .select('id, title, kind, notes')
    .in('id', fileIds)

  const results = formatRagResults(chunks, files ?? []).map(r => ({
    document:   r.title,
    kind:       r.kind,
    relevance:  Number(r.similarity.toFixed(2)),
    excerpt:    r.excerpt.slice(0, SEARCH_EXCERPT),
  }))

  return { payload: { query, results } }
}

// ── run_tool ──────────────────────────────────────────────────────────────────

async function doRunTool({ companyId, userId, context, input }) {
  const toolId = String(input?.tool ?? '')
  const spec   = RUNNABLE[toolId]
  if (!spec) {
    return { error: `${toolId || 'That'} is not a tool that can be run. Runnable: ${RUNNABLE_TOOL_IDS.join(', ')}.` }
  }

  const brief  = String(input?.brief ?? '').trim()
  const extras = (input?.inputs && typeof input.inputs === 'object') ? input.inputs : {}

  let raw
  try {
    raw = await runToolCall({
      companyId,
      userId,
      toolId,
      kind:          'generate',
      model:         spec.model,
      promptKey:     spec.promptKey,
      stableContext: context ? `\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}` : '',
      messages: [{
        role: 'user',
        content: JSON.stringify({
          ...extras,
          brief,
          // The tool prompts each expect "a short form". Naming where the
          // request came from lets them say so in their own output rather
          // than describing inputs the owner never typed.
          requested_via: 'solomon',
          instructions:
            'This was asked for in conversation, not typed into a form. Work from BUSINESS_CONTEXT and ' +
            'the brief. Where a value is missing, make a reasonable assumption and NAME IT in your output.',
        }),
      }],
      maxTokens: spec.maxTokens,
      json:      true,
      // The chat is a conversation: the owner asking the same thing twice
      // means something changed, not that they want the cached answer.
      noCache:   true,
    })
  } catch (err) {
    if (isCapExceeded(err) || isSpendCapExceeded(err)) {
      return { error: err.message, payload: { ran: false, reason: err.message } }
    }
    throw err
  }

  let result
  try {
    result = JSON.parse(raw)
  } catch {
    return { error: `The ${toolId} tool returned something unreadable. Nothing was saved.` }
  }

  // Save it. A tool run that vanishes when the chat scrolls away is not a tool
  // run — the Library already has a formatted renderer for every tool_id here.
  const title = safeTitle(spec, result, extras, toolId)
  const { data: doc, error: saveErr } = await supabase
    .from('documents')
    .insert({
      company_id:  companyId,
      user_id:     userId,
      tool_id:     toolId,
      title,
      tags:        [],
      input_data:  { ...extras, brief, requested_via: 'solomon' },
      output_data: result,
    })
    .select('id')
    .single()

  if (saveErr) console.warn('[solomonTools] could not save artifact:', saveErr.message)

  return {
    payload: {
      tool:             toolId,
      saved_to_library: !saveErr,
      document_title:   title,
      result,
    },
    artifact: saveErr || !doc ? null : { id: doc.id, tool_id: toolId, title },
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function monthYear() {
  return new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function safeTitle(spec, result, inputs, toolId) {
  try {
    const t = spec.title(result, inputs)
    return (t && String(t).trim()) || `${toolId} · ${monthYear()}`
  } catch {
    return `${toolId} · ${monthYear()}`
  }
}

function truncate(text) {
  if (text.length <= MAX_RESULT_CHARS) return text
  // Truncating JSON leaves it unparseable, so say so in plain text rather
  // than handing back something that looks like data and is not.
  return `${text.slice(0, MAX_RESULT_CHARS)}\n\n[Result truncated — the full version is saved in the Library.]`
}
