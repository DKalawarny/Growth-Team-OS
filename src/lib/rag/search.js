/**
 * Semantic search over the knowledge base using pgvector cosine similarity.
 *
 * Flow:
 *   1. Embed the query string with the same model used at index time
 *      (OpenAI text-embedding-3-small → 1536-dim vector)
 *   2. Call the search_knowledge_chunks Supabase RPC (HNSW cosine search)
 *   3. Group chunks by source file for cleaner context presentation
 *   4. Return a formatted context block ready to inject into a prompt
 *
 * The threshold (default 0.30) filters out weakly related chunks. Cosine
 * similarity of 0.30 on business text roughly means "same general topic".
 * 0.50+ means "directly about this". 0.70+ means "very closely related".
 * Tune down to 0.20 to cast wider nets; up to 0.45 for precision.
 *
 * Fallback: if the OpenAI key is missing or the RPC fails, returns an empty
 * array. The caller (advisorContext) falls back to naive injection.
 */

import { supabase } from '../supabase'
import { embed }    from './embeddings'

const DEFAULT_LIMIT     = 8     // top-k chunks to retrieve
const DEFAULT_THRESHOLD = 0.30  // cosine similarity floor
const MAX_CHARS_PER_RESULT = 1_200  // cap per chunk in the formatted output

/**
 * Find the most relevant knowledge chunks for a query.
 *
 * @param {string} companyId  Scopes search to this company's documents
 * @param {string} query      The user's question or topic (natural language)
 * @param {object} [opts]
 * @param {number} [opts.limit=8]       Max chunks to return
 * @param {number} [opts.threshold=0.30] Minimum similarity score
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   knowledge_file_id: string,
 *   content: string,
 *   chunk_type: string,
 *   image_path: string|null,
 *   similarity: number
 * }>>}
 */
export async function searchKnowledge(companyId, query, {
  limit     = DEFAULT_LIMIT,
  threshold = DEFAULT_THRESHOLD,
} = {}) {
  if (!query?.trim() || !companyId) return []

  try {
    const queryEmbedding = await embed(query)
    if (!queryEmbedding) return []  // no API key — graceful empty

    const { data, error } = await supabase.rpc('search_knowledge_chunks', {
      p_company_id: companyId,
      p_embedding:  queryEmbedding,
      p_limit:      limit,
      p_threshold:  threshold,
    })

    if (error) {
      console.warn('[RAG] Search RPC error:', error.message)
      return []
    }

    return data ?? []
  } catch (err) {
    console.warn('[RAG] Search failed — returning empty:', err)
    return []
  }
}

/**
 * Format RAG search results into the knowledge_files prompt shape used by
 * advisorContext.budgetedKnowledge.
 *
 * Chunks from the same source file are merged (they're already ordered by
 * similarity). The result looks like a condensed knowledge_file entry:
 *   { title, kind, notes, excerpt }
 * ...so it slots into the existing prompt without any other changes.
 *
 * @param {Array}  chunks       Raw results from searchKnowledge()
 * @param {Array}  fileMetadata Rows from knowledge_files (id, title, kind, notes)
 *
 * @returns {Array<{ title: string, kind: string, notes: string|null, excerpt: string, similarity: number }>}
 */
export function formatRagResults(chunks, fileMetadata = []) {
  if (!chunks.length) return []

  // Build a quick lookup: file_id → { title, kind, notes }
  const metaById = new Map(fileMetadata.map(f => [f.id, f]))

  // Group chunks by source file, preserving order (best similarity first)
  const byFile = new Map()
  for (const chunk of chunks) {
    const key = chunk.knowledge_file_id
    if (!byFile.has(key)) byFile.set(key, [])
    byFile.get(key).push(chunk)
  }

  const results = []
  for (const [fileId, fileChunks] of byFile) {
    const meta      = metaById.get(fileId) ?? {}
    const topScore  = Math.max(...fileChunks.map(c => c.similarity))

    // Merge chunks from this file, separated by a divider
    const combined  = fileChunks
      .map(c => c.content.slice(0, MAX_CHARS_PER_RESULT))
      .join('\n\n— — —\n\n')

    // Flag if any retrieved chunk is a vision description
    const hasImages = fileChunks.some(c => c.chunk_type === 'image')

    results.push({
      title:      meta.title   ?? 'Untitled document',
      kind:       meta.kind    ?? 'general',
      notes:      meta.notes   ?? (hasImages ? 'Includes chart/graph descriptions.' : null),
      excerpt:    combined,
      similarity: topScore,
      _rag:       true,  // sentinel — lets the prompt distinguish RAG vs naive
    })
  }

  // Sort by best similarity across the file's chunks
  return results.sort((a, b) => b.similarity - a.similarity)
}
