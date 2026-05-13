/**
 * Multimodal RAG — PDF image & graph extraction via Claude Vision.
 *
 * Problem:
 *   Standard text extraction from PDFs only gets the text layer. Charts,
 *   graphs, diagrams, infographics, and scanned pages are invisible to the
 *   text extractor. A client uploads their growth chart or org diagram and
 *   Solomon has no idea it exists.
 *
 * Solution:
 *   1. After text extraction, identify "visual pages" — pages where the text
 *      layer is sparse (< MIN_TEXT_LEN chars), which typically means the page
 *      is dominated by images or was scanned.
 *   2. Render each visual page to a canvas using PDF.js at medium resolution.
 *   3. Skip blank pages (all-white canvases — cover pages, intentional blanks).
 *   4. Send the rendered image through the `claude` Edge Function (Vision-
 *      capable — Anthropic accepts image content blocks on any text model).
 *   5. Ask Claude to describe the visual content in terms useful to a business
 *      advisor: data values, trends, axis labels, process steps, etc.
 *   6. Return the descriptions as text. The indexer embeds them alongside
 *      text chunks so the advisor can find them via semantic search.
 *
 * Cost example: a 50-page report with 8 charts → ~8 vision calls → ~$0.002.
 *
 * Limits:
 *   MAX_IMG_PAGES: never process more than this many visual pages per file.
 *   This caps cost for decks that are entirely image slides (e.g. 80-slide
 *   pitch deck). The first MAX_IMG_PAGES visual pages are indexed; the rest
 *   are silently skipped (text search still works on their text if any).
 *
 * Note: this file used to fetch the Anthropic API directly using a browser-
 * exposed `VITE_ANTHROPIC_API_KEY`. That key has been retired; we now go
 * through the same Edge Function as every other Claude call.
 */

import { callClaude, HAIKU } from '../anthropic'

const RENDER_SCALE  = 1.5      // PDF→canvas scale: quality vs. base64 payload size
const JPEG_QUALITY  = 0.80     // JPEG compression level
const MIN_TEXT_LEN  = 100      // pages with fewer text chars → treat as visual
const MAX_IMG_PAGES = 20       // hard cap on visual pages processed per file

/**
 * Scan a PDF file for visual pages and return Claude Vision descriptions.
 *
 * @param {File}     pdfFile    The original PDF File object (from the upload)
 * @param {string[]} pageTexts  Per-page text already extracted (from extractPdf).
 *                              Index 0 = page 1. Used to identify visual pages.
 *
 * @returns {Array<{ pageNumber: number, description: string }>}
 *          One entry per visual page successfully described. Empty if none found
 *          or if extraction fails. (Auth happens server-side via the Edge
 *          Function — no API key parameter required from the caller.)
 */
export async function extractPdfImages(pdfFile, pageTexts) {
  let pdfjs
  try {
    pdfjs = await loadPdfjs()
  } catch {
    return []  // PDF.js not available — skip image extraction
  }

  const buf = await pdfFile.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise

  const results = []
  let visualPagesFound = 0

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    if (visualPagesFound >= MAX_IMG_PAGES) break

    // Is this page visually dominated (sparse text)?
    const pageText  = (pageTexts[pageNum - 1] ?? '').trim()
    const isVisual  = pageText.length < MIN_TEXT_LEN
    if (!isVisual) continue

    try {
      const base64 = await renderPageToBase64(doc, pageNum)
      if (!base64) continue  // blank page — skip

      const description = await describeWithClaudeVision(base64, pageNum)
      if (description?.trim()) {
        results.push({ pageNumber: pageNum, description: description.trim() })
        visualPagesFound++
      }
    } catch (err) {
      // Don't fail the whole upload over one bad page
      console.warn(`[RAG] Could not process visual page ${pageNum}:`, err)
    }
  }

  return results
}

// ── PDF → canvas → base64 ────────────────────────────────────────────────────

async function renderPageToBase64(doc, pageNum) {
  const page     = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale: RENDER_SCALE })

  const canvas   = document.createElement('canvas')
  canvas.width   = viewport.width
  canvas.height  = viewport.height
  const ctx      = canvas.getContext('2d')

  await page.render({ canvasContext: ctx, viewport }).promise

  // Skip blank pages (e.g. intentional whitespace, cleared pages)
  if (isBlankCanvas(ctx, canvas.width, canvas.height)) return null

  // Trim the data: prefix that toDataURL prepends
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1]
}

/**
 * Heuristic blank-page detector.
 * Samples a grid of pixels — if all are near-white the page is blank.
 */
function isBlankCanvas(ctx, width, height) {
  const SAMPLE_STEP = 20  // check every 20th pixel in each dimension
  const data = ctx.getImageData(0, 0, width, height).data

  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      const idx = (y * width + x) * 4
      const r = data[idx], g = data[idx + 1], b = data[idx + 2]
      // If any sampled pixel is meaningfully non-white, page has content
      if (r < 230 || g < 230 || b < 230) return false
    }
  }
  return true
}

// ── Claude Vision ─────────────────────────────────────────────────────────────

async function describeWithClaudeVision(base64, pageNum) {
  // Goes through the `claude` Edge Function — the function passes
  // `messages` through to Anthropic untouched, so image content blocks
  // work the same as they did when this file called Anthropic directly.
  let text = ''
  try {
    text = await callClaude({
      model:     HAIKU,    // cheapest vision-capable model — adequate for charts
      maxTokens: 450,
      systemPrompt: '',    // no system role on a one-shot vision call
      messages: [{
        role: 'user',
        content: [
          {
            type:   'image',
            source: {
              type:       'base64',
              media_type: 'image/jpeg',
              data:       base64,
            },
          },
          {
            type: 'text',
            text: `This is page ${pageNum} of a business document uploaded to a growth platform. Describe what you see so a business advisor AI can use it as context — the advisor cannot see the image, only your description.

Include:
- Chart or diagram type (bar chart, line graph, org chart, process flow, etc.)
- All visible titles, labels, axis names, and units
- All data values, percentages, and key figures you can read
- Trends, patterns, or notable features (e.g. "revenue doubles from Q2 to Q3")
- Any text annotations, captions, or callouts

Be specific and complete. Max 400 words. If the page is not a meaningful business visual (e.g. it's decorative or a logo), say "decorative page — no business data".`,
          },
        ],
      }],
    })
  } catch (err) {
    console.warn(`[RAG] Vision call failed for page ${pageNum}:`, err.message)
    return null
  }

  // Discard decorative pages — no signal for the advisor
  if (text.toLowerCase().includes('decorative page')) return null

  return text
}

// ── PDF.js loader (shared with knowledgeExtract.js) ──────────────────────────

let _pdfjsPromise = null
function loadPdfjs() {
  if (!_pdfjsPromise) {
    _pdfjsPromise = (async () => {
      const pdfjs      = await import('pdfjs-dist/build/pdf.mjs')
      const workerUrl  = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      return pdfjs
    })()
  }
  return _pdfjsPromise
}
