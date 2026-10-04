/**
 * ⭐⭐ WHO CAN SEE WHAT IN ELIV8 OS — the one table everything else follows.
 *
 * Daniel, 1 Sep: "there should still be an option for like a CEO or something to
 * have full access once that person is at that, the owner won't always want
 * this." Settled 2 Sep as PRESETS, not a checkbox matrix (permissions fail
 * silently, and a grid of toggles nobody can test is how a foreman ends up
 * reading the P&L). Decided 3 Oct: `admin` IS the "runs it" seat, and crews
 * stay on magic links — there is no crew login.
 *
 * 🔴🔴 THE DATABASE IS THE BOUNDARY. This file decides what the MENUS and
 * ROUTES show so nobody lands on an empty screen; it protects nothing on its
 * own. The same areas are enforced in Postgres by `public.can_area()`
 * (migration 075), and the two lists must say the same thing — access.test.js
 * holds this side, the second-account probe in the migration's notes the other.
 *
 * Areas:
 *   lead    — Solomon, the roadmap, succession, the plan tools, business
 *             settings, integrations. Owner + whoever runs it.
 *   office  — the money and the library: finances, cash flow, documents and
 *             everything uploaded. Owner, runs it, office.
 *   owner   — billing, deleting the workspace, granting or removing access.
 *   all     — the work itself: the board, daily logs, playbooks, help, safety.
 */
export const ROLE_AREAS = {
  owner:   ['owner', 'lead', 'office', 'all'],
  admin:   ['lead', 'office', 'all'],
  cfo:     ['office', 'all'],
  manager: ['all'],
  safety:  ['all'],
  member:  ['all'],
}

/** What each role is called in the app. The enum names are internal. */
export const ROLE_LABEL = {
  owner:   'Owner',
  admin:   'Runs the business',
  cfo:     'Office',
  manager: 'Operations',
  safety:  'Operations',
  member:  'Operations',
}

/** One line each, shown when the owner picks a role for someone. */
export const ROLE_DESCRIPTION = {
  admin:   'Everything you see, including Solomon and the finances — except billing, deleting the workspace, and adding or removing people.',
  cfo:     'The finances, cash flow and documents, plus the work board and logs. Not Solomon, the roadmap or succession.',
  manager: 'The work itself: the work board, daily logs, playbooks and safety. No finances, documents or Solomon.',
}

/** The roles an owner can give someone, in the order they are offered. */
export const GRANTABLE_ROLES = ['admin', 'cfo', 'manager']

export function can(role, area) {
  return (ROLE_AREAS[role] ?? []).includes(area)
}

/**
 * Route → area. Anything not listed is 'all'. Matched by prefix, longest first,
 * so /settings/billing is 'owner' while /settings itself is 'all'.
 */
export const ROUTE_AREA = {
  '/dashboard':            'lead',
  '/advisor':              'lead',
  '/roadmap':              'lead',
  '/checkins':             'lead',
  '/trajectories':         'lead',
  '/context':              'lead',
  '/analytics':            'office',
  '/documents':            'office',
  '/settings/business':    'lead',
  '/settings/integrations':'lead',
  '/settings/billing':     'owner',
  '/settings/team':        'owner',
  '/settings/danger':      'owner',
  '/tools/cfo':            'office',
  '/tools/cash-flow':      'office',
  '/tools/exit-readiness': 'lead',
  '/tools/decision':       'lead',
  '/tools/hiring':         'lead',
  '/tools/offer-builder':  'lead',
  '/tools/org-chart':      'lead',
  '/tools/rocks':          'lead',
  '/tools/newsletter':     'lead',
  '/tools/gbp':            'lead',
  '/tools/safety':         'all',
  '/tools':                'all',
}

const ROUTES_LONGEST_FIRST = Object.keys(ROUTE_AREA).sort((a, b) => b.length - a.length)

export function areaForPath(path) {
  const hit = ROUTES_LONGEST_FIRST.find(p => path === p || path.startsWith(`${p}/`))
  return hit ? ROUTE_AREA[hit] : 'all'
}

export function canVisit(role, path) {
  return can(role, areaForPath(path))
}

/** Where each role lands when it opens the app, or hits a page it cannot use. */
export function homeFor(role) {
  if (can(role, 'lead')) return '/dashboard'
  if (can(role, 'office')) return '/tools/cfo'
  return '/board'
}
