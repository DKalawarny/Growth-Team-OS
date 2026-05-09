/**
 * Text chunker for RAG indexing.
 *
 * Splits extracted document text into overlapping chunks suitable for
 * embedding. Paragraph-aware: we never cut a sentence mid-word. Overlap
 * ensures that a concept spanning a paragraph boundary appears in full
 * in at least one chunk.
 *
 * Target size: ~1,500 chars ≈ 375 tokens — large enough for meaningful
 * context, small enough that each chunk is topically cohesive.
 * Overlap: ~200 chars — carries the tail of the previous chunk forward
 * so the embedding model sees transitions, not cold starts.
 *
 * Algorithm:
 *   1. Split on blank lines (paragraph boundaries).
 *   2. Accumulate paragraphs until adding the next one would exceed MAX_CHARS.
 *   3. When a chunk is full: emit it, seed the next chunk with OVERLAP_CHARS
 *      of tail context, then continue.
 *   4. Emit the remaining text as the final chunk.
 *   5. Filter out trivially short fragments (< 60 chars) — headers,
 *      page numbers, and whitespace artifacts that would pollute search results.
 */

const MAX_CHARS    = 1_500  // ~375 tokens per chunk
const OVERLAP_CHARS = 200   // carry-forward for boundary continuity
const MIN_CHARS    = 60     // discard fragments shorter than this

/**
 * Split a document string into overlapping text chunks.
 *
 * @param   {string}   text  Full extracted text from a knowledge file
 * @returns {string[]}       Array of chunk strings, ready for embedding
 */
export function chunkText(text) {
  if (!text?.trim()) return []

  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  if (paragraphs.length === 0) return []

  const chunks = []
  let current  = ''  // paragraphs accumulated in this chunk
  let overlap  = ''  // tail of the previous chunk to prepend

  for (const para of paragraphs) {
    // What the chunk would look like if we added this paragraph
    const candidate = [overlap, current, para].filter(Boolean).join('\n\n')

    if (candidate.length > MAX_CHARS && current.length > 0) {
      // This paragraph would overflow — emit what we have
      const toEmit = [overlap, current].filter(Boolean).join('\n\n')
      chunks.push(toEmit)

      // Carry forward tail of current as overlap for the next chunk
      overlap = current.length > OVERLAP_CHARS
        ? current.slice(-OVERLAP_CHARS)
        : current

      // Start fresh with this paragraph
      current = para
    } else {
      // Fits — keep accumulating
      current = current ? `${current}\n\n${para}` : para
    }
  }

  // Emit the last chunk
  if (current.trim()) {
    const toEmit = [overlap, current].filter(Boolean).join('\n\n')
    chunks.push(toEmit)
  }

  return chunks.filter(c => c.trim().length >= MIN_CHARS)
}
