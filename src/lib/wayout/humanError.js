/**
 * ⭐ WHAT A PERSON READS WHEN SOMETHING FAILS.
 *
 * 🔴 From the 1 Oct audit: error screens printed the raw error, so somebody
 * whose connection dropped read "Failed to fetch (ufhduewbamnmoiksqgfq.supabase.co)"
 * — and a database refusal would have read "new row violates row-level
 * security policy". Messages we wrote ourselves pass through unchanged; anything
 * technical becomes a sentence they can act on, and the raw text goes to the
 * console where it is useful.
 */
const NETWORK = /failed to fetch|networkerror|network request failed|load failed|supabase\.co|\bfetch\b|timed? ?out|aborted/i
const TECHNICAL = /^(error|typeerror|syntaxerror|referenceerror)\b|[{}]|\bat \w+ \(|\b(status|code) \d{3}\b|violates|row-level|permission denied|duplicate key|relation "|column "|\bPGRST|\bJWT\b|undefined|null\b/i

export function humanError(err) {
  const text = String(err?.message ?? err ?? '').trim()
  if (!text) return ''
  if (NETWORK.test(text)) {
    console.error('[wayout]', text)
    return 'We could not reach your plan just now. Check your connection and try again.'
  }
  if (TECHNICAL.test(text)) {
    console.error('[wayout]', text)
    return 'Something went wrong on our side. Try again in a moment.'
  }
  return text
}
