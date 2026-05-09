import { supabase } from './supabase'

/**
 * GBP helpers — browser-side thin wrapper over the gbp-fetch Edge Function.
 *
 * One call so far:
 *   fetchGBPSnapshot(query) — resolves a free-text business name (optionally
 *                             including city) into a structured snapshot of
 *                             the owner's Google Business Profile. The GBP
 *                             Optimizer tool uses this to auto-fill most of
 *                             the audit form instead of making the owner
 *                             paste every field.
 *
 * The Edge Function wraps two Places API calls (search → details) so the
 * browser never sees the GOOGLE_PLACES_API_KEY.
 *
 * Error shape: throws Error. Callers should catch and show a friendly
 * message. The 'not_found' special case is reachable when Places returns
 * zero results for the query — the UI should handle that by suggesting a
 * retry or falling back to manual paste.
 */

export class GBPNotFoundError extends Error {
  constructor() {
    super('We couldn\'t find that business on Google. Try a different query, or fall back to manual paste below.')
    this.name = 'GBPNotFoundError'
    this.code = 'not_found'
  }
}

/**
 * Resolve a free-text query → GBPSnapshot. See _shared/places.ts on the
 * server for the full snapshot shape. Expected to be called from the GBP
 * Optimizer form when the owner clicks "Find my listing".
 *
 * Pass the clearest disambiguator you can — business name + city usually
 * nails it. A bare common name ("Smith Plumbing") will match the wrong
 * place unless the owner has a location saved on business_profiles that
 * we can use as a location bias.
 */
export async function fetchGBPSnapshot(query) {
  const text = (query ?? '').trim()
  if (!text) throw new Error('Enter a business name to search.')

  const { data, error } = await supabase.functions.invoke('gbp-fetch', {
    method: 'POST',
    body:   { query: text },
  })

  // Supabase's functions.invoke bubbles non-2xx as a FunctionsHttpError
  // where `error.context` IS the raw Response. (Older SDK docs wrap it in
  // `{ response }` — don't rely on that.) We have to peek at the body to
  // distinguish the "zero matches" 404 from a real error, because the
  // user flow in the two cases is different: 404 → offer a different
  // query + fallback paste; 500 → "something went wrong, try again".
  if (error) {
    const resp   = error?.context instanceof Response ? error.context : null
    const status = resp?.status
    if (status === 404) throw new GBPNotFoundError()

    // Try to read a structured error message off the response body before
    // falling back to the generic invoke error. This surfaces things like
    // "query: must be at least 3 characters" and "auth: …" to the UI.
    const message = await readErrorMessage(resp) || error.message || 'Could not fetch GBP data'
    throw new Error(message)
  }

  if (!data?.snapshot) {
    throw new Error('Server returned no snapshot')
  }

  return data.snapshot
}

/**
 * Best-effort read of a structured error body off a Response. Returns the
 * string message or null. Never throws.
 *
 * Tries JSON first (our functions always return `{error: string}`), falls
 * back to raw text if the body isn't JSON (e.g. a Supabase infra crash
 * page).
 */
async function readErrorMessage(resp) {
  if (!resp) return null
  try {
    // Clone before reading — the caller or the SDK might also want to read.
    const body = await resp.clone().json()
    if (body?.error) return String(body.error)
  } catch {
    // Not JSON. Try text.
    try {
      const text = (await resp.clone().text()).trim()
      if (text) return text.slice(0, 300)
    } catch {
      // Body already consumed or unreadable. Fall through.
    }
  }
  return null
}

// -------------------------------------------------------------------------
// View helpers — used by the form to render a fetched snapshot before the
// owner decides whether to use it for an audit.

/**
 * Star rating renderer — "4.7 ★ (73)" etc. Returns "No reviews yet" when the
 * business has none, which is a real case for a freshly-set-up GBP.
 */
export function formatRating(reviews) {
  if (!reviews || !reviews.count) return 'No reviews yet'
  const avg = typeof reviews.average === 'number' ? reviews.average.toFixed(1) : '—'
  return `${avg} ★ (${reviews.count})`
}

/**
 * Turn a structured snapshot into the multi-line "current listing" text we
 * feed to the GBP_OPTIMIZER_PROMPT. This is the bridge: the prompt was
 * originally designed around a paste-in blob, and we keep that contract —
 * we just generate the blob from the snapshot automatically.
 *
 * The output is deliberately formatted like what a careful owner would paste:
 * labelled lines, short, no markdown. Claude reads it the same way it would
 * read a real paste.
 *
 * Deliberately does NOT accept owner-provided extras (posts, services tab,
 * verbatim description, total photos). Those four live only behind the
 * Google Business Profile OAuth API, not Places. The tool surfaces them as
 * "ask_for_next_time" via the prompt instead of asking the owner to paste
 * data hunting.
 */
export function snapshotToListingText(snapshot) {
  if (!snapshot) return ''
  const lines = []

  if (snapshot.categories?.primary_display) {
    lines.push(`Primary category: ${snapshot.categories.primary_display}`)
  }
  if (snapshot.categories?.secondary?.length) {
    lines.push(`Other types Google sees: ${snapshot.categories.secondary.join(', ')}`)
  }
  if (snapshot.formatted_address) {
    lines.push(`Address: ${snapshot.formatted_address}`)
  }
  if (snapshot.phone) {
    lines.push(`Phone: ${snapshot.phone}`)
  }
  if (snapshot.website) {
    lines.push(`Website: ${snapshot.website}`)
  }
  if (snapshot.hours?.weekday_text?.length) {
    lines.push(`Hours:\n${snapshot.hours.weekday_text.map(l => '  ' + l).join('\n')}`)
  }
  if (snapshot.editorial_summary) {
    lines.push(`Editorial summary (Google's auto-description): ${snapshot.editorial_summary}`)
  }
  if (snapshot.business_status && snapshot.business_status !== 'OPERATIONAL') {
    lines.push(`Business status: ${snapshot.business_status}`)
  }

  // Reviews section — count + average + up to 3 recent review quotes. The
  // quotes are important: Claude picks up on what customers actually say
  // and can feed that back into posts / description.
  const r = snapshot.reviews
  if (r) {
    lines.push(`Reviews: ${r.count} total, ${r.average ? r.average.toFixed(1) + '⭐' : 'no rating'}`)
    if (r.recent?.length) {
      lines.push(`Recent reviews (up to 3):`)
      r.recent.slice(0, 3).forEach((rv, i) => {
        const when   = rv.relative_time ? ` (${rv.relative_time})` : ''
        const rating = typeof rv.rating === 'number' ? `${rv.rating}★ ` : ''
        const text   = rv.text ? rv.text.slice(0, 200).replace(/\s+/g, ' ') : '(no text)'
        lines.push(`  ${i + 1}. ${rating}${text}${when}`)
      })
    }
  }

  if (typeof snapshot.photos_available === 'number') {
    lines.push(`Photos returned by API: ${snapshot.photos_available} (Places samples up to 10 — actual total on GBP is usually much higher)`)
  }

  return lines.join('\n')
}
