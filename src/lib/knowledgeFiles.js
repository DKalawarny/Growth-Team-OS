import { supabase }              from './supabase'
import { extractText }           from './knowledgeExtract'
import { indexKnowledgeFile }    from './rag/indexer'

/**
 * Knowledge file lifecycle helpers.
 *
 * Happy-path upload flow:
 *   1. Sanitize filename, build storage path '<company_id>/<uuid>-<name>'
 *   2. Upload binary to the 'knowledge-files' Storage bucket
 *   3. Extract text client-side (PDF via pdf.js, .txt/.md natively)
 *   4. Insert a row into knowledge_files with title/path/text/status
 *
 * If step 3 fails, we still insert the row with status='failed' and a reason
 * in the UI. The file remains in Storage so the owner can try again or just
 * know "this is attached but not readable by Claude".
 *
 * If step 2 fails, we never insert a row — no ghost rows pointing at missing
 * blobs.
 *
 * Delete is symmetric: row first (fast, RLS-gated), then object (best-effort).
 * If the object delete fails we swallow the error — the row is gone, the
 * Storage object becomes an orphan which a nightly cleanup job could handle.
 */

const BUCKET            = 'knowledge-files'
const MAX_BYTES         = 10 * 1024 * 1024  // 10MB
const ALLOWED_PREFIXES  = ['application/pdf', 'text/', 'application/vnd.openxmlformats']
const ALLOWED_EXTS      = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.csv', '.xlsx', '.xls']

export const KIND_OPTIONS = [
  { value: 'general',   label: 'General' },
  { value: 'sop',       label: 'SOP / Process' },
  { value: 'financial', label: 'Financial' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'hr',        label: 'HR / People' },
  { value: 'legal',     label: 'Legal / Contract' },
  { value: 'sales',     label: 'Sales' },
]

/**
 * Accept-reject a file up front. Reasons returned are shown to the owner so
 * they know why an upload was blocked before we even try Storage.
 */
export function validateFile(file) {
  if (!file) return 'No file selected.'
  if (file.size > MAX_BYTES) {
    return `File is ${(file.size / 1024 / 1024).toFixed(1)}MB — max is ${MAX_BYTES / 1024 / 1024}MB.`
  }
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  const okType = ALLOWED_PREFIXES.some(p => type.startsWith(p))
  const okExt  = ALLOWED_EXTS.some(e => name.endsWith(e))
  if (!okType && !okExt) {
    return 'Supported formats: PDF, Word (.docx), Excel, CSV, TXT, and Markdown.'
  }
  return null
}

/**
 * Upload + extract + insert. Returns the new row on success.
 *
 * @param {File}   file       the File selected by the user
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} opts.userId
 * @param {string} opts.title        owner-provided title (defaults to filename)
 * @param {string} opts.kind         one of KIND_OPTIONS values
 * @param {string} opts.notes        optional owner note
 * @param {string} opts.milestoneId  optional — links file to a specific milestone
 * @param {(p:number)=>void} opts.onProgress 0..100 — coarse: 20 upload, 60 extract, 100 done
 */
export async function uploadKnowledgeFile(file, opts) {
  const { companyId, userId, title, kind, notes, milestoneId, onProgress } = opts
  const report = (p) => { try { onProgress?.(p) } catch { /* ignore */ } }

  const validationError = validateFile(file)
  if (validationError) throw new Error(validationError)
  if (!companyId) throw new Error('Missing company context.')

  report(5)

  // Path: '<company_id>/<uuid>-<name>'. The first folder segment is the
  // company_id, which Storage RLS checks. UUID prefix prevents collisions
  // when two uploads share the same filename.
  const safeName = sanitizeFilename(file.name)
  const storagePath = `${companyId}/${crypto.randomUUID()}-${safeName}`

  // --- 1. Upload to Storage ------------------------------------------------
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert:      false,
    })
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
  report(25)

  // --- 2. Extract text (never throws — returns {status, text, reason}) ----
  const extraction = await extractText(file)
  report(70)

  // --- 3. Insert DB row ----------------------------------------------------
  const { data, error: insertErr } = await supabase
    .from('knowledge_files')
    .insert({
      company_id:     companyId,
      uploaded_by:    userId,
      title:          (title || '').trim() || file.name,
      notes:          (notes || '').trim() || null,
      file_path:      storagePath,
      mime_type:      file.type || null,
      size_bytes:     file.size,
      kind:           kind || 'general',
      extracted_text: extraction.text,
      status:         extraction.status,
      milestone_id:   milestoneId ?? null,
    })
    .select()
    .single()

  if (insertErr) {
    // Row failed → clean up the storage object so we don't leave orphans.
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => null)
    throw new Error(`Save failed: ${insertErr.message}`)
  }
  report(95)

  // --- 4. RAG indexing (async, non-blocking) --------------------------------
  // Chunk + embed the extracted text (and visual pages for PDFs) so the
  // Advisor can do semantic search instead of naive injection. We don't await
  // this on the upload critical path — the file is usable immediately for
  // naive context injection. Indexing completes in ~2–10s in the background.
  if (extraction.status === 'ready' && extraction.text) {
    indexKnowledgeFile(data, file).catch(err =>
      console.warn('[RAG] Background indexing failed for', data.title, err)
    )
  }

  report(100)

  // Pass back the extraction reason (if any) so the UI can surface
  // "uploaded but we couldn't read it" without a second query.
  return { ...data, _extractionReason: extraction.reason }
}

/** List all knowledge files attached to a specific milestone, newest first. */
export async function listFilesForMilestone(milestoneId) {
  const { data, error } = await supabase
    .from('knowledge_files')
    .select('id, title, notes, file_path, mime_type, size_bytes, kind, status, created_at')
    .eq('milestone_id', milestoneId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** List all knowledge files for the current company, newest first. */
export async function listKnowledgeFiles(companyId) {
  const { data, error } = await supabase
    .from('knowledge_files')
    .select('id, title, notes, file_path, mime_type, size_bytes, kind, status, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Fetch a single file with its extracted_text (for detail view). */
export async function getKnowledgeFile(id) {
  const { data, error } = await supabase
    .from('knowledge_files')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/** Delete row + best-effort remove the Storage object. */
export async function deleteKnowledgeFile(id, filePath) {
  const { error } = await supabase.from('knowledge_files').delete().eq('id', id)
  if (error) throw error
  if (filePath) {
    await supabase.storage.from(BUCKET).remove([filePath]).catch(() => null)
  }
}

/**
 * Generate a short-lived signed URL for in-browser preview/download. Signed
 * URLs expire after a minute by default so shared links can't leak beyond
 * the session.
 */
export async function getSignedUrl(filePath, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
/**
 * Filename sanitization for Storage keys. Supabase Storage accepts a wide
 * set of chars, but spaces and exotic unicode sometimes break signed URLs
 * and CDN caching. Keep ASCII + a safe punctuation subset.
 */
function sanitizeFilename(name) {
  return name
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')         // anything not word/dot/hyphen → _
    .replace(/_+/g, '_')                // collapse runs
    .replace(/^_+|_+$/g, '')            // trim
    .slice(0, 120)
    || 'file'
}
