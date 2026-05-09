import { Link } from 'react-router-dom'
import { CATEGORY_LABEL, toolsByCategory, visibleTools } from '../../lib/tools'

/**
 * /tools — the Tools landing page.
 *
 * Shows every visible tool as a card, grouped by category. Each card is:
 *   - Available: clickable, routes to the tool page
 *   - Coming soon: dimmed, non-interactive, tooltip explains the state
 *
 * Why grouped by category: matches the roadmap milestone categories so the
 * owner mentally maps "my roadmap says I need to work on Team" → the Team
 * tools column.
 *
 * Post-niche-pivot (April 2026): copy is written for home-services business
 * owners. The tools themselves are neutral — a plumber and a marketing agency
 * can both use the Hiring Planner — but the pitch on this page is "running a
 * service business" so the first-glance read is clear.
 *
 * When we launch a tool we flip its `status` to 'available' in src/lib/tools.js
 * — no change here. When we want a tool off this page without deleting it,
 * set `hidden: true` there.
 */
export default function ToolsIndex() {
  const grouped = toolsByCategory()
  const tools = visibleTools()
  const availableCount = tools.filter(t => t.status === 'available').length

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Tools for running your service business
        </h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl">
          Each tool answers one question and hands back a finished document —
          not another dashboard. Audit your Google listing, forecast cash for
          the next 13 weeks, scorecard your next hire. Everything saves to your{' '}
          <Link to="/documents" className="underline hover:text-gray-700">Documents library</Link>.
        </p>
        <p className="text-xs text-gray-400 mt-3">
          {availableCount} of {tools.length} tools live · more rolling out weekly
        </p>
      </header>

      <div className="space-y-8">
        {[...grouped.entries()].map(([category, tools]) => (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {CATEGORY_LABEL[category] ?? category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function ToolCard({ tool }) {
  const available = tool.status === 'available'

  // Card body is the same in both cases; only the wrapper element differs
  // (Link when available, div when not). Extracted so we don't duplicate.
  const body = (
    <>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl" aria-hidden>{tool.icon}</span>
        {available ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Live
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            Coming soon
          </span>
        )}
      </div>
      <h3 className={`text-base font-semibold mb-1 ${available ? 'text-gray-900' : 'text-gray-700'}`}>
        {tool.name}
      </h3>
      <p className={`text-sm leading-relaxed ${available ? 'text-gray-600' : 'text-gray-500'}`}>
        {tool.tagline}
      </p>
    </>
  )

  const baseClass = 'block rounded-xl border p-5 transition-all'

  if (available) {
    return (
      <Link
        to={tool.route}
        className={`${baseClass} border-gray-200 bg-white hover:border-brand-300 hover:shadow-sm`}
      >
        {body}
        <div className="mt-3 text-xs text-brand-700 font-medium">
          Open tool →
        </div>
      </Link>
    )
  }

  return (
    <div
      className={`${baseClass} border-dashed border-gray-200 bg-gray-50/50 cursor-not-allowed`}
      aria-disabled="true"
      title="This tool is in the pipeline — coming soon."
    >
      {body}
    </div>
  )
}
