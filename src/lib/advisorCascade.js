/**
 * advisorCascade.js — model picker for Solomon turns
 *
 * The big remaining cost lever after the Haiku compressor: route the actual
 * answer call to Haiku when the turn is a factual lookup, keep Sonnet for
 * strategic synthesis. Sonnet's reasoning quality matters when the owner
 * asks "should I hire a second crew?" — it doesn't matter when the owner
 * asks "what does our confined-space SOP say?".
 *
 * Cost math (per turn, rough):
 *   Sonnet:  $3/MT in, $15/MT out
 *   Haiku:   $0.80/MT in, $4/MT out
 *   Haiku is ~4× cheaper on input, ~4× cheaper on output — call it ~75%
 *   savings on the answer call.
 *
 * Latency math:
 *   Haiku first-token-latency is ~250-400ms vs. Sonnet's ~600-900ms.
 *   So Haiku-routed turns also FEEL faster.
 *
 * ----------------------------------------------------------------------
 * Routing rules (all heuristic — no classifier API call)
 *
 *   ROUTE TO HAIKU when ALL of these hold:
 *     1. context.safety_context is populated (we have a brief or raw chunks)
 *        — meaning retrieval found something the answer can quote from
 *     2. The question reads like a factual lookup, not strategy
 *        — "what does X say?", "when do I report?", "how do I file?"
 *     3. The question is NOT marked as strategic
 *        — no "should I", "thinking about", "advice on", "what would you"
 *
 *   ROUTE TO SONNET (default) for everything else:
 *     - Open-ended coaching questions
 *     - Strategy / decisions / trade-offs
 *     - Anything where context.safety_context is null
 *     - Multi-domain questions ("we had an injury AND I need to fire him")
 *
 * The conservative bias is deliberate. False negatives (routing to Sonnet
 * when Haiku would've sufficed) cost a few cents. False positives (routing
 * to Haiku when Sonnet was needed) cost trust — owner gets a thinner
 * answer to a strategic question. We'd rather waste pennies than waste
 * trust.
 * ----------------------------------------------------------------------
 */

import { SONNET, HAIKU } from './anthropic'

// ── Patterns ─────────────────────────────────────────────────────────────

// Lookup-style openings — these are factual-retrieval questions where
// quoting from a brief is exactly the right answer shape.
const LOOKUP_PATTERNS = [
  /^\s*what\s+(does|is|are|does it|do)\b/i,
  /^\s*when\s+(do|does|should|must)\s+(i|we|you)\b/i,
  /^\s*how\s+(do|does|long|often)\s+(i|we|you|it)\b/i,
  /^\s*where\s+(do|does|is|can)\s+(i|we|you|it)\b/i,
  /^\s*can\s+(i|we|you)\s+(find|see|look\s*up|check)\b/i,
  /^\s*(is|are)\s+(there|we)\b.*\?/i,
  /\bwhat'?s?\s+(the|our)\s+(rule|regulation|deadline|requirement|SOP|policy)\b/i,
  /\bwhat\s+does\s+(the|our|my)\s+(SOP|policy|document|reg|regulation)\b/i,
  /\bread\s+(me|out)\s+the\b/i,
  /\bdo\s+we\s+have\s+(a|an|any)\b/i,
]

// Strategy markers — keep on Sonnet even if a lookup pattern also matched.
// Better to over-spend on a strategic question than under-deliver.
const STRATEGY_MARKERS = [
  /\bshould\s+(i|we)\b/i,
  /\bthinking\s+about\b/i,
  /\bconsidering\b/i,
  /\badvice\s+(on|about|for)\b/i,
  /\bwhat\s+would\s+you\b/i,
  /\bdo\s+you\s+(think|recommend|suggest)\b/i,
  /\b(better|worse|vs\.?|versus|compared\s+to)\b/i,
  /\bhow\s+would\s+you\b/i,
  /\bworth\s+(it|the)\b/i,
  /\bplan(ning)?\s+(to|for)\b/i,
  /\bweighing\b/i,
  /\btrying\s+to\s+decide\b/i,
]


/**
 * Pick the model for this turn.
 *
 * @param {string}      userMessage  The text the owner just sent
 * @param {object|null} context      Result of buildAdvisorContext()
 * @returns {string}                 SONNET or HAIKU constant
 */
export function pickAdvisorModel(userMessage, context) {
  // No context at all → default Sonnet. We don't try to be clever for
  // first-turn / cold-start cases.
  if (!context) return SONNET

  // Without retrieval-grounded safety context, Haiku can't quote from a
  // brief — so its smaller reasoning isn't backed by anything. Default
  // to Sonnet which can at least bring training-data knowledge to bear.
  if (!context.safety_context) return SONNET

  if (!userMessage || typeof userMessage !== 'string') return SONNET

  // Strategy markers ALWAYS keep us on Sonnet — even if a lookup pattern
  // also matched. "Should I update our confined-space SOP?" has both
  // signals; we want the strategic answer.
  for (const re of STRATEGY_MARKERS) {
    if (re.test(userMessage)) return SONNET
  }

  // Lookup pattern + populated safety_context = Haiku is sufficient.
  for (const re of LOOKUP_PATTERNS) {
    if (re.test(userMessage)) return HAIKU
  }

  // Safety context exists but the question doesn't look lookup-style.
  // Default Sonnet — could be a nuanced safety question that needs
  // synthesis (e.g. "we have crew working with both silica and asbestos
  // exposure — how do we sequence the controls?").
  return SONNET
}


/**
 * Telemetry helper — returns a single-word label for logging which model
 * was chosen and why. Useful for "show me what % of turns Haiku handles"
 * dashboards without having to re-parse the heuristics elsewhere.
 *
 * @param {string}      userMessage
 * @param {object|null} context
 * @returns {{ model: string, reason: string }}
 */
export function explainModelChoice(userMessage, context) {
  if (!context)                          return { model: SONNET, reason: 'no_context' }
  if (!context.safety_context)           return { model: SONNET, reason: 'no_safety_context' }
  if (!userMessage)                      return { model: SONNET, reason: 'empty_message' }

  for (const re of STRATEGY_MARKERS) {
    if (re.test(userMessage))            return { model: SONNET, reason: 'strategy_marker' }
  }
  for (const re of LOOKUP_PATTERNS) {
    if (re.test(userMessage))            return { model: HAIKU,  reason: 'safety_lookup' }
  }
  return { model: SONNET, reason: 'safety_context_but_not_lookup' }
}
