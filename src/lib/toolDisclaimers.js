/**
 * toolDisclaimers — sharp, contextual one-liners shown under every tool
 * result.
 *
 * Why a per-tool map (not one generic banner):
 *   A blanket "AI may make mistakes" disclaimer goes unread. A specific
 *   sentence — "this is hiring strategy, not employment law" — sets the
 *   right expectation for THIS output, and quietly does the legal-cover
 *   work without preaching.
 *
 * Pattern: "what this is + what it isn't + who decides."
 *   - Under 35 words, one sentence.
 *   - Where relevant, points to the rule-holder for legal/safety topics.
 *   - Plain English. No "users should be advised."
 *
 * Keys are `tool_id` — same as documents.tool_id and the registry in
 * lib/tools.js. Add a new entry whenever a new tool ships.
 */

export const TOOL_DISCLAIMERS = {
  'cfo-dashboard':
    'Commentary is AI-generated from the books you connected. Treat it as a discussion starter for you and your accountant — not a tax filing or financial advice.',

  'cash-flow':
    'A 13-week projection from the inputs you gave. Forecasts move when reality does — re-run when payroll, big invoices, or a new contract changes.',

  'hiring-scorecard':
    'This is hiring strategy — not employment law. Probation, classification, termination and pay rules vary by jurisdiction; check your provincial Employment Standards branch before anything goes in writing.',

  'org-chart':
    'A structural draft based on your team and stage. Adjust it to fit how your people actually work — names and reporting lines are your call.',

  'offer-builder':
    'Draft offer copy and pricing logic. Read it like a customer would, then ship the version YOU\'D buy.',

  'gbp-optimizer':
    'AI audit of public signals. Suggested copy and changes are drafts — review before publishing anything to your live Google Business profile or website.',

  'safety-vault':
    'A tracker, not a compliance audit. Workplace-safety rules vary by province — final compliance call sits with your WCB or OHS authority.',

  'exit-readiness':
    'A directional self-score, not a valuation. Get a real broker valuation before any negotiation.',

  'rocks-tracker':
    'Suggested 90-day rocks based on your roadmap. Edit them so they match what your team actually committed to — they only work when the team owns them.',

  'team-newsletter':
    'A drafted newsletter from your context. Read it, edit the voice to match yours, then send.',

  'pipeline-to-hire':
    'A directional read on when to start the search — not a guarantee the work will land. Re-run as the pipeline shifts; treat the dates as guideposts, not deadlines.',

  'estimator-scorecard':
    'Pattern recognition from your bid history — not a verdict on any individual quote. Use it to start coaching conversations, not finish them.',

  'foreman-scorecard':
    'Variance from time-tracking and planned hours. Context — weather, scope changes, crew sickness — may explain individual jobs. Read it as a signal, not a grade.',

  'job-autopsy':
    'A post-mortem on one job\'s numbers — not a critique of the team or PM. Use it to refine the next quote, not to grade the last one.',
}

/**
 * Get the disclaimer for a given tool_id.
 *
 * @param   {string|null|undefined} toolId
 * @returns {string|null}                 The one-liner, or null if unknown.
 */
export function getToolDisclaimer(toolId) {
  if (!toolId) return null
  return TOOL_DISCLAIMERS[toolId] ?? null
}
