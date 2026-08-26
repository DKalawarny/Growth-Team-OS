/**
 * "Has this changed in Drive since I imported it?"
 *
 * ⭐ WHY THIS SHAPE, AND NOT A SYNC
 *
 * Google Drive and OneDrive are a one-time picker import: the owner chooses
 * files, they are copied into the Library, and nothing re-checks them. Daniel
 * asked the obvious question — wouldn't constant access be better, so it's
 * always current? — and the honest answer is no, for three reasons that are
 * worth keeping written down:
 *
 *   1. THE CONSENT IS A DIFFERENT THING. The picker asks permission for the
 *      files he picked. Live sync needs a standing, account-wide "read all of
 *      your Google Drive, forever" grant — shown to a business owner at the
 *      exact moment he is deciding whether to trust us with his books, and a
 *      far larger breach surface if we are ever compromised.
 *   2. MORE IS WORSE FOR RETRIEVAL. Syncing everything indexes everything:
 *      holiday photos, the kids' schoolwork, six drafts of one estimate.
 *      Semantic search degrades as the corpus fills with noise. That the owner
 *      curates the set is a feature.
 *   3. THE FAILURE MODE IS SILENT. Change tokens, webhooks, a server job,
 *      re-extraction, token refresh — and when it breaks it breaks quietly,
 *      leaving stale data looking fresh. This product has been bitten by silent
 *      failure repeatedly.
 *
 * So: no standing access, and no pretence of currency. The owner asks, we
 * check, we tell him honestly which copies have moved on. One metadata call
 * per imported file, no LLM, no cost worth measuring.
 *
 * ⚠️ Checking REQUIRES a fresh token, because we deliberately store none. That
 * is not a wart to design around — it is the guarantee. There is no moment at
 * which this app can read his Drive without him just having said so.
 */

import { supabase } from './supabase'
import { getAccessToken } from './googleDriveImport'

/** Imported files we hold a provider id for. */
export async function listImportedFiles(companyId, provider = 'google') {
  const { data, error } = await supabase
    .from('knowledge_files')
    .select('id, title, source_provider, source_file_id, source_modified_at, created_at')
    .eq('company_id', companyId)
    .eq('source_provider', provider)
    .not('source_file_id', 'is', null)
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Compare our copies against Drive.
 *
 * @returns {Promise<{checked:number, stale:Array, missing:Array, unknown:number}>}
 *   stale   — upstream is newer than the copy we hold
 *   missing — the file is gone from Drive, or we lost access to it
 *   unknown — imported before provenance was recorded, so nothing to compare
 */
export async function checkGoogleFreshness(companyId) {
  const files = await listImportedFiles(companyId, 'google')
  if (!files.length) return { checked: 0, stale: [], missing: [], unknown: 0 }

  const token = await getAccessToken()

  const stale   = []
  const missing = []
  let unknown   = 0
  let checked   = 0

  for (const file of files) {
    // Imported before migration 032 — we have the id but never recorded a
    // modified time, so "changed since" has no baseline. Counted and reported
    // rather than quietly treated as fresh.
    if (!file.source_modified_at) { unknown++; continue }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.source_file_id)}?fields=id,name,modifiedTime,trashed`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).catch(() => null)

    if (!res || !res.ok) {
      // 404 means deleted or no longer shared with this account. Anything else
      // is a transient failure — and reporting a transient failure as "your
      // file is gone" would be worse than saying nothing.
      if (res && res.status === 404) missing.push(file)
      continue
    }

    const meta = await res.json().catch(() => null)
    if (!meta) continue
    checked++

    if (meta.trashed) { missing.push(file); continue }

    const upstream = Date.parse(meta.modifiedTime ?? '')
    const ours     = Date.parse(file.source_modified_at)
    // Whole seconds: Drive and the picker report the same edit at slightly
    // different precision, and a millisecond of drift is not a change.
    if (Number.isFinite(upstream) && Number.isFinite(ours) && upstream - ours > 1000) {
      stale.push({
        ...file,
        upstream_name:        meta.name,
        upstream_modified_at: meta.modifiedTime,
      })
    }
  }

  return { checked, stale, missing, unknown }
}

/** Plain-English summary of a freshness check. */
export function describeFreshness({ checked, stale, missing, unknown }) {
  if (!checked && !unknown) return 'Nothing here came from Google Drive.'
  const bits = []
  if (stale.length)   bits.push(`${stale.length} ${stale.length === 1 ? 'file has' : 'files have'} changed in Drive since you imported ${stale.length === 1 ? 'it' : 'them'}`)
  if (missing.length) bits.push(`${missing.length} no longer ${missing.length === 1 ? 'exists' : 'exist'} in Drive, or you no longer have access`)
  if (unknown)        bits.push(`${unknown} ${unknown === 1 ? 'was' : 'were'} imported before we started recording this, so there is nothing to compare`)
  if (!bits.length)   return `All ${checked} imported ${checked === 1 ? 'file is' : 'files are'} still current.`
  return `${bits.join('. ')}.`
}
