/**
 * gbp-fetch
 *
 * Browser calls this to resolve a small-business owner's free-text query
 * ("Newcastle Plumbing Co", maybe with a city) into a structured snapshot
 * of their Google Business Profile — categories, hours, reviews, photos,
 * website, etc. That snapshot is what the GBP Optimizer tool then audits.
 *
 * Why it's a server-side function (not a direct browser → Places call):
 *   1. Keeps GOOGLE_PLACES_API_KEY out of the browser bundle.
 *   2. Lets us role-gate (owners/admins only — this is a v0 guardrail;
 *      relax if the usage pattern says otherwise).
 *   3. Lets us look up the owner's location from business_profiles and
 *      pass it as a locationBias, which dramatically sharpens accuracy
 *      for businesses with common names (every city has a "Smith
 *      Plumbing").
 *
 * Request body:
 *   { query: string }
 *
 * Response 200:
 *   { snapshot: GBPSnapshot }     // see _shared/places.ts for shape
 *
 * Response 404:
 *   { error: 'not_found' }        // query returned zero matches
 *
 * Response 401: auth failure
 * Response 500: anything else
 *
 * The browser is expected to show an "is this your listing?" confirmation
 * before auto-filling the rest of the form. We don't cache here — audits
 * are infrequent (a business owner re-runs maybe 1×/month) and the snapshot
 * is a few KB.
 */

// deno-lint-ignore-file no-external-import

import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser, serviceClient }    from '../_shared/supabase.ts'
import { findPlace, fetchPlaceDetails } from '../_shared/places.ts'

// ---- Places pricing (USD per call) ---------------------------------------
// Must match src/lib/usage.js constants — keep both in sync when Google
// changes pricing. We log computed cost at insert-time so historical rows
// aren't retroactively mis-valued by a future price change.
const PLACES_SEARCH_COST  = 0.005   // Essentials field mask
const PLACES_DETAILS_COST = 0.020   // Enterprise mask (reviews + photos)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  // Track of who's calling so we can log Places usage after each paid call.
  // Declared outside the try so the catch block can also log (in case of
  // partial-success where we already made a paid call before blowing up).
  let userCtx: { userId: string; companyId: string } | null = null
  let admin: ReturnType<typeof serviceClient> | null = null

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const user = await authedUser(req)
    userCtx = { userId: user.userId, companyId: user.companyId }

    // Parse body. Any profile can call this — GBP audits aren't sensitive;
    // role-gating here would just block legit viewers who happen to own
    // the marketing effort but sit under "employee" role in Profiles. If
    // this becomes noisy / abused, tighten to owner/admin/cfo.
    const body = await req.json().catch(() => ({})) as { query?: string }
    const query = (body.query ?? '').trim()
    if (!query || query.length < 3) {
      return json({ error: 'query: must be at least 3 characters' }, 400)
    }

    // Pull the owner's location to bias the Places search. If the company
    // doesn't have a location on business_profiles (onboarding skipped the
    // field) we just search without a bias — less accurate but still works.
    admin = serviceClient()
    const { data: bp } = await admin
      .from('business_profiles')
      .select('location')
      .eq('company_id', user.companyId)
      .maybeSingle()

    const bias = await resolveLocationBias(bp?.location ?? null, admin, userCtx)

    // Stage 1: Text search for the place_id (cheap — Essentials mask).
    const hit = await findPlace(query, bias ?? undefined)
    await logPlacesUsage(admin, userCtx, 'places_search')
    if (!hit) {
      return json({ error: 'not_found' }, 404)
    }

    // Stage 2: Full details with the audit-relevant field mask.
    const snapshot = await fetchPlaceDetails(hit.place_id)
    await logPlacesUsage(admin, userCtx, 'places_details')

    return json({ snapshot })
  } catch (err) {
    console.error('[gbp-fetch]', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401 : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})

/**
 * Turn the owner's free-text location ("Newcastle NSW", "Seattle, WA") into
 * a lat/lng centre for Places location biasing.
 *
 * Uses Places textSearch as a geocoder: it's cheaper than the dedicated
 * Geocoding API, already has the same API key scoped for us, and we don't
 * need sub-metre accuracy — a "near this city" centre is plenty.
 *
 * Returns null if the location string is empty or the geocode returns zero
 * results. Callers should treat null as "no bias, accept the accuracy hit."
 */
async function resolveLocationBias(
  locationString: string | null,
  admin:          ReturnType<typeof serviceClient> | null,
  userCtx:        { userId: string; companyId: string } | null,
): Promise<{ lat: number; lng: number; radiusMeters: number } | null> {
  if (!locationString || locationString.trim().length < 2) return null

  try {
    const hit = await findPlace(locationString.trim())
    await logPlacesUsage(admin, userCtx, 'places_search')
    if (!hit) return null

    // We called findPlace() with the Essentials mask, which doesn't include
    // location. Fetch details with just location to get coordinates.
    //
    // This is an extra paid detail call per audit — ~$0.017 — but only when
    // we have a location string AND geocoding succeeded. For owners without
    // a saved location we skip this entirely.
    const details = await fetchPlaceDetails(hit.place_id)
    await logPlacesUsage(admin, userCtx, 'places_details')
    if (!details.location) return null

    return {
      lat:          details.location.lat,
      lng:          details.location.lng,
      radiusMeters: 30_000,  // 30km — tight enough for small city, wide enough for suburbs
    }
  } catch {
    // Geocoding is best-effort. Never fail the main request because the
    // location hint is flaky.
    return null
  }
}

/**
 * Insert a Places usage row. Fail-open: a logging failure must never break
 * the user's audit. We still log to console so ops can catch systemic issues.
 *
 * Cost is computed client-side (here) rather than via a DB trigger so that
 * a future Google price change doesn't retroactively re-value old rows —
 * historical cost accuracy matters more than convenience.
 */
async function logPlacesUsage(
  admin:   ReturnType<typeof serviceClient> | null,
  userCtx: { userId: string; companyId: string } | null,
  kind:    'places_search' | 'places_details',
): Promise<void> {
  if (!admin || !userCtx) return
  const cost = kind === 'places_search' ? PLACES_SEARCH_COST : PLACES_DETAILS_COST
  try {
    const { error } = await admin.from('usage_events').insert({
      company_id: userCtx.companyId,
      user_id:    userCtx.userId,
      tool_id:    'gbp-optimizer',
      provider:   'google_places',
      kind,
      units:      1,
      cost_usd:   cost,
    })
    if (error) console.warn('[gbp-fetch] logPlacesUsage failed', error)
  } catch (err) {
    console.warn('[gbp-fetch] logPlacesUsage threw', err)
  }
}
