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

  'decision':
    'Solomon argued this more than one way and told you where he lands — that is a structured opinion, not a verdict. He also names what he cannot see; read that part before you act on the recommendation.',

  'solomon':
    'Saved from a conversation with Solomon. It reflects what he could see at the time — if your numbers or your situation have moved since, so has the answer.',

  'team-newsletter':
    'A drafted newsletter from your context. Read it, edit the voice to match yours, then send.',




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
