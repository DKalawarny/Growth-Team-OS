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

// ⚠️ These were: Scale / Sell / Get Off Tools / Max Profit / Build Team, with
// hints like "Work on the business, not in it."
//
// Three things wrong with that, all the same thing:
//   1. "Max Profit" and "Scale" are hustle vocabulary, and the prompt has a
//      whole section saying a bigger number is not self-evidently the right
//      goal. Onboarding was offering it as a goal.
//   2. "Get Off Tools" is trades-only. A dentist is not on the tools.
//   3. "Work on the business, not in it" is a Gerber cliché — the kind of
//      phrase that could sit on any business product.
//
// ⭐ The VALUES are what land in primary_goal and go into BUSINESS_CONTEXT, so
// Solomon reads them verbatim as the owner's stated aim. They are written the
// way an owner would actually say it, in the same register as SolomonLauncher.
export const GOAL_OPTIONS = [
  { value: 'Grow it',                  label: 'Grow it',
    hint: 'More work, more people, a bigger business than it is now.' },
  { value: 'Make it more profitable',  label: 'Make it more profitable',
    hint: 'Same size, better margins. Keep more of what comes in.' },
  { value: 'Get out of the day-to-day', label: 'Get out of the day-to-day',
    hint: 'So it does not need you in it every hour to keep running.' },
  { value: 'Build the team',           label: 'Build the team',
    hint: 'People who can carry it, and who want to stay.' },
  { value: 'Hand it on',               label: 'Hand it on',
    hint: 'Ready for someone else to run it, buy it, or inherit it.' },
]

export const GOAL_TIMELINE_OPTIONS = ['6 months', '1 year', '2 years', '3–5 years', '5+ years']
