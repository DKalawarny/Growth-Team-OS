/**
 * Images in the Solomon conversation.
 *
 * ⭐ WHY DIRECTLY, AND NOT AS A DESCRIPTION
 *
 * The Library already turns an uploaded image into text (rag/imageFileExtract):
 * Haiku describes it, the description gets indexed, and Solomon reads the
 * description. That is right for a document going into long-term storage.
 *
 * It is wrong for "look at this and tell me what you think." An owner holding
 * up a supplier's quote, a photo of a cracked weld, a competitor's flyer or a
 * spreadsheet on a screen wants an opinion on THAT, now — and every pass
 * through a describer loses the thing he actually wanted looked at. So the
 * chat sends the real image and Solomon looks at it himself.
 *
 * ⚠️ WHAT THIS DOES NOT DO, AND THE HONEST REASON
 *
 * The image is sent on the turn it is attached, and it is NOT replayed on
 * later turns. `chat_messages.content` is text, and the conversation history
 * we resend each turn is text-only, so re-attaching every past image would
 * grow the payload without limit — an owner who shared four photos would pay
 * for all four on every subsequent message, forever.
 *
 * What carries forward instead is Solomon's own reply, which describes what he
 * saw, plus a `[image: filename]` marker on the owner's turn so the reference
 * is not silently missing. That is a real limitation: ask him something new
 * about an old photo and he is working from his own earlier words, not the
 * picture. Worth revisiting if it bites — the fix is a per-message image
 * reference in the DB, which is a migration.
 */

import { supabase } from './supabase'
import { toSupportedBase64, extractImage } from './rag/imageFileExtract'
import { indexKnowledgeFile } from './rag/indexer'

const BUCKET = 'knowledge-files'

// Anthropic's per-image ceiling is generous, but a phone photo is the common
// case and toSupportedBase64 already caps the long edge at 1600px. This guard
// is for the pathological input — a 60MB scan — so the browser refuses before
// it tries to hold it in memory.
const MAX_BYTES = 20 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = 'image/*'

export function isImageFile(file) {
  return !!file && (file.type || '').toLowerCase().startsWith('image/')
}

/**
 * Prepare an attached image for a chat turn.
 *
 * Returns { block, storagePath, previewUrl, name } — `block` is the Anthropic
 * content block, `previewUrl` is an object URL for immediate display.
 *
 * Throws a plain-English error the composer can show as-is.
 */
export async function prepareChatImage(file, { companyId }) {
  if (!isImageFile(file)) throw new Error('That is not an image.')
  if (file.size > MAX_BYTES) {
    throw new Error(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — keep it under ${MAX_BYTES / 1024 / 1024}MB.`)
  }

  // ⚠️ HEIC is the default on every iPhone and Anthropic will not take it.
  // toSupportedBase64 re-encodes to JPEG in a canvas, which also applies the
  // long-edge cap. Skipping this is how "why won't it read my photo" happens.
  const payload = await toSupportedBase64(file)
  if (!payload) {
    throw new Error('Your browser could not read that image. Try a screenshot or a JPEG.')
  }

  return {
    name:       file.name || 'image',
    previewUrl: URL.createObjectURL(file),
    // Stored so the bubble can still show the image after a reload. Best
    // effort: a failed upload must not stop the owner getting his answer,
    // which is the whole point of attaching it.
    storagePath: await storeImage(file, companyId).catch(() => null),
    block: {
      type: 'image',
      source: { type: 'base64', media_type: payload.mediaType, data: payload.base64 },
    },
  }
}

async function storeImage(file, companyId) {
  if (!companyId) return null
  const safe = (file.name || 'image').replace(/[^\w.-]+/g, '_').slice(-80)
  const path = `${companyId}/chat/${crypto.randomUUID()}-${safe}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert:      false,
  })
  if (error) return null
  return path
}

/** Signed URL for displaying a stored chat image. Null if it cannot be made. */
export async function chatImageUrl(storagePath, expiresInSeconds = 3600) {
  if (!storagePath) return null
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds)
  return data?.signedUrl ?? null
}

/**
 * Keep a shared image: promote it from a chat attachment into the Library.
 *
 * ⭐ This is also the fix for the limitation at the top of this file. A chat
 * image is seen once and never replayed; a LIBRARY image is described,
 * chunked and embedded, so `search_library` can pull it back weeks later. A
 * quote the owner showed Solomon in August becomes something he can find in
 * October — which is the difference between a glance and a memory.
 *
 * ⚠️ The blob is COPIED to a fresh library path rather than the row pointing
 * at the chat object. They have separate lifecycles: deleting the Library
 * entry calls deleteKnowledgeFile, which removes the storage object — and if
 * both pointed at the same blob, tidying the Library would silently blank the
 * image still sitting in the conversation.
 */
export async function saveChatImageToLibrary({ path, name, companyId, userId }) {
  if (!path || !companyId) throw new Error('Nothing to save.')

  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path)
  if (dlErr || !blob) throw new Error('Could not read the image back from storage.')

  const safe = (name || 'image').replace(/[^\w.-]+/g, '_').slice(-80)
  const libraryPath = `${companyId}/${crypto.randomUUID()}-${safe}`

  const { error: copyErr } = await supabase.storage.from(BUCKET).copy(path, libraryPath)
  if (copyErr) {
    // Older storage-js, or a copy that the policy refuses — re-upload instead.
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(libraryPath, blob, { contentType: blob.type || 'image/jpeg', upsert: false })
    if (upErr) throw new Error('Could not save a copy of the image.')
  }

  // Vision description, so it is searchable as text rather than an opaque blob.
  const file = new File([blob], name || 'image', { type: blob.type || 'image/jpeg' })
  const description = await extractImage(file).catch(() => null)

  const { data: row, error: insErr } = await supabase
    .from('knowledge_files')
    .insert({
      company_id:     companyId,
      uploaded_by:    userId,
      title:          name || 'Shared image',
      notes:          'Shared with Solomon in conversation.',
      file_path:      libraryPath,
      mime_type:      blob.type || 'image/jpeg',
      size_bytes:     blob.size,
      kind:           'general',
      extracted_text: description,
      // Honest status: an image Solomon could not describe is stored but not
      // readable, and the Library already renders that state correctly.
      status:         description ? 'ready' : 'failed',
    })
    .select()
    .single()

  if (insErr) {
    await supabase.storage.from(BUCKET).remove([libraryPath]).catch(() => null)
    throw new Error(`Could not save: ${insErr.message}`)
  }

  if (description) {
    indexKnowledgeFile(row, file).catch(err =>
      console.warn('[chatImages] indexing failed for', row.title, err),
    )
  }

  return row
}
