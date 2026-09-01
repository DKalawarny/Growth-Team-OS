/**
 * Does the roadmap still describe the business the owner actually has?
 *
 * ⚠️ WHY THIS EXISTS. Milestones are generated ONCE, from business_profiles, at
 * onboarding (or when the owner regenerates). Nothing has ever re-read that
 * profile afterwards. Change the profile and the roadmap keeps describing the
 * company you used to be — and Solomon keeps reasoning from it, because
 * advisorContext hands him both without either knowing the other has moved.
 *
 * Daniel hit the loud version of this: his header and Solomon said "Bridgewater
 * Mechanical, commercial HVAC" while his roadmap was still planning Kinwove's
 * faith-seeker and church-pastor personas. Two different businesses on one
 * company record, and not one surface noticed.
 *
 * A real owner hits the quiet version: they change industry, revenue band or
 * their primary goal in Settings, and every milestone afterwards is answering
 * a question they stopped asking. Nothing warns them.
 *
 * ⚠️ THIS ONLY DETECTS AND REPORTS. It never regenerates. Regenerating wipes
 * milestones and the progress on them, and that has to stay the owner's
 * decision — the same reason Roadmap surfaces slipped milestones instead of
 * quietly re-dating them.
 */

// The fields that genuinely change what a plan should be. Deliberately NOT
// website, location or hours: a new phone number or a move across town does
// not invalidate a two-year plan, and a fingerprint that trips on noise is one
// people learn to dismiss.
//
// business_name is in here for a different reason than the rest — it does not
// shape milestones, but a changed name is the clearest signal that the roadmap
// was built for a different company altogether. That is the case that started
// this.
export const ROADMAP_INPUT_FIELDS = [
  'business_name',
  'industry',
  'team_size',
  'last_revenue',
  'current_revenue',
  'profit',
  'primary_goal',
  'goal_timeline',
]

const LABELS = {
  business_name:   'Business name',
  industry:        'Industry',
  team_size:       'Team size',
  last_revenue:    'Last year revenue',
  current_revenue: 'This year tracking',
  profit:          'Profit margin',
  primary_goal:    'Primary goal',
  goal_timeline:   'Goal timeline',
}

const norm = v => {
  if (v == null) return null
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean).sort().join(' | ')
  return String(v).trim() || null
}

/** The subset of a profile a roadmap was built from. Stored as-is on the company. */
export function roadmapFingerprint(profile) {
  if (!profile) return null
  const out = {}
  for (const f of ROADMAP_INPUT_FIELDS) out[f] = norm(profile[f])
  return out
}

/**
 * What has moved since the roadmap was built.
 *
 * Returns [] when they match, when there is no stored fingerprint (roadmaps
 * predating this feature — absence of evidence is not evidence of drift, and
 * warning everyone on day one would be crying wolf), or when there is no
 * profile to compare against.
 */
export function roadmapDrift(storedFingerprint, currentProfile) {
  if (!storedFingerprint || !currentProfile) return []
  const now = roadmapFingerprint(currentProfile)
  const drift = []
  for (const f of ROADMAP_INPUT_FIELDS) {
    const was = storedFingerprint[f] ?? null
    const is  = now[f] ?? null
    // Only report a real move. Filling in a field that was blank is new
    // information, not a contradiction, so it does not count as drift.
    if (was && is && was !== is) drift.push({ field: f, label: LABELS[f] ?? f, was, is })
  }
  return drift
}

/** One plain sentence for the banner and for Solomon. Null when nothing moved. */
export function describeDrift(drift) {
  if (!drift?.length) return null
  const parts = drift.map(d => `${d.label.toLowerCase()} (${d.was} → ${d.is})`)
  const list =
    parts.length === 1 ? parts[0]
    : parts.length === 2 ? `${parts[0]} and ${parts[1]}`
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return `This roadmap was built before ${list} changed.`
}
