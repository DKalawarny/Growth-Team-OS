/**
 * regulatorySources.js
 *
 * Two helpers that together let Solomon cite real regulations:
 *
 *   detectSafetyTopics(query) → matches keywords in the user's question to
 *                               the topic slugs in regulatory_sources
 *                               ('silica', 'fall-protection', 'wcb-reporting',
 *                               ...). Pure regex — no API call, ~0ms cost.
 *
 *   loadRegulatorySources(jurisdictionCode, topics)
 *                             → fetches matching rows from the
 *                               regulatory_sources table (migration 022).
 *                               Falls back to country-scope (CA / US-OSHA)
 *                               when a province-specific row is missing.
 *
 * Both are kept here (not inside advisorContext) because the Safety tool
 * page can use them directly too — same logic, no duplication.
 *
 * The topic-detection patterns are intentionally conservative. A query
 * like "what's our SOP?" doesn't match any safety topic; we'd rather miss
 * a citation than inject irrelevant regulatory URLs that derail Solomon's
 * answer. The cost of a false negative is "no citation"; the cost of a
 * false positive is "Solomon cites the wrong reg." First is recoverable,
 * second isn't.
 */

import { supabase } from './supabase'

// ── In-memory cache ─────────────────────────────────────────────────────
//
// regulatory_sources is reference data — same content for every tenant,
// only changes when we ship a migration. Hitting Supabase on every
// Solomon turn to fetch the same 3-5 rows is wasteful.
//
// We cache by `${jurisdictionCode}|${sortedTopics.join(',')}` with a
// 5-minute TTL. TTL is mostly to handle the rare case where someone
// updates a URL via the dashboard without reloading the page. In
// practice the table doesn't change inside a single user session.
//
// Module-level Map — scoped to the browser tab. Cleared on page reload.
const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map()  // key → { value: rows[], expiresAt: number }

function cacheKey(jurisdictionCode, topics) {
  return `${jurisdictionCode}|${[...topics].sort().join(',')}`
}

function cacheGet(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function cacheSet(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ── Topic detection ──────────────────────────────────────────────────────
//
// Maps regex patterns → topic slugs. Same slugs as the `topic` column in
// regulatory_sources (migration 022 seeds). Keep these tight — a topic
// should match ONLY when the question is clearly about that hazard.
//
// Word boundaries (\b) prevent "fall" from matching "fallback", etc.

const TOPIC_PATTERNS = [
  // Silica / dust — kitchen demos, concrete cutting, drywall sanding
  { topic: 'silica',          re: /\b(silica|silicosis|respirable\s+crystalline|dust\s+exposure|concrete\s+dust)\b/i },

  // Asbestos — older buildings, demo work, the big one in renovation
  { topic: 'asbestos',        re: /\b(asbestos|asbestos[-\s]?containing|acm|abatement)\b/i },

  // Fall protection — anything off-ground
  { topic: 'fall-protection', re: /\b(fall\s+protection|fall\s+arrest|harness(es)?|tie[-\s]?off|guardrail|edge\s+protection|working\s+at\s+heights?)\b/i },

  // Confined space — vaults, crawlspaces, tanks
  { topic: 'confined-space',  re: /\b(confined\s+space|permit\s+space|attendant\s+(role|duty)|atmospheric\s+test(ing)?)\b/i },

  // Lockout / hazardous energy — anything electrical / mechanical
  { topic: 'lockout-tagout',  re: /\b(lockout|loto|tag\s?out|hazardous\s+energy|de[-\s]?energiz)/i },

  // WCB / WSIB / OSHA injury reporting — claim deadlines, Form 7
  { topic: 'wcb-reporting',   re: /\b(wcb|wsib|worksafe(bc|nb)?|form\s*7|claim\s+(number|deadline|reporting)|incident\s+(report|reporting)|injury\s+report(ing)?|reporting\s+timeline)\b/i },
]


/**
 * Detect which safety topics the user's question is about.
 *
 * @param {string} query   Natural-language question
 * @returns {string[]}     Array of topic slugs (deduped). Empty if no safety
 *                         signal — caller should skip regulatory lookup entirely.
 *
 * Examples:
 *   detectSafetyTopics("when do I have to report an injury?")
 *     → ['wcb-reporting']
 *   detectSafetyTopics("crew cutting concrete in the kitchen demo")
 *     → ['silica']
 *   detectSafetyTopics("what's our pricing on bathrooms?")
 *     → []
 */
export function detectSafetyTopics(query) {
  if (!query || typeof query !== 'string') return []
  const out = []
  for (const { topic, re } of TOPIC_PATTERNS) {
    if (re.test(query)) out.push(topic)
  }
  return out
}


/**
 * Load regulatory_sources rows for a jurisdiction + topics.
 *
 * Lookup strategy:
 *   1. Try exact jurisdiction match (e.g. 'CA-BC').
 *   2. If we got nothing AND the country has a federal-scope row
 *      (US → 'US-OSHA'), fall back to that. Useful when a state-plan
 *      state has no specific entry seeded yet — OSHA federal still
 *      applies in most cases.
 *   3. Canada has no federal OHS equivalent (provinces own it), so no
 *      federal fallback there — caller gets [] and Solomon redirects
 *      the way he would without retrieval.
 *
 * @param {string|null} jurisdictionCode  e.g. "CA-BC", "US-OSHA", or null
 *                                        if location couldn't be resolved
 * @param {string[]}    topics            From detectSafetyTopics()
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   jurisdiction: string,
 *   topic: string,
 *   regulation_name: string,
 *   authority_name: string,
 *   canonical_url: string,
 *   summary: string|null,
 *   last_verified: string,
 * }>>}
 */
export async function loadRegulatorySources(jurisdictionCode, topics) {
  if (!jurisdictionCode || !topics?.length) return []

  // Cache check first — reference data, rarely changes within a session.
  const key    = cacheKey(jurisdictionCode, topics)
  const cached = cacheGet(key)
  if (cached) return cached

  try {
    const { data: primary, error: primaryErr } = await supabase
      .from('regulatory_sources')
      .select('id, jurisdiction, topic, regulation_name, authority_name, canonical_url, summary, last_verified')
      .eq('jurisdiction', jurisdictionCode)
      .in('topic', topics)

    if (primaryErr) {
      console.warn('[regulatorySources] primary lookup failed:', primaryErr.message)
      return []
    }

    if (primary?.length) {
      cacheSet(key, primary)
      return primary
    }

    // ── Federal fallback ───────────────────────────────────────────
    // US state without state-specific seeds → fall back to OSHA. We
    // determine "federal scope" by jurisdiction code prefix.
    if (jurisdictionCode.startsWith('US-') && jurisdictionCode !== 'US-OSHA') {
      const { data: federal } = await supabase
        .from('regulatory_sources')
        .select('id, jurisdiction, topic, regulation_name, authority_name, canonical_url, summary, last_verified')
        .eq('jurisdiction', 'US-OSHA')
        .in('topic', topics)
      const result = federal ?? []
      cacheSet(key, result)
      return result
    }

    // Empty result — cache it too so we don't re-query for the same
    // (jurisdiction, topics) combo when we already know nothing matches.
    cacheSet(key, [])
    return []
  } catch (err) {
    console.warn('[regulatorySources] lookup threw — returning empty:', err)
    return []
  }
}
