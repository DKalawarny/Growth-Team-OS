/**
 * Shared option lists for the business_profiles questions. Imported by both
 * Onboarding (the 4-step wizard) and Settings (the editable business profile
 * page) so adding a new industry, goal, or team-size bucket is a one-line
 * change that shows up in both places.
 *
 * REVENUE_OPTIONS lives in stageEngine.js because the stage mapper depends
 * on the exact label strings. Import it from there if you need it.
 */

// ⚠️ This list was TWELVE TRADES, ending in "Other Trades" — so a bookkeeper,
// a dentist, an agency or a print shop could not answer step one of onboarding
// honestly. The first question in the product filtered out everyone the
// reposition was meant to include, and `industry` feeds Solomon's context, so
// it shaped every answer afterwards too.
//
// Grouped rather than alphabetical: trades stay first and intact because they
// are the network Daniel actually has, and the rest of the economy follows.
// "Something else" is last and means it, rather than meaning "another trade".
export const INDUSTRY_OPTIONS = [
  // Trades and construction
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
  'Other trades',

  // Field and home services
  'Cleaning & Janitorial',
  'Pest Control',
  'Restoration & Remediation',
  'Moving & Storage',
  'Auto Repair',
  'Equipment Rental',

  // Professional services
  'Accounting & Bookkeeping',
  'Legal',
  'Consulting',
  'Marketing & Creative Agency',
  'Architecture & Engineering',
  'Insurance & Financial Services',
  'Real Estate & Property Management',
  'Recruiting & Staffing',

  // Health and care
  'Dental',
  'Medical & Clinical',
  'Veterinary',
  'Therapy & Counselling',
  'Fitness & Wellness',
  'Childcare & Education',
  'Home Care & Senior Services',

  // Trade, making and hospitality
  'Retail',
  'E-commerce',
  'Restaurant & Café',
  'Food Production',
  'Manufacturing',
  'Print & Signage',
  'Wholesale & Distribution',
  'Transport & Logistics',
  'Agriculture',

  // Other
  'Software & Technology',
  'Non-profit & Ministry',
  'Events & Hospitality',
  'Something else',
]

export const TEAM_SIZE_OPTIONS = ['Just me', '2–5', '6–15', '16–50', '51+']

export const PROFIT_OPTIONS = ['Losing money', 'Break-even', '1–10%', '10–25%', '25%+', 'Not sure']

export const HOURS_OPTIONS = ['Under 20', '20–40', '40–60', '60–80', '80+']

export const GOAL_OPTIONS = [
  { value: 'Scale',         label: 'Scale',          hint: 'Grow revenue and team.' },
  { value: 'Sell',          label: 'Sell',           hint: 'Prepare the business for a future exit.' },
  { value: 'Get Off Tools', label: 'Get Off Tools',  hint: 'Work on the business, not in it.' },
  { value: 'Max Profit',    label: 'Max Profit',     hint: 'Keep it lean and profitable.' },
  { value: 'Build Team',    label: 'Build Team',     hint: 'Strong culture, strong leaders.' },
]

export const GOAL_TIMELINE_OPTIONS = ['6 months', '1 year', '2 years', '3–5 years', '5+ years']
