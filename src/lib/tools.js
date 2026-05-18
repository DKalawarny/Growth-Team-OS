/**
 * Tools registry — the single source of truth for every tool in GrowthOS.
 *
 * One place to change when we:
 *   - launch a new tool (flip status from 'coming-soon' to 'available')
 *   - rename a tool (update `name` here, everywhere else picks it up)
 *   - role-gate a tool (set `roles: ['owner', 'admin', 'cfo']`)
 *   - hide a tool from nav + /tools grid while keeping its route alive
 *     (set `hidden: true` — direct URLs still resolve, it's just not
 *     discoverable through the chrome)
 *
 * Consumed by:
 *   - /tools           Tools landing page — grid of cards
 *   - /documents       Document library — resolves tool_id → display name
 *   - Sidebar          Tools section — now derives from this file
 *
 * Keys match the URL segment (`to` in Sidebar.jsx) and `tool_id` stored in
 * the `documents` table. Keep them stable — renaming a key orphans every
 * saved document for that tool.
 *
 * Post-April-2026 positioning note: GrowthOS niched down to home-services.
 * Tools that don't fit that wedge (Exit Readiness, Rocks Tracker) are marked
 * `hidden: true` rather than deleted — the code runs fine, they just don't
 * clutter the homepage. Un-hide when we expand beyond home services.
 */

export const TOOLS = [
  // ── High-frequency tools first ─────────────────────────────────────────────
  {
    id:          'cfo-dashboard',
    route:       '/tools/cfo',
    name:        'CFO Dashboard',
    tagline:     'Monthly KPIs with plain-English commentary from your books.',
    category:    'foundation',
    status:      'available',
    icon:        '📈',
    roles:       ['owner', 'admin', 'cfo'],
  },
  {
    id:          'safety-vault',
    route:       '/tools/safety',
    name:        'Safety & Compliance',
    tagline:     'Track every licence, WCB registration, and compliance document your business needs to operate legally.',
    category:    'systems',
    status:      'available',
    icon:        '🦺',
  },
  // ── Supporting tools ───────────────────────────────────────────────────────
  {
    id:          'cash-flow',
    route:       '/tools/cash-flow',
    name:        'Cash Flow',
    tagline:     '13-week cash runway projection, so payroll never sneaks up on you.',
    category:    'foundation',
    status:      'available',
    icon:        '📊',
  },
  {
    id:          'gbp-optimizer',
    route:       '/tools/gbp',
    name:        'Local & AI Visibility',
    tagline:     'Show up on Google Maps, in search results, and when customers ask ChatGPT or Google AI who to call. Full audit — GBP, website, citations, backlinks, schema, and AI search readiness.',
    category:    'revenue',
    status:      'available',
    icon:        '📍',
  },
  {
    id:          'offer-builder',
    route:       '/tools/offer-builder',
    name:        'Offer Builder',
    tagline:     'Build a scoped offer and a price that doesn\'t leave money on the table.',
    category:    'revenue',
    status:      'preview',
    icon:        '💰',
    requiresProSuite: true,
  },
  {
    id:          'hiring-scorecard',
    route:       '/tools/hiring',
    name:        'Hiring Planner',
    tagline:     'Turn "I need to hire someone" into a role scorecard you can actually interview against.',
    category:    'team',
    status:      'preview',
    icon:        '🎯',
    requiresProSuite: true,
  },
  {
    id:          'org-chart',
    route:       '/tools/org-chart',
    name:        'Org Chart',
    tagline:     'Design the team you need next year, not the team you have today.',
    category:    'team',
    status:      'available',
    icon:        '🧩',
  },
  {
    id:          'team-newsletter',
    route:       '/tools/newsletter',
    name:        'Team Newsletter',
    tagline:     'Monthly update for your team — what we built, where we\'re headed, keep everyone aligned.',
    category:    'team',
    status:      'available',
    icon:        '📰',
  },
  // ── CRM-powered diagnostic tools ──────────────────────────────────────────
  // These read operational data (quotes, projects, time entries, invoices)
  // from the CRM and produce diagnostic intelligence the owner can't get
  // from either product alone. Until the CRM connector ships, every page
  // renders <CRMUpsellCard>. status='preview' so the Index card is clickable
  // (unlike 'coming-soon' which is non-interactive) and shows the upsell.
  {
    id:          'pipeline-to-hire',
    route:       '/tools/pipeline-to-hire',
    name:        'Pipeline-to-Hire',
    tagline:     'Hire the right person, the right week — based on the work you\'ve already won.',
    category:    'team',
    status:      'preview',
    icon:        '📅',
    requiresCRM: true,
  },
  {
    id:          'estimator-scorecard',
    route:       '/tools/estimator-scorecard',
    name:        'Estimator Scorecard',
    tagline:     'Win rate, bid accuracy, and what each estimator is sharpest at.',
    category:    'team',
    status:      'preview',
    icon:        '🎯',
    requiresCRM: true,
  },
  {
    id:          'foreman-scorecard',
    route:       '/tools/foreman-scorecard',
    name:        'Foreman Scorecard',
    tagline:     'Labour variance and on-time delivery, by foreman.',
    category:    'team',
    status:      'preview',
    icon:        '👷',
    requiresCRM: true,
  },
  {
    id:          'job-autopsy',
    route:       '/tools/job-autopsy',
    name:        'Job Autopsy',
    tagline:     'Why this job\'s margin came in below quote — line by line.',
    category:    'foundation',
    status:      'preview',
    icon:        '🔍',
    requiresCRM: true,
  },
  // ── Hidden (route alive, not advertised) ───────────────────────────────────
  {
    id:          'l10-meeting',
    route:       '/tools/l10',
    name:        'L10 Meeting',
    tagline:     'Run the EOS Level 10 meeting on rails — scorecard, rocks, IDS, next steps.',
    category:    'systems',
    status:      'coming-soon',
    icon:        '📋',
    hidden:      true,
  },
  {
    id:          'exit-readiness',
    route:       '/tools/exit-readiness',
    name:        'Exit Readiness',
    tagline:     'Score your business against what a buyer actually cares about. Find the gaps before they do.',
    category:    'exit',
    status:      'available',
    icon:        '🚪',
    hidden:      true,
  },
  {
    id:          'rocks-tracker',
    route:       '/tools/rocks',
    name:        'Rocks Tracker',
    tagline:     'Quarterly priorities, weekly status, zero spreadsheets.',
    category:    'systems',
    status:      'available',
    icon:        '🪨',
    hidden:      true,
  },
  // ── Virtual tool — Solomon saved answers ──────────────────────────────────
  // Not a real tool page — documents are saved from the Advisor chat via the
  // save button. Listed here so the Documents library can resolve the name/icon.
  {
    id:      'solomon',
    route:   '/advisor',
    name:    'Solomon',
    tagline: 'Saved advisor response.',
    category:'foundation',
    status:  'available',
    icon:    '💡',
    hidden:  true,  // not surfaced in /tools grid
  },
]

/**
 * Lookup by the string we store in `documents.tool_id`.
 * Safe to call with an unknown id — returns null so callers can render
 * "Unknown tool" gracefully instead of crashing.
 */
export function getToolById(toolId) {
  return TOOLS.find(t => t.id === toolId) ?? null
}

/**
 * Lookup by the URL route. Useful inside a tool page that wants to know
 * its own metadata without hardcoding it in the component.
 */
export function getToolByRoute(route) {
  return TOOLS.find(t => t.route === route) ?? null
}

/** All tools currently live and usable (includes hidden ones — they run fine). */
export function availableTools() {
  return TOOLS.filter(t => t.status === 'available')
}

/**
 * Tools whose route resolves to a real (clickable) page — `available` tools
 * AND `preview` tools (CRM-required upsell pages). Excludes `coming-soon`
 * because those have no route component yet.
 */
export function reachableTools() {
  return TOOLS.filter(t => t.status === 'available' || t.status === 'preview')
}

/**
 * Tools that should appear in navigation surfaces (sidebar, /tools grid).
 * Excludes `hidden: true` entries — the routes still work, but they don't
 * get advertised in the chrome. Used for discovery UIs.
 */
export function visibleTools() {
  return TOOLS.filter(t => !t.hidden)
}

/**
 * Navigation items for the sidebar Tools section. Only available + visible
 * tools get a link. Returns `{ to, label }` so the Sidebar can map over
 * it without knowing about the tools schema.
 */
export function toolsNavItems() {
  return visibleTools()
    .filter(t => t.status === 'available')
    .map(t => ({ to: t.route, label: t.name }))
}

/**
 * Category label → tools in that category. Preserves TOOLS array order.
 * Excludes hidden tools by default — the /tools grid doesn't need them.
 * Pass `{ includeHidden: true }` if you ever need the full map (e.g. an
 * admin-only debug view).
 */
export function toolsByCategory({ includeHidden = false } = {}) {
  const source = includeHidden ? TOOLS : visibleTools()
  const groups = new Map()
  for (const t of source) {
    if (!groups.has(t.category)) groups.set(t.category, [])
    groups.get(t.category).push(t)
  }
  return groups
}

export const CATEGORY_LABEL = {
  foundation: 'Foundation',
  systems:    'Systems',
  team:       'Team',
  revenue:    'Revenue',
  exit:       'Exit',
}
