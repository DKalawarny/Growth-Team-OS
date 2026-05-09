/**
 * Text extraction for uploaded knowledge files.
 *
 * Runs client-side so we don't need an edge function / backend queue for the
 * MVP. pdfjs-dist is lazy-loaded on first PDF upload — it's ~1MB, so eagerly
 * bundling it would hurt initial page load for owners who never upload a PDF.
 *
 * Return shape:
 *   {
 *     text:     string | null   — extracted plain text, or null on failure
 *     status:   'ready' | 'failed'
 *     reason:   string | null   — human-readable failure reason (e.g. "Password-protected PDF")
 *   }
 *
 * Supported formats:
 *   - text/plain           → native File.text()
 *   - text/markdown        → native File.text()
 *   - application/pdf      → pdfjs-dist (lazy)
 *   - .docx                → mammoth (lazy) — extracts body text, strips formatting
 *   - .xlsx / .xls         → xlsx library
 */

const MAX_EXTRACTED_CHARS = 250_000  // ~50 pages of dense PDF; cap to keep DB rows bounded

export async function extractText(file) {
  if (!file) return fail('No file')

  // Dispatch by MIME type, fall back to extension for cases where MIME is
  // generic (e.g. .md uploaded as application/octet-stream).
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()

  try {
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return ready(truncate(await extractPdf(file)))
    }
    if (
      name.endsWith('.docx') ||
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return ready(truncate(await extractDocx(file)))
    }
    if (
      type.startsWith('text/') ||
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.markdown') ||
      name.endsWith('.csv')
    ) {
      return ready(truncate(await file.text()))
    }
    if (
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      type === 'application/vnd.ms-excel'
    ) {
      return ready(truncate(await extractExcel(file)))
    }
    return fail(`Unsupported file type: ${type || 'unknown'}. Upload .pdf, .docx, .xlsx, .csv, .txt, or .md.`)
  } catch (err) {
    console.error('[knowledgeExtract]', err)
    return fail(err?.message || 'Could not read the file.')
  }
}

/**
 * Extract plain text from a .docx (Office Open XML) file using mammoth.
 *
 * Mammoth is lazy-loaded so it doesn't inflate the initial bundle — it's
 * ~500KB and only needed when someone uploads a Word file.
 *
 * What gets extracted:
 *   - All body text, headings, bullet points, table cells
 *   - Paragraph structure is preserved with newlines
 *
 * What gets stripped (intentionally):
 *   - Formatting (bold, italic, font sizes)
 *   - Images embedded in the document (future: could pass to Claude Vision)
 *   - Headers/footers (mammoth ignores these by default)
 *   - Comments and tracked changes
 *
 * Note: mammoth only handles .docx (Office Open XML format). The old binary
 * .doc format (pre-2007) is not supported — those files should be re-saved
 * as .docx first.
 */
async function extractDocx(file) {
  const { extractRawText } = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await extractRawText({ arrayBuffer })

  // mammoth may surface warnings (e.g. unsupported features) — log but don't fail
  if (result.messages?.length) {
    console.info('[knowledgeExtract] mammoth messages:', result.messages)
  }

  const text = result.value || ''
  if (!text.trim()) {
    throw new Error('Word document appears to be empty or contains only images.')
  }
  return text
}

/**
 * Extract all sheets from an Excel file as readable text.
 * Each sheet is converted to CSV and labelled by sheet name so
 * Claude knows which tab each block of data came from.
 */
async function extractExcel(file) {
  const { read, utils } = await import('xlsx')
  const buf  = await file.arrayBuffer()
  const wb   = read(buf, { type: 'array' })

  const parts = []
  for (const sheetName of wb.SheetNames) {
    const ws  = wb.Sheets[sheetName]
    const csv = utils.sheet_to_csv(ws, { blankrows: false })
    if (csv.trim()) {
      parts.push(`=== Sheet: ${sheetName} ===\n${csv}`)
    }
  }

  if (parts.length === 0) return ''
  return parts.join('\n\n')
}

/**
 * Extract all visible text from a PDF, page by page, preserving reading order.
 *
 * pdf.js returns per-page `items` with transform matrices; we concatenate the
 * `.str` fields in reader order and insert a blank line between pages. Good
 * enough for SOPs and contracts — would fall short on multi-column magazine
 * layouts, which is not our target input.
 */
async function extractPdf(file) {
  const pdfjs = await loadPdfjs()
  const buf   = await file.arrayBuffer()
  const doc   = await pdfjs.getDocument({ data: buf }).promise

  const pages = []
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page    = await doc.getPage(i)
    const content = await page.getTextContent()
    const str     = content.items.map(it => it.str || '').join(' ')
    pages.push(str.trim())
  }
  return pages.filter(Boolean).join('\n\n')
}

/**
 * Lazy-load pdf.js and configure its worker. Cached so subsequent uploads
 * don't re-import.
 *
 * The Vite + pdfjs-dist combo is famously finicky about the worker path. We
 * point it at the ESM worker bundled inside the package and let Vite resolve
 * it as a URL import. This matches the pdfjs-dist v4+ recipe.
 */
let _pdfjsPromise = null
function loadPdfjs() {
  if (!_pdfjsPromise) {
    _pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
      // `?url` suffix tells Vite to emit the worker as a static asset and
      // return its URL — the recommended pattern for web workers.
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      return pdfjs
    })()
  }
  return _pdfjsPromise
}

function truncate(s) {
  if (!s) return ''
  return s.length > MAX_EXTRACTED_CHARS
    ? `${s.slice(0, MAX_EXTRACTED_CHARS)}\n\n[… truncated at ${MAX_EXTRACTED_CHARS.toLocaleString()} characters]`
    : s
}

function ready(text) {
  return { text: text || '', status: 'ready', reason: null }
}
function fail(reason) {
  return { text: null, status: 'failed', reason }
}
