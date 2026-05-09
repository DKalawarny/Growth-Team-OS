/**
 * Website content fetcher (Jina Reader wrapper).
 *
 * Why Jina: browsers block cross-site fetches (CORS) for most websites, so we
 * can't just fetch('https://example.com') from the client. Jina Reader sits
 * in front of any URL, strips nav/footer/ads, and returns clean text with
 * permissive CORS. Free tier is generous; no API key needed for low volume.
 *
 * If scraping fails (bad URL, timeout, Jina outage, etc.) we return null and
 * the caller proceeds without website context — a partial roadmap is strictly
 * better than a failed onboarding.
 *
 * When we outgrow Jina: migrate to a Supabase Edge Function that fetches +
 * cleans HTML itself. The rest of the app stays the same; just swap this file.
 */

const MAX_CHARS = 10_000        // ~3k tokens — keeps Claude prompt costs sane
const TIMEOUT_MS = 15_000

export async function fetchWebsiteContent(url) {
  if (!url || typeof url !== 'string') return null

  const normalized = normalizeUrl(url)
  if (!normalized) return null

  try {
    const res = await fetch(`https://r.jina.ai/${normalized}`, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null

    const text = await res.text()
    if (!text || text.length < 50) return null     // suspiciously empty

    return text.slice(0, MAX_CHARS)
  } catch {
    return null
  }
}

/** Accept "example.com", "www.example.com", "https://example.com", etc. */
function normalizeUrl(url) {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
