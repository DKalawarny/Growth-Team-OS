import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { fetchIntegration } from '../../lib/quickbooks'
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
 * ⚠️ Repositioned Aug 2026. The pitch used to be "running a service business"
 * with "audit your Google listing" as the lead example. Both went with the
 * reposition: the buyer is defined by conviction rather than sector, and the
 * Google Business Profile audit is no longer surfaced anywhere in the product,
 * so leading with it advertised a thing nobody can find.
 *
 * ⭐ This page is NOT dead, despite SolomonLauncher saying the tools now happen
 * in conversation. It is the Cancel destination from eight tool pages and the
 * only route to six tools the launcher does not list (GBP, L10, job autopsy,
 * the two scorecards, pipeline-to-hire). Deleting it orphans them.
 *
 * When we launch a tool we flip its `status` to 'available' in src/lib/tools.js
 * — no change here. When we want a tool off this page without deleting it,
 * set `hidden: true` there.
 */
export default function ToolsIndex() {
  const grouped = toolsByCategory()
  const tools = visibleTools()
  const availableCount = tools.filter(t => t.status === 'available').length

  // ⭐ QuickBooks status belongs on THIS page, not only in Settings.
  //
  // The two tools people come here for — CFO Dashboard and Cash Flow — are
  // the two that need connected books, and the page said nothing about it.
  // Someone opens Cash Flow, finds it empty, and has no idea the fix is three
  // clicks away in a different section. Surfacing the state where the
  // dependency actually bites is the whole point.
  const { profile } = useAuth()
  const [qbo, setQbo] = useState(null)   // null = unknown, then true/false

  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false
    fetchIntegration(profile.company_id, 'quickbooks')
      .then(row => { if (!cancelled) setQbo(Boolean(row)) })
      .catch(() => { if (!cancelled) setQbo(false) })
    return () => { cancelled = true }
  }, [profile?.company_id])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Tools
        </h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl">
          Each one answers a single question and hands back a finished document,
          not another dashboard. Forecast the next thirteen weeks of cash,
          scorecard a hire, work through a decision. Everything saves to your{' '}
          <Link to="/documents" className="underline hover:text-gray-700">Documents library</Link>.
        </p>
        <p className="text-sm text-gray-500 mt-3 max-w-2xl">
          You can also just ask{' '}
          <Link to="/advisor" className="underline hover:text-gray-700">Solomon</Link>
          {' '}— he runs most of these from the conversation, with your numbers
          already loaded.
        </p>
        {/* ⚠️ No cadence promise here. It used to say "more rolling out
            weekly", which was a commitment nobody was keeping. */}
        <p className="text-xs text-gray-400 mt-3">
          {availableCount} of {tools.length} available
        </p>

        {/* Only rendered once we know — a "not connected" flash on every load
            for someone who IS connected reads as a bug. */}
        {qbo === false && (
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
            <span className="text-sm text-ink-700">
              <strong className="font-semibold">QuickBooks is not connected.</strong>
              {' '}Finances and Cash Flow work from your real numbers once it is.
            </span>
            <Link
              to="/settings/integrations"
              className="text-sm font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              Connect it →
            </Link>
          </div>
        )}
        {qbo === true && (
          <p className="mt-4 text-xs text-ink-400">
            QuickBooks connected ·{' '}
            <Link to="/settings/integrations" className="underline hover:text-ink-600">manage</Link>
          </p>
        )}
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
  // Three states:
  //   'available' → clickable, green Live badge
  //   'preview'   → clickable, amber Needs CRM badge (cross-system tools)
  //   'coming-soon' → not clickable, dimmed
  const clickable = tool.status === 'available' || tool.status === 'preview'

  const badge = (() => {
    if (tool.status === 'available') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Live
        </span>
      )
    }
    if (tool.status === 'preview') {
      return (
        // ⚠️ Was "Needs ProSuite" — a partner product that does not exist yet
        // (see CLAUDE.md). Telling an owner a tool is gated behind something
        // he cannot buy is worse than saying it is not ready.
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 bg-ink-100 border border-ink-200 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-400" />
          Preview
        </span>
      )
    }
    return (
      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
        Coming soon
      </span>
    )
  })()

  const body = (
    <>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl" aria-hidden>{tool.icon}</span>
        {badge}
      </div>
      <h3 className={`text-base font-semibold mb-1 ${clickable ? 'text-gray-900' : 'text-gray-700'}`}>
        {tool.name}
      </h3>
      <p className={`text-sm leading-relaxed ${clickable ? 'text-gray-600' : 'text-gray-500'}`}>
        {tool.tagline}
      </p>
    </>
  )

  const baseClass = 'block rounded-xl border p-5 transition-all'

  if (tool.status === 'available') {
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

  if (tool.status === 'preview') {
    return (
      <Link
        to={tool.route}
        className={`${baseClass} border-brand-200 bg-brand-50/40 hover:border-brand-300 hover:shadow-sm`}
      >
        {body}
        <div className="mt-3 text-xs text-brand-800 font-medium">
          See preview →
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
