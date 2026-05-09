/**
 * Voyage AI embeddings — vector embedding for RAG chunks.
 *
 * Why Voyage AI:
 *   Voyage is Anthropic's recommended embedding partner. voyage-3 produces
 *   high-quality 1024-dimension vectors optimised for retrieval tasks —
 *   business prose, SOPs, financial documents, and conversational text all
 *   embed accurately. It's fast, cheap, and pairs naturally with Claude.
 *
 *   Model: voyage-3
 *   Dimensions: 1024
 *   Max input: 32,000 tokens per text
 *   Batch size: up to 128 texts per API call
 *   Cost: ~$0.06 per million tokens — indexing a 300-page book costs < $0.01
 *
 * Setup:
 *   Add VITE_VOYAGE_API_KEY to .env.local
 *   Get a key at: https://dash.voyageai.com
 *
 * Graceful degradation:
 *   If the key is missing, embed() returns null and callers skip storing vectors.
 *   The library still uploads and displays fine — RAG search just won't work
 *   until the key is added.
 */

const VOYAGE_KEY = import.meta.env.VITE_VOYAGE_API_KEY
const MODEL      = 'voyage-3'

export const EMBEDDING_DIMS = 1024

/**
 * Embed a single string. Returns a float[] of length 1024, or null on error.
 *
 * @param   {string}         text
 * @returns {number[]|null}
 */
export async function embed(text) {
  if (!VOYAGE_KEY) {
    console.warn('[RAG] VITE_VOYAGE_API_KEY not set — embeddings disabled')
    return null
  }

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${VOYAGE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input: text.slice(0, 120_000), // voyage-3 supports up to 32k tokens (~120k chars)
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Voyage embedding error ${res.status}: ${body.slice(0, 200)}`)
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

  if (!VOYAGE_KEY) {
    console.warn('[RAG] VITE_VOYAGE_API_KEY not set — embeddings disabled')
    return texts.map(() => null)
  }

  const results   = []
  const BATCH_SIZE = 128  // Voyage supports up to 128 inputs per request

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts
      .slice(i, i + BATCH_SIZE)
      .map(t => t.slice(0, 120_000))

    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${VOYAGE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, input: batch }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Voyage batch error ${res.status}: ${body.slice(0, 200)}`)
    }

    const data   = await res.json()
    const sorted = [...data.data].sort((a, b) => a.index - b.index)
    results.push(...sorted.map(d => d.embedding))
  }

  return results
}
