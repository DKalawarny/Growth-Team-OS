/**
 * Stage engine.
 *
 * The business_profiles.current_revenue column stores one of a fixed set of
 * text labels captured during Onboarding. This module translates that label
 * into a stage name used across the app (stage badges, roadmap framing,
 * Claude system prompts).
 *
 * Keeping this pure + label-driven means:
 *   1. The UI, the AI prompt, and the dashboard stay in sync automatically.
 *   2. Future adjustments (e.g. splitting "Scaling" in two) happen in one place.
 */

export const REVENUE_OPTIONS = [
  'Pre-revenue',
  '$0 – $100k',
  '$100k – $500k',
  '$500k – $1M',
  '$1M – $5M',
  '$5M – $10M',
  '$10M+',
]

export const STAGES = [
  'Startup',
  'Early Growth',
  'Scaling',
  'Growth Engine',
  'Enterprise',
]

const STAGE_BY_REVENUE = {
  'Pre-revenue':   'Startup',
  '$0 – $100k':    'Startup',
  '$100k – $500k': 'Early Growth',
  '$500k – $1M':   'Early Growth',
  '$1M – $5M':     'Scaling',
  '$5M – $10M':    'Growth Engine',
  '$10M+':         'Enterprise',
}

const STAGE_DESCRIPTIONS = {
  'Startup':       'Finding product-market fit. Focus: get to consistent revenue.',
  'Early Growth':  'Proving the model works. Focus: systems that scale without you.',
  'Scaling':       'Replacing yourself with process and people.',
  'Growth Engine': 'Multi-location or multi-product. Focus: leadership depth.',
  'Enterprise':    'Maturing into an asset. Focus: exit readiness or succession.',
}

/**
 * Map a revenue label to a stage name.
 * Returns 'Startup' for unknown/missing input so callers never blow up
 * on a brand-new profile.
 */
export function detectStage(revenue) {
  return STAGE_BY_REVENUE[revenue] ?? 'Startup'
}

/**
 * One-line summary of what a stage is about. Used on the dashboard under
 * the stage badge so the user knows *why* they're seeing a given focus.
 */
export function stageDescription(stage) {
  return STAGE_DESCRIPTIONS[stage] ?? ''
}
