/**
 * ⭐ WHERE THEY CAME FROM — and nothing about who they are.
 *
 * 3 Oct 2026: every projection rested on a conversion rate nobody could
 * measure. This records, on a person's FIRST visit, which site, search or ad
 * brought them: the utm_ tags in the link and the referring website's domain.
 * Never a full URL, never an identifier, never shared with any ad platform —
 * it is counted in our own database (wayout_diagnostics.source,
 * wayout_sessions.source) so we can see which sources lead to finished plans.
 * Disclosed on the privacy page.
 */
const KEY = 'wayout:source'
const DAYS = 30

export function captureSource() {
  try {
    if (typeof window === 'undefined') return
    const existing = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (existing && Date.now() - existing.at < DAYS * 864e5) return
    const q = new URLSearchParams(window.location.search)
    let ref = null
    try {
      const h = document.referrer ? new URL(document.referrer).hostname : ''
      ref = h && h !== window.location.hostname ? h.replace(/^www\./, '') : null
    } catch { /* unreadable referrer */ }
    const src = {
      utm_source: q.get('utm_source')?.slice(0, 60) || null,
      utm_medium: q.get('utm_medium')?.slice(0, 60) || null,
      utm_campaign: q.get('utm_campaign')?.slice(0, 80) || null,
      referrer: ref,
      landing: window.location.pathname.slice(0, 80),
      at: Date.now(),
    }
    localStorage.setItem(KEY, JSON.stringify(src))
  } catch { /* private mode: nothing recorded, nothing breaks */ }
}

/** The recorded source, without the timestamp, or null. */
export function readSource() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!s) return null
    const { at: _at, ...rest } = s
    return rest
  } catch { return null }
}
