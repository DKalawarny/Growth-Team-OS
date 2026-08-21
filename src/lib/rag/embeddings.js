/**
 * OpenAI embeddings — vector embedding for RAG chunks.
 *
 * We use OpenAI's text-embedding-3-small because:
 *
 *   1. It's the model every embedding column in our migrations is sized for
 *      (vector(1536) — see migrations 001, 012, 013, 022). Switching models
 *      means a column-retype migration and a re-embedding pass, neither of
 *      which is currently worth doing for marginal recall gains.
 *
 *   2. Cost: $0.02 per million tokens. Indexing a 300-page book is well
 *      under a cent. Cheaper than Voyage AI's voyage-3 ($0.06/MT) and
 *      basically negligible at our scale.
 *
 *   3. Recall on business prose (SOPs, financial docs, conversational text)
 *      is good enough — the difference between text-embedding-3-small and
 *      a state-of-the-art retrieval model rarely shows up in real Q&A
 *      against a single tenant's document library.
 *
 *   Model:      text-embedding-3-small
 *   Dimensions: 1536 (matches our pgvector column types)
 *   Max input:  8,191 tokens per text (~32k chars)
 *   Batch size: up to 2,048 texts per API call
 *
 * Setup:
 *   Set the OPENAI_API_KEY Supabase secret and deploy the `embed`
 *   function. Never a VITE_ var — those ship to the browser.
 *   Get a key at: https://platform.openai.com/api-keys
 *
 * Graceful degradation:
 *   If the secret is unset the function answers 503, embed() returns null,
 *   and callers skip storing vectors. The library still uploads and displays
 *   fine — RAG search just won't work until the secret is set. This is the same pattern used by
 *   the rest of the RAG layer (search.js, indexer.js).
 */

// The key used to live here as import.meta.env.VITE_OPENAI_API_KEY, which
// Vite inlines into the bundle — so it would have shipped to every visitor and
// shown in their network tab. Same failure that retired VITE_ANTHROPIC_API_KEY
// from this repo. It now lives as a Supabase secret behind the `embed` Edge
// Function and never reaches a browser.
//
// Absence still degrades quietly: if the function is not deployed or the
// secret is unset, embed() returns null and callers skip storing vectors,
// exactly as before. Retrieval is off; nothing crashes.
import { supabase } from '../supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const EMBED_URL    = `${SUPABASE_URL}/functions/v1/embed`

export const EMBEDDING_DIMS = 1536

// Conservative per-input cap. text-embedding-3-small accepts up to 8,191
// tokens (~32k chars); we slice well below that so a single oversized
// chunk can't fail the whole batch. The chunker tries to keep chunks ~375
// tokens, so this is just a safety belt.
const MAX_CHARS_PER_INPUT = 30_000

// Batch size — OpenAI accepts up to 2,048 inputs per call. We use 128 to
// match Voyage's batching behaviour and to keep request bodies under
// ~1MB on long chunks.
const BATCH_SIZE = 128


/**
 * Post one batch to the Edge Function. Returns embeddings in input order, or
 * an array of nulls when embeddings are switched off server-side.
 */
async function callEmbedFunction(inputs) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.warn('[RAG] no session — embeddings skipped')
    return inputs.map(() => null)
  }

  const res = await fetch(EMBED_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ texts: inputs }),
  })

  // 503 means the OPENAI_API_KEY secret isn't set. That is a configuration
  // state, not an error — retrieval is simply off, same as before.
  if (res.status === 503) {
    console.warn('[RAG] embeddings not configured server-side — retrieval disabled')
    return inputs.map(() => null)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`embed function error ${res.status}: ${body.slice(0, 200)}`)
  }

  const { embeddings } = await res.json()
  return Array.isArray(embeddings) ? embeddings : inputs.map(() => null)
}

/**
 * Embed a single string. Returns a float[] of length 1536, or null when
 * embeddings are unavailable.
 *
 * @param   {string}         text
 * @returns {number[]|null}
 */
export async function embed(text) {
  const [vec] = await callEmbedFunction([text.slice(0, MAX_CHARS_PER_INPUT)])
  return vec ?? null
}


/**
 * Embed multiple strings in batched API calls.
 * Returns embeddings in the same order as the input.
 *
 * @param   {string[]}          texts
 * @returns {(number[]|null)[]}
 */
export async function embedBatch(texts) {
  if (!texts.length) return []

  const results = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts
      .slice(i, i + BATCH_SIZE)
      .map(t => t.slice(0, MAX_CHARS_PER_INPUT))
    results.push(...await callEmbedFunction(batch))
  }
  return results
}
