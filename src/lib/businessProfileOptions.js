/**
 * Shared option lists for the business_profiles questions. Imported by both
 * Onboarding (the 4-step wizard) and Settings (the editable business profile
 * page) so adding a new industry, goal, or team-size bucket is a one-line
 * change that shows up in both places.
 *
 * REVENUE_OPTIONS lives in stageEngine.js because the stage mapper depends
 * on the exact label strings. Import it from there if you need it.
 */

export const INDUSTRY_OPTIONS = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Roofing',
  'Demolition',
  'Masonry',
  'Landscaping',
  'General Contracting',
  'Painting',
  'Flooring',
  'Concrete',
  'Other Trades',
]

export const TEAM_SIZE_OPTIONS = ['Just me', '2–5', '6–15', '16–50', '51+']

export const PROFIT_OPTIONS = ['Losing money', 'Break-even', '1–10%', '10–25%', '25%+', 'Not sure']

export const HOURS_OPTIONS = ['Under 20', '20–40', '40–60', '60–80', '80+']

// Days genuinely not worked in the period. A plain count, never a yes/no about
// Sabbath — a number can be reported honestly on a bad week, an obedience
// question can only be passed or failed.
export const DAYS_OFF_OPTIONS = ['0', '1', '2', '3', '4 or more']

export const GOAL_OPTIONS = [
  { value: 'Scale',         label: 'Scale',          hint: 'Grow revenue and team.' },
  { value: 'Sell',          label: 'Sell',           hint: 'Prepare the business for a future exit.' },
  { value: 'Get Off Tools', label: 'Get Off Tools',  hint: 'Work on the business, not in it.' },
  { value: 'Max Profit',    label: 'Max Profit',     hint: 'Keep it lean and profitable.' },
  { value: 'Build Team',    label: 'Build Team',     hint: 'Strong culture, strong leaders.' },
]

export const GOAL_TIMELINE_OPTIONS = ['6 months', '1 year', '2 years', '3–5 years', '5+ years']
