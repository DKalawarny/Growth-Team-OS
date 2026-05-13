/**
 * compress.js — Haiku-based retrieval compressor
 *
 * The cost lever for retrieval-grounded answers.
 *
 * Without compression:
 *   Solomon (Sonnet) reads 6-10 retrieved chunks at ~1,200 chars each =
 *   ~3,000-5,000 tokens of context per turn. He uses maybe 20% of it
 *   directly; the rest is "just-in-case" we passed to him. At Sonnet
 *   input rates (~$3/MT) that's ~$0.012-0.015 per turn just on retrieval
 *   context.
 *
 * With compression:
 *   We send the same chunks to Haiku ($0.80/MT input, ~4× cheaper) with
 *   one instruction: "distill these into the bullets directly relevant
 *   to the question." Haiku returns ~600-1,000 tokens of focused
 *   excerpts. THAT goes into the Sonnet prompt. Total cost drops to
 *   roughly:
 *     Haiku compression: ~3-5k tokens × $0.80/MT = ~$0.003
 *     Sonnet w/ compressed context: ~1k tokens × $3/MT = ~$0.003
 *     ────────────────────────────────────────────────────────
 *     ~$0.006 per turn vs. ~$0.013 — about 55% cheaper.
 *
 * It also makes Solomon's answers BETTER, not just cheaper — he stops
 * scanning irrelevant chunks and gets to write his answer from a focused
 * brief. The compressor is the editorial pass; Solomon is the writer.
 *
 * ----------------------------------------------------------------------
 * When NOT to compress
 *
 *   - Chunks < ~1,500 tokens total. Compression has overhead (one extra
 *     API round-trip, ~200-400ms). For small contexts you spend more time
 *     and equal money — skip it.
 *
 *   - Very short questions where Solomon should just see raw doc text.
 *     The compressor introduces a paraphrase layer; for direct quotes
 *     ("read me the exact SOP step") raw chunks are better.
 *
 *   - When OpenAI key is missing (no embeddings → no chunks → nothing
 *     to compress). Compression is a no-op in that branch.
 * ----------------------------------------------------------------------
 */

import { callClaude, HAIKU } from '../anthropic'

// Minimum total chunk size that justifies the compression round-trip.
// Below this, just pass the raw chunks through.
const MIN_CHARS_TO_COMPRESS = 6_000

// Cap on compressed output length. Haiku is happy to write long; we want
// terse bullets that slot into a system prompt without ballooning it.
const MAX_COMPRESSED_CHARS = 4_000


/**
 * Compress retrieved safety chunks down to a focused brief.
 *
 * @param {object} opts
 * @param {string} opts.query           The user's question — drives what's "relevant"
 * @param {Array}  opts.safetyChunks    From searchSafetyDocs() — owner's vault hits
 * @param {Array}  [opts.knowledgeChunks] From searchKnowledge() — general docs hits
 * @param {Array}  [opts.regulatorySources] From regulatory_sources table — URL registry rows
 *
 * @returns {Promise<{
 *   brief: string|null,           // The compressed brief, or null if nothing to compress
 *   compressed: boolean,          // Did we actually call Haiku?
 *   raw_chars: number,            // Total char count of input chunks
 *   brief_chars: number,          // Char count of brief (0 if null)
 * }>}
 *
 * Falls back gracefully: if Haiku errors or returns empty, returns
 * { brief: null, compressed: false } and the caller can use raw chunks.
 */
export async function compressSafetyContext({
  query,
  safetyChunks      = [],
  knowledgeChunks   = [],
  regulatorySources = [],
}) {
  // Total raw size — used to decide if compression is worth the round-trip.
  const safetyChars      = safetyChunks.reduce((n, c) => n + (c.content?.length ?? 0), 0)
  const knowledgeChars   = knowledgeChunks.reduce((n, c) => n + (c.content?.length ?? 0), 0)
  const rawChars         = safetyChars + knowledgeChars

  // Empty input — nothing to do.
  if (rawChars === 0) {
    return { brief: null, compressed: false, raw_chars: 0, brief_chars: 0 }
  }

  // Small input — not worth the round-trip. Caller passes raw chunks.
  if (rawChars < MIN_CHARS_TO_COMPRESS) {
    return { brief: null, compressed: false, raw_chars: rawChars, brief_chars: 0 }
  }

  // ── Build the compressor prompt ──────────────────────────────────────
  //
  // Two design choices worth noting:
  //
  //   1. We tell Haiku WHO the audience is (Solomon answering a small-business
  //      owner). That keeps the bullets in a register Solomon can quote
  //      directly without re-paraphrasing.
  //
  //   2. We tell Haiku to PRESERVE attribution — every bullet must say
  //      which doc/regulation it came from. Solomon needs the citation
  //      info downstream; if compression strips it, his answer becomes
  //      ungrounded again.

  const systemPrompt = `You are an editorial pass for a retrieval system. A safety question came in, and we pulled excerpts from the owner's compliance vault and a regulatory URL registry. Your job is to distill the excerpts into a focused brief that the downstream assistant can quote from to answer the question.

RULES
- Output 4-10 bullets, each one fact or quote relevant to the question.
- Every bullet MUST start with the source in [brackets] so the downstream assistant can cite — e.g. "[Owner SOP — Confined Space Entry]" or "[WorkSafeBC OHS Reg Part 9]".
- Quote or closely paraphrase. Do NOT add information that isn't in the excerpts.
- If a regulatory URL is provided, include it in the bracket: "[WorkSafeBC OHS Reg Part 9 — https://www.worksafebc.com/...]".
- Skip excerpts that don't actually answer the question. Better to return 4 sharp bullets than 10 padded ones.
- If NONE of the excerpts are relevant to the question, return the single line: NO_RELEVANT_CONTEXT
- No preamble, no closing remarks. Just the bullets.`

  const userMessage = buildCompressorPayload({
    query,
    safetyChunks,
    knowledgeChunks,
    regulatorySources,
  })

  try {
    const brief = await callClaude({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 1_200,         // ~4,800 chars cap — generous but bounded
      model:     HAIKU,         // the whole point of this module
    })

    const trimmed = (brief ?? '').trim()
    if (!trimmed || trimmed === 'NO_RELEVANT_CONTEXT') {
      return { brief: null, compressed: true, raw_chars: rawChars, brief_chars: 0 }
    }

    // Hard cap — protects the downstream prompt budget even if Haiku
    // ignored the "4-10 bullets" instruction.
    const final = trimmed.length > MAX_COMPRESSED_CHARS
      ? trimmed.slice(0, MAX_COMPRESSED_CHARS) + '\n[… truncated]'
      : trimmed

    return {
      brief:       final,
      compressed:  true,
      raw_chars:   rawChars,
      brief_chars: final.length,
    }
  } catch (err) {
    // Don't break the conversation if Haiku has a bad day. Caller falls
    // back to passing raw chunks (slightly more expensive, still works).
    console.warn('[RAG][compress] Haiku compression failed — falling back to raw chunks:', err)
    return { brief: null, compressed: false, raw_chars: rawChars, brief_chars: 0 }
  }
}


/**
 * Build the user-message payload for the compressor.
 *
 * Format is deliberately simple: a question line, then three labelled
 * sections. Haiku does fine with this — no XML, no JSON, just headers.
 * (XML helps when there are many sections or nested structure; this is
 * three flat lists.)
 */
function buildCompressorPayload({ query, safetyChunks, knowledgeChunks, regulatorySources }) {
  const lines = []
  lines.push(`QUESTION: ${query}`)
  lines.push('')

  if (safetyChunks.length) {
    lines.push('OWNER SAFETY VAULT EXCERPTS:')
    for (const c of safetyChunks) {
      const src = c.title ?? 'Untitled vault doc'
      const type = c.doc_type ? ` (${c.doc_type})` : ''
      lines.push(`--- [${src}${type}] (similarity ${(c.similarity * 100).toFixed(0)}%) ---`)
      lines.push(c.content ?? '')
      lines.push('')
    }
  }

  if (knowledgeChunks.length) {
    lines.push('GENERAL KNOWLEDGE LIBRARY EXCERPTS:')
    for (const c of knowledgeChunks) {
      // knowledgeChunks come from search_knowledge_chunks — they have
      // knowledge_file_id, not a title. Caller is responsible for not
      // passing these in if no title metadata is available, OR for
      // attaching a _title field before calling. We render whichever
      // we get; Haiku will use [Untitled] if nothing else.
      const src = c._title ?? c.title ?? 'Untitled knowledge doc'
      lines.push(`--- [${src}] (similarity ${(c.similarity * 100).toFixed(0)}%) ---`)
      lines.push(c.content ?? '')
      lines.push('')
    }
  }

  if (regulatorySources.length) {
    lines.push('REGULATORY URL REGISTRY (authoritative sources to cite):')
    for (const r of regulatorySources) {
      lines.push(`--- [${r.authority_name} — ${r.regulation_name}] ---`)
      lines.push(`URL: ${r.canonical_url}`)
      if (r.summary) lines.push(`Summary: ${r.summary}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
