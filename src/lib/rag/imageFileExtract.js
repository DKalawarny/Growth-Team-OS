/**
 * Standalone image → text, via Claude Vision.
 *
 * ⭐ WHY THIS EXISTS AS A SEPARATE FILE
 *
 * rag/imageExtract.js already did the hard half of this: it renders sparse PDF
 * pages to base64 and asks Claude Vision to describe them for the advisor. That
 * path has been in the product for months. What it could not do was accept an
 * image somebody uploaded directly — it only ever saw pages inside a PDF.
 *
 * So an owner photographing a whiteboard, or scanning a handbook page on a
 * phone, hit a flat refusal from a product that was demonstrably capable of
 * reading it. This wires the existing capability to the obvious input.
 *
 * ⚠️ Anthropic accepts jpeg, png, gif and webp. HEIC — the default on every
 * iPhone — is NOT accepted, and it is exactly what an owner photographing a
 * whiteboard will produce. It is converted to JPEG in the browser first;
 * see toSupportedBase64.
 */

import { callClaude, SONNET } from '../anthropic'

// What Anthropic will take directly.
const NATIVE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Long edge cap. Vision does not benefit from more, and the base64 payload
// grows quadratically — a 12MP phone photo is ~4MB of base64 before this.
const MAX_EDGE = 1600
const JPEG_Q   = 0.85

/**
 * Convert any browser-decodable image into a base64 JPEG/PNG Anthropic accepts.
 * Returns { base64, mediaType } or null if the browser cannot decode it.
 *
 * ⭐ Exported because the Advisor chat sends images to Solomon DIRECTLY — he
 * looks at the photo rather than reading a description of it — and needs the
 * same HEIC handling and the same long-edge cap. Duplicating this was the
 * obvious mistake: the iPhone problem is easy to forget and expensive to
 * rediscover.
 */
export async function toSupportedBase64(file) {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return null   // HEIC on a browser without decode support, corrupt file, etc.

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width  * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  // Re-encode as JPEG regardless of input, so HEIC and friends come out the
  // other side as something Anthropic will take.
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_Q)
  return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' }
}

/**
 * Describe an uploaded image so the advisor can use it as context.
 *
 * @param   {File} file
 * @returns {Promise<string|null>} description, or null if it could not be read
 */
export async function extractImage(file) {
  const type = (file.type || '').toLowerCase()

  let payload
  if (NATIVE_TYPES.includes(type) && file.size < 3 * 1024 * 1024) {
    // Small and already supported — send as-is rather than re-encoding.
    const buf = await file.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    payload = { base64: btoa(binary), mediaType: type }
  } else {
    payload = await toSupportedBase64(file)
  }

  if (!payload) return null

  const text = await callClaude({
    model:     SONNET,
    maxTokens: 700,
    systemPrompt: '',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: payload.mediaType, data: payload.base64 } },
        {
          type: 'text',
          text: `This image was uploaded to a business advisory platform by the owner of the business. Transcribe and describe it so an advisor who cannot see it can use it as context.

- If it contains handwriting, printed text, a form or a table, TRANSCRIBE IT as faithfully as you can, preserving structure. Say where you are unsure rather than guessing.
- If it is a chart or diagram, give the type, every label and axis, the data values you can read, and the trend.
- If it is a photograph of a whiteboard, notes or a document page, treat it as text first and description second.
- Note anything that looks like a figure, date, name or deadline — those matter most.

DIGITS ARE THE POINT, AND A MISREAD ONE IS WORSE THAN A MISSING ONE.
A wrong figure here does not stay here — it enters the owner's document library
as a fact his advisor will later quote back to him as his own number.

- Read every digit character by character. Do not infer a number from what would
  be plausible, and never tidy one up.
- Where a character is genuinely ambiguous, write it as best you can and add
  "(unclear)" immediately after that value. An unclear figure is useful; a
  confident wrong one is not.
- Do not restate a date or an amount in a different format later in your answer.
  Re-typing is where a good read turns into a bad one.

Be complete rather than brief. If the image carries no business information, say "no business content".`,
        },
      ],
    }],
  }).catch(() => null)

  if (!text) return null
  if (text.toLowerCase().includes('no business content')) return null
  return text
}
