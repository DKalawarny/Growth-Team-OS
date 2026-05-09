/**
 * Google Places API (v1, "Places API (New)") client for the GBP Optimizer.
 *
 * We use the New Places API because:
 *   - Legacy Places is deprecated (Google is phasing out the old endpoints).
 *   - New Places uses field masks — pay for only the fields you request,
 *     which keeps per-audit cost to ~$0.04.
 *   - Cleaner response shape than the legacy API's nested result[0].
 *
 * Two calls per audit:
 *   1. places:searchText with Essentials field mask (just id + name + address)
 *      to resolve the owner's free-text query → place_id.
 *   2. places/{id} with Pro + Enterprise field masks to pull categories,
 *      rating, reviews, hours, photos, website, phone, editorial summary.
 *
 * Docs:
 *   https://developers.google.com/maps/documentation/places/web-service/text-search
 *   https://developers.google.com/maps/documentation/places/web-service/place-details
 *
 * Cost (as of April 2026, subject to change):
 *   searchText Essentials mask   ~$0.005 / call
 *   place details Pro mask       ~$0.017 / call
 *   place details Enterprise     ~$0.020 / call  (adds reviews, photos)
 *
 * Expected total per audit: ~$0.042. Cheap enough to run without caching
 * for v0; add a `gbp_snapshots` cache table if it starts mattering.
 *
 * Field masks — narrow these carefully. Every field widens the pricing SKU.
 * Photos and reviews are the big-ticket ones (Enterprise tier).
 */

// deno-lint-ignore-file no-external-import

const PLACES_BASE = 'https://places.googleapis.com/v1'

/**
 * Fields we need from Place Details for a decent GBP audit. Keep trimmed —
 * each addition can bump the pricing tier. Enterprise tier covers reviews
 * and photos, which we need.
 */
const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'addressComponents',
  'types',
  'primaryType',
  'primaryTypeDisplayName',
  'rating',
  'userRatingCount',
  'reviews',
  'regularOpeningHours',
  'websiteUri',
  'internationalPhoneNumber',
  'nationalPhoneNumber',
  'editorialSummary',
  'businessStatus',
  'photos',
  'priceLevel',
  'googleMapsUri',
  'location',
].join(',')

const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
].join(',')

// ---------------------------------------------------------------------------
// Types

/** What the browser gets back. Stable shape; don't leak raw Places shape. */
export interface GBPSnapshot {
  place_id:             string
  display_name:         string
  formatted_address:    string
  maps_uri:             string | null
  location:             { lat: number; lng: number } | null

  categories: {
    primary:         string | null       // e.g. "plumber"
    primary_display: string | null       // e.g. "Plumber"
    secondary:       string[]            // other types
  }

  hours: {
    weekday_text: string[]               // ["Monday: 7:00 AM – 5:00 PM", ...]
    open_now:     boolean | null
  } | null

  reviews: {
    count:   number
    average: number | null               // 0-5
    recent: Array<{
      author:        string | null
      rating:        number
      text:          string | null
      relative_time: string | null       // "a week ago"
      published_at:  string | null       // ISO
    }>
  }

  photos_available:    number            // count of photo refs returned
  phone:               string | null
  website:             string | null
  business_status:     string | null     // OPERATIONAL | CLOSED_TEMPORARILY | ...
  editorial_summary:   string | null
  price_level:         string | null
}

// Minimal inline shape of the Places API response, just the fields we read.
interface PlacesSearchResponse {
  places?: Array<{
    id?: string
    displayName?: { text?: string }
    formattedAddress?: string
  }>
}

interface PlacesDetailsResponse {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  types?: string[]
  primaryType?: string
  primaryTypeDisplayName?: { text?: string }
  rating?: number
  userRatingCount?: number
  reviews?: Array<{
    name?:               string
    relativePublishTimeDescription?: string
    rating?:             number
    text?:               { text?: string }
    authorAttribution?:  { displayName?: string }
    publishTime?:        string
  }>
  regularOpeningHours?: {
    openNow?:     boolean
    weekdayDescriptions?: string[]
  }
  websiteUri?:          string
  internationalPhoneNumber?: string
  nationalPhoneNumber?: string
  editorialSummary?:    { text?: string }
  businessStatus?:      string
  photos?: Array<{ name?: string }>
  priceLevel?:          string
  googleMapsUri?:       string
  location?:            { latitude?: number; longitude?: number }
}

// ---------------------------------------------------------------------------
// API

function apiKey(): string {
  const key = Deno.env.get('GOOGLE_PLACES_API_KEY')
  if (!key) throw new Error('places: GOOGLE_PLACES_API_KEY not set')
  return key
}

/**
 * Find a place by free-text query. Returns the top match or null if Places
 * returns zero results.
 *
 * The `locationBias` is optional but dramatically improves accuracy for
 * small businesses with common names. Pass in the owner's city/suburb from
 * their business_profiles row.
 */
export async function findPlace(
  query: string,
  locationBias?: { lat: number; lng: number; radiusMeters?: number },
): Promise<{ place_id: string; display_name: string; formatted_address: string } | null> {
  const body: Record<string, unknown> = {
    textQuery:       query,
    maxResultCount:  1,
  }
  if (locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: locationBias.lat, longitude: locationBias.lng },
        radius: Math.min(50_000, locationBias.radiusMeters ?? 30_000),
      },
    }
  }

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method:  'POST',
    headers: {
      'Content-Type':     'application/json',
      'X-Goog-Api-Key':   apiKey(),
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`places searchText failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = await res.json() as PlacesSearchResponse
  const hit = data.places?.[0]
  if (!hit?.id) return null

  return {
    place_id:          hit.id,
    display_name:      hit.displayName?.text ?? '',
    formatted_address: hit.formattedAddress ?? '',
  }
}

/**
 * Pull the full audit-relevant detail for a place_id and normalise into our
 * stable `GBPSnapshot` shape. Everything nullable — Places returns partial
 * responses for listings with thin data, and we shouldn't crash if a field
 * is missing.
 */
export async function fetchPlaceDetails(placeId: string): Promise<GBPSnapshot> {
  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    method:  'GET',
    headers: {
      'X-Goog-Api-Key':   apiKey(),
      'X-Goog-FieldMask': DETAILS_FIELD_MASK,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`places details failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const d = await res.json() as PlacesDetailsResponse

  // Secondary categories: Places returns `types` which includes the primary.
  // Strip the primary out so the UI doesn't show it twice.
  const allTypes   = Array.isArray(d.types) ? d.types : []
  const primary    = d.primaryType ?? null
  const secondary  = allTypes.filter(t => t !== primary)

  // Reviews: up to 5 returned by Places. Stable shape with best-effort
  // timestamps — `publishTime` is RFC3339 when present.
  const reviews = Array.isArray(d.reviews) ? d.reviews.map(r => ({
    author:        r.authorAttribution?.displayName ?? null,
    rating:        typeof r.rating === 'number' ? r.rating : 0,
    text:          r.text?.text ?? null,
    relative_time: r.relativePublishTimeDescription ?? null,
    published_at:  r.publishTime ?? null,
  })) : []

  return {
    place_id:          d.id ?? placeId,
    display_name:      d.displayName?.text ?? '',
    formatted_address: d.formattedAddress ?? '',
    maps_uri:          d.googleMapsUri ?? null,
    location:          d.location?.latitude != null && d.location?.longitude != null
                         ? { lat: d.location.latitude, lng: d.location.longitude }
                         : null,
    categories: {
      primary,
      primary_display: d.primaryTypeDisplayName?.text ?? null,
      secondary,
    },
    hours: d.regularOpeningHours ? {
      weekday_text: d.regularOpeningHours.weekdayDescriptions ?? [],
      open_now:     d.regularOpeningHours.openNow ?? null,
    } : null,
    reviews: {
      count:   typeof d.userRatingCount === 'number' ? d.userRatingCount : reviews.length,
      average: typeof d.rating === 'number' ? d.rating : null,
      recent:  reviews,
    },
    photos_available:   Array.isArray(d.photos) ? d.photos.length : 0,
    phone:              d.internationalPhoneNumber ?? d.nationalPhoneNumber ?? null,
    website:            d.websiteUri ?? null,
    business_status:    d.businessStatus ?? null,
    editorial_summary:  d.editorialSummary?.text ?? null,
    price_level:        d.priceLevel ?? null,
  }
}
