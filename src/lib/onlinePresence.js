import { supabase } from './supabase'
import { fetchWebsiteContent } from './websiteScraper'
import { fetchGBPSnapshot, GBPNotFoundError } from './gbp'

/**
 * What Solomon can see of how a customer would find this business.
 *
 * ⚠️ 11 Oct 2026, Daniel: "is solomon able to analyse the online presence and
 * give a suggestion on whats missing. If someone says I'm not getting much work
 * and they have no web presence, could he tell them."
 *
 * Two things were wrong. The website was read ONCE, at sign-up, so an owner who
 * fixed his site was still being told about the old one. And the Google listing,
 * which for a local trade matters more than the site, was invisible to Solomon.
 *
 * This keeps both current in the background:
 *   - the website is re-read when the stored copy is older than WEBSITE_DAYS
 *   - the Google listing is looked up when the stored summary is older than
 *     LISTING_DAYS. That lookup costs real money per call (Google Places), so
 *     it is rationed by date and never run for a demo company.
 *
 * 🔴 A LISTING THAT IS NOT CLEARLY THEIRS IS NOT STORED. Every town has a
 * "Smith Plumbing". If the name Google returns does not match the business
 * name (or the website does not match), we record "not found" and Solomon asks
 * the owner. Describing a stranger's reviews to him as his own would be far
 * worse than not knowing.
 */
export const WEBSITE_DAYS = 14
export const LISTING_DAYS = 30

const DAY = 86_400_000
const olderThan = (iso, days, now) => !iso || (now - new Date(iso).getTime()) > days * DAY

export function websiteIsStale(bp, now = Date.now()) {
  if (!bp?.website?.trim()) return false
  return !bp.website_content || olderThan(bp.website_fetched_at, WEBSITE_DAYS, now)
}

export function listingIsStale(bp, now = Date.now()) {
  if (!bp?.business_name?.trim()) return false
  return olderThan(bp.google_listing_checked_at, LISTING_DAYS, now)
}

const FILLER = new Set(['ltd', 'limited', 'inc', 'incorporated', 'llc', 'co', 'company', 'corp', 'corporation', 'the', 'and', 'services', 'service', 'group'])
const words = s => String(s ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !FILLER.has(w))
const domain = u => String(u ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]

/** Is the listing Google returned clearly this business? Same website, or the same name once filler words are dropped. */
export function listingMatches(bp, snapshot) {
  if (!snapshot?.display_name) return false
  const a = domain(bp?.website), b = domain(snapshot.website)
  if (a && b && a === b) return true
  const mine = words(bp?.business_name), theirs = words(snapshot.display_name)
  if (!mine.length || !theirs.length) return false
  const [short, long] = mine.length <= theirs.length ? [mine, theirs] : [theirs, mine]
  return short.every(w => long.includes(w))
}

/** The few facts Solomon needs, small enough to send on every message. No review text, no reviewer names. */
export function summariseListing(snapshot, checkedAt) {
  return {
    found: true,
    checked_on: checkedAt.slice(0, 10),
    name: snapshot.display_name,
    address: snapshot.formatted_address ?? null,
    category: snapshot.categories?.primary_display ?? null,
    review_count: snapshot.reviews?.count ?? 0,
    rating: snapshot.reviews?.average ?? null,
    newest_review: snapshot.reviews?.recent?.map(r => r.published_at).filter(Boolean).sort().pop()?.slice(0, 10) ?? null,
    photos_at_least: snapshot.photos_available ?? 0,   // Google returns at most ten; ten means "ten or more"
    has_hours: !!snapshot.hours?.weekday_text?.length,
    has_phone: !!snapshot.phone,
    website_on_listing: snapshot.website ?? null,
    status: snapshot.business_status ?? null,
  }
}

const inFlight = new Set()

/**
 * Bring the stored website copy and listing summary up to date. Never throws,
 * never blocks: the caller does not wait, and the fresh copy is there for the
 * next message. Returns what it changed (for tests and logging).
 */
export async function refreshOnlinePresence(bp, { isDemo = false, now = Date.now() } = {}) {
  const companyId = bp?.company_id
  if (!companyId || isDemo || inFlight.has(companyId)) return {}
  inFlight.add(companyId)
  const patch = {}
  const stamp = new Date(now).toISOString()
  try {
    if (websiteIsStale(bp, now)) {
      const text = await fetchWebsiteContent(bp.website)
      // A failed read keeps the old copy; the date still moves so a dead site is not retried on every message.
      if (text) patch.website_content = text
      patch.website_fetched_at = stamp
    }
    if (listingIsStale(bp, now)) {
      // 🔴 "Google returned nothing" and "the lookup failed" are different facts.
      // Only the first is stored. A failed lookup (the API off, a timeout)
      // stores nothing, so Solomon is never told "no listing came up" about a
      // business we simply could not check. It is tried again next time.
      let listing = null
      try {
        const snapshot = await fetchGBPSnapshot([bp.business_name, bp.location].filter(Boolean).join(' '))
        listing = listingMatches(bp, snapshot) ? summariseListing(snapshot, stamp) : { found: false, checked_on: stamp.slice(0, 10) }
      } catch (err) {
        if (err instanceof GBPNotFoundError) listing = { found: false, checked_on: stamp.slice(0, 10) }
      }
      if (listing) {
        patch.google_listing = listing
        patch.google_listing_checked_at = stamp
      }
    }
    if (Object.keys(patch).length) {
      await supabase.from('business_profiles').update(patch).eq('company_id', companyId)
    }
  } catch { /* background upkeep; never surfaces */ }
  finally { inFlight.delete(companyId) }
  return patch
}
