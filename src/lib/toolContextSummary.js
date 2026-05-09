/**
 * toolContextSummary — distill a BUSINESS_CONTEXT object into a small
 * structured "what fed this answer" summary.
 *
 * Why this exists:
 *   AI tools that won't tell you what they read feel like a black box.
 *   Saying "Based on: your business profile · 3 uploaded files · last
 *   quarter's P&L" turns a generated result into a transparent one — the
 *   owner can see at a glance whether the right inputs were in scope, and
 *   spot when something obvious is missing (e.g. P&L not synced).
 *
 * Two-step API:
 *   summarizeContext(context)         → structured object (or null)
 *   formatContextSummaryParts(summary) → array of human-readable strings
 *
 * The structured object is what gets persisted into documents.input_data
 * so the line keeps showing up when an old saved doc is reopened months
 * later — even if the underlying data has changed.
 */

/**
 * @param   {object|null|undefined} context  Output of buildAdvisorContext
 * @returns {object|null}                    Compact summary, or null if nothing to show
 */
export function summarizeContext(context) {
  if (!context) return null

  const summary = {}

  // Business profile presence (and the stage label that anchors so much advice).
  if (context.business?.name || context.business?.industry) {
    summary.business_profile_present = true
    if (context.stage) summary.stage = context.stage
  }

  // Roadmap — count alone is enough; we don't dump the milestones.
  if (context.roadmap?.total) {
    summary.milestone_count = context.roadmap.total
  }

  // Knowledge files — counts plus the first 3 titles for a sample line.
  // Financial snapshots are split out because they're a different kind of
  // input (auto-synced books vs. owner-uploaded reading material).
  const included = context.knowledge_files?.included ?? []
  if (included.length > 0) {
    const financial = included.filter(k => k?.kind === 'financial')
    const other     = included.filter(k => k?.kind !== 'financial')
    if (other.length > 0) {
      summary.knowledge_files = {
        count: other.length,
        names: other.slice(0, 3).map(k => k?.title).filter(Boolean),
      }
    }
    if (financial.length > 0) {
      // Newest snapshot title is descriptive ("Profit & Loss · Q4 2024")
      summary.financial_snapshots = {
        count:        financial.length,
        latest_label: financial[0]?.title ?? null,
      }
    }
  }

  // Library cross-analysis — boolean flag is enough.
  if (context.library_intelligence?.summary) {
    summary.library_analysis_present = true
  }

  // Long-term memory — Solomon retrieved past conversations relevant to the question.
  if (context.past_conversations) {
    summary.past_conversations_present = true
  }

  // Today's pulse — owner answered the daily check-in.
  if (context.today_pulse) {
    summary.today_pulse_present = true
  }

  return Object.keys(summary).length ? summary : null
}

/**
 * Turn a summary object into the human-readable parts that go between
 * "Based on:" and the join character. Each part is one chip.
 *
 * @param   {object|null} summary  From summarizeContext
 * @returns {string[]}             Empty array when nothing to show
 */
export function formatContextSummaryParts(summary) {
  if (!summary) return []
  const parts = []

  if (summary.business_profile_present) {
    parts.push(summary.stage
      ? `your business profile (${summary.stage} stage)`
      : 'your business profile')
  }

  if (summary.milestone_count) {
    parts.push(`${summary.milestone_count} roadmap milestone${summary.milestone_count === 1 ? '' : 's'}`)
  }

  if (summary.knowledge_files) {
    const k = summary.knowledge_files
    // If we've got 3 or fewer files AND we know all their titles, list them
    // by name — that's specific and easy to verify. Otherwise just count.
    if (k.count <= 3 && k.names.length === k.count) {
      parts.push(`${k.count} uploaded file${k.count === 1 ? '' : 's'}: ${k.names.join(', ')}`)
    } else {
      parts.push(`${k.count} uploaded file${k.count === 1 ? '' : 's'}`)
    }
  }

  if (summary.financial_snapshots) {
    const f = summary.financial_snapshots
    parts.push(f.latest_label
      ? `${f.latest_label} from your books`
      : `${f.count} financial snapshot${f.count === 1 ? '' : 's'}`)
  }

  if (summary.library_analysis_present) {
    parts.push('library cross-analysis')
  }

  if (summary.past_conversations_present) {
    parts.push('relevant past Solomon conversations')
  }

  if (summary.today_pulse_present) {
    parts.push("today's pulse check")
  }

  return parts
}
