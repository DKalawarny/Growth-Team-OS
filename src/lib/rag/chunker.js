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
 *   1. If the text is delimiter-separated (CSV/TSV), chunk it by ROWS and
 *      repeat the header line on every chunk — see splitDelimited.
 *   2. Otherwise split on blank lines (paragraph boundaries).
 *   3. Any single paragraph longer than MAX_CHARS is hard-split before it
 *      reaches the accumulator — see splitOversized.
 *   4. Accumulate paragraphs until adding the next one would exceed MAX_CHARS.
 *   5. When a chunk is full: emit it, seed the next chunk with OVERLAP_CHARS
 *      of tail context, then continue.
 *   6. Emit the remaining text as the final chunk.
 *   7. Filter out trivially short fragments (< 60 chars) — page numbers and
 *      whitespace artifacts that would pollute search results.
 *
 * ⭐ WHY STEPS 1 AND 3 EXIST — a silent, total retrieval failure
 *
 * This used to be steps 2, 4, 5, 6, 7 only, and it had a load-bearing
 * assumption nobody had written down: that documents contain blank lines.
 *
 * A CSV contains none. So `split(/\n{2,}/)` returned the ENTIRE FILE as one
 * "paragraph", and the overflow branch is guarded on `current.length > 0` —
 * which is false on the first paragraph. The whole file therefore fell through
 * to the accumulator and was emitted as a single chunk. A 500-row Jobber
 * export measured 29,266 chars ≈ 7,300 tokens in one chunk.
 *
 * That is not merely a large chunk. The embed function slices its input at
 * 8,000 chars, and gte-small's window is ~512 tokens, so the stored vector
 * described roughly the first 7% of the file. The remaining rows sat in the
 * database as text that no query could ever retrieve — the file looked
 * perfectly indexed ("1 text chunk"), and quietly was not.
 *
 * ⚠️ It is not a CSV problem, it is a no-blank-lines problem: continuous PDF
 * extractions and single-block exports hit it the same way. Step 3 is the real
 * fix and applies to everything; step 1 additionally keeps CSV rows meaningful,
 * because a chunk of bare values with no column names tells a retriever nothing.
 */

const MAX_CHARS    = 1_500  // ~375 tokens per chunk
const OVERLAP_CHARS = 200   // carry-forward for boundary continuity
const MIN_CHARS    = 60     // discard fragments shorter than this

/**
 * Does this look like delimiter-separated data?
 *
 * ⚠️ Deliberately strict, because a false positive silently mangles an
 * ordinary document: prose routed down the CSV path gets its first sentence
 * promoted to a "header" and repeated on every chunk. The first version of
 * this checked only that the first six lines agreed on a field count, and
 * three ordinary sentences each containing two commas were enough to trip it:
 *
 *   "It was cold, wet, and late."      -> 3 fields
 *   "He went home, tired, and slept."  -> 3 fields
 *   "The next day, again, it rained."  -> 3 fields
 *
 * Two guards, either of which alone kills that example:
 *
 *   1. NO BLANK LINES. An exported CSV has none anywhere — that is exactly why
 *      the paragraph splitter failed on it. Prose almost always has them.
 *   2. AT LEAST 5 consistent rows, not 3. Prose holding an identical delimiter
 *      count across five consecutive lines is vanishingly rare.
 *
 * Consequence worth knowing: a multi-sheet Excel extraction is labelled
 * "=== Sheet: X ===" with blank lines between sheets, so it takes the prose
 * path and does not get the repeated header. It is still correctly sized —
 * splitOversized handles it — just without the per-chunk column names.
 */
function detectDelimiter(text) {
  if (/\n\s*\n/.test(text)) return null      // guard 1 — real CSVs have no blank lines

  const lines = text.split('\n').filter(l => l.trim()).slice(0, 12)
  if (lines.length < 5) return null          // guard 2 — need a real run of rows

  for (const d of [',', '\t', ';']) {
    const counts = lines.map(l => l.split(d).length)
    if (counts[0] < 2) continue
    if (counts.every(c => c === counts[0])) return d
  }
  return null
}

/**
 * Chunk delimiter-separated text by rows, repeating the header on each chunk.
 *
 * The header is what makes a row interpretable. Without it a retrieved chunk
 * reads `Riverside plaza,4200,2026-08-24,paid` — four values and no way to
 * know which is the amount and which is the date.
 */
function splitDelimited(text) {
  const lines  = text.split('\n').filter(l => l.trim())
  const header = lines[0]
  const rows   = lines.slice(1)
  if (!rows.length) return [text]

  // Leave room for the header we prepend to every chunk.
  const budget = Math.max(200, MAX_CHARS - header.length - 1)

  const chunks = []
  let current = []
  let size = 0

  for (const row of rows) {
    if (size + row.length + 1 > budget && current.length) {
      chunks.push([header, ...current].join('\n'))
      current = []
      size = 0
    }
    current.push(row)
    size += row.length + 1
  }
  if (current.length) chunks.push([header, ...current].join('\n'))

  return chunks
}

/**
 * Hard-split a paragraph that is on its own larger than a chunk.
 *
 * Tries line breaks first, then sentence ends, and only then cuts on a
 * character boundary — the last of those is ugly but still far better than
 * emitting a block the embedder will silently truncate.
 */
function splitOversized(para) {
  if (para.length <= MAX_CHARS) return [para]

  const units = para.includes('\n')
    ? para.split('\n')
    : para.split(/(?<=[.!?])\s+/)

  const out = []
  let current = ''

  for (const unit of units) {
    // A single unit longer than a chunk: cut it on character boundaries.
    if (unit.length > MAX_CHARS) {
      if (current) { out.push(current); current = '' }
      for (let i = 0; i < unit.length; i += MAX_CHARS) {
        out.push(unit.slice(i, i + MAX_CHARS))
      }
      continue
    }
    if (current.length + unit.length + 1 > MAX_CHARS && current) {
      out.push(current)
      current = unit
    } else {
      current = current ? `${current}\n${unit}` : unit
    }
  }
  if (current) out.push(current)
  return out
}

/**
 * Split a document string into overlapping text chunks.
 *
 * @param   {string}   text  Full extracted text from a knowledge file
 * @returns {string[]}       Array of chunk strings, ready for embedding
 */
export function chunkText(text) {
  if (!text?.trim()) return []

  // ── 1. Delimiter-separated data takes the row-wise path ───────────────────
  if (detectDelimiter(text)) {
    return splitDelimited(text.trim()).filter(c => c.trim().length >= MIN_CHARS)
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    // ── 3. No paragraph may exceed a chunk on its own ───────────────────────
    .flatMap(splitOversized)

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
