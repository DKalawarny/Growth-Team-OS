/**
 * Demo mode — a public, read-only tour of the real product.
 *
 * A visitor hits /demo and is signed into the shared "Evergreen Grounds" demo
 * account (seeded sample data) so they can click through every page of the
 * actual app. The session is minted server-side by the demo-login edge function
 * using the service role, so NO demo credential is ever shipped to the browser.
 *
 * Two things keep it safe and free:
 *   - The claude edge function refuses any AI call from this company, so Solomon
 *     is read-only here and costs nothing no matter what a visitor or bot tries.
 *   - The data is isolated to this one company by RLS and is re-seedable, so a
 *     stray edit can only touch the demo and is restored by re-running the seed.
 *
 * The id is fixed (seeded explicitly) so both the client and the edge function
 * recognise the demo company without a schema change.
 */
export const DEMO_COMPANY_ID = 'de900000-0000-4000-8000-000000000001'
export const DEMO_BUSINESS   = 'Evergreen Grounds'

// Every demo instance (the template + each per-visitor clone) carries
// companies.is_demo = true. Pass the company row, not an id.
export const isDemoCompany = company => !!company?.is_demo

/**
 * Canned SOP suggestions shown when a demo visitor clicks "Ask Solomon what
 * we're missing" on the SOPs page. Live AI is blocked for the demo (see above),
 * so instead of a dead "read-only" wall the demo SHOWS Solomon's answer, tied
 * to the demo company's own seeded job logs (the Maple Plaza gate-key delay and
 * the Riverbend pruning guesswork), so it reads as a real, evidence-backed read.
 */
export const DEMO_SOP_SUGGESTIONS = [
  {
    title: 'Site access and gate-key confirmation',
    why:   'Access was blocked at Maple Plaza because the gate key was not on site, costing the crew about 40 minutes. Confirming access the day before would stop it recurring.',
    steps: [
      'Call the site contact the day before and confirm the gate code, or who will hold the key',
      'Get written confirmation (text or email) that the key will be on site when the crew arrives',
      'Send a reminder to the site contact the morning of the visit',
      'On arrival, confirm access before unloading any equipment',
    ],
  },
  {
    title: 'Pre-visit scope and pruning confirmation',
    why:   'At Riverbend the crew could not confirm which zones to prune with no one on site and guessed on two beds. A quick scope check avoids rework and an unhappy client.',
    steps: [
      'Before the visit, confirm with the client exactly which beds and zones are in scope',
      'Mark any no-prune or client-sensitive areas in the site notes',
      'If anything is unclear on site, photograph it and ask before cutting',
      'Log what was pruned so the next visit matches',
    ],
  },
  {
    title: 'Seasonal irrigation startup and shutdown',
    why:   'A task that comes up across your maintenance sites every season with no written SOP yet, so it depends on whoever is on the crew that day.',
    steps: [
      'Walk each zone and check heads for damage before starting the system up',
      'Start the system and run each zone, flag any that failed over winter',
      'Set the seasonal schedule and confirm the timing with the client',
      'At season end, blow out and shut down each zone and log it',
    ],
  },
]
