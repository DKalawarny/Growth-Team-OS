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
 *   Add VITE_OPENAI_API_KEY to .env.local
 *   Get a key at: https://platform.openai.com/api-keys
 *
 * Graceful degradation:
 *   If the key is missing, embed() returns null and callers skip storing
 *   vectors. The library still uploads and displays fine — RAG search just
 *   won't work until the key is added. This is the same pattern used by
 *   the rest of the RAG layer (search.js, indexer.js).
 */

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY
const MODEL      = 'text-embedding-3-small'

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
 * Embed a single string. Returns a float[] of length 1536, or null on
 * config error (missing key).
 *
 * @param   {string}         text
 * @returns {number[]|null}
 */
export async function embed(text) {
  if (!OPENAI_KEY) {
    console.warn('[RAG] VITE_OPENAI_API_KEY not set — embeddings disabled')
    return null
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input: text.slice(0, MAX_CHARS_PER_INPUT),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI embedding error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.data[0].embedding   // number[]
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

  if (!OPENAI_KEY) {
    console.warn('[RAG] VITE_OPENAI_API_KEY not set — embeddings disabled')
    return texts.map(() => null)
  }

  const results = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts
      .slice(i, i + BATCH_SIZE)
      .map(t => t.slice(0, MAX_CHARS_PER_INPUT))

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, input: batch }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`OpenAI batch embedding error ${res.status}: ${body.slice(0, 200)}`)
    }

    const data   = await res.json()
    // OpenAI returns results with an `index` field. Sort to guarantee
    // we return embeddings in input order even if the API reorders them.
    const sorted = [...data.data].sort((a, b) => a.index - b.index)
    results.push(...sorted.map(d => d.embedding))
  }

  return results
}
