import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getMonthlyUsageSummary } from '../../lib/usage'
import { getToolById } from '../../lib/tools'

/**
 * UsageSection — sits in Settings. Shows this month's per-tool run counts
 * vs. the configured cap.
 *
 * One query, one render. No live polling — owners don't stare at this page,
 * they hit it when the cap modal sends them here. Re-fetching on mount is
 * enough.
 *
 * Cap is stored on `companies.monthly_tool_cap` and defaults to 10. Owners
 * who want more get it raised via SQL by an admin:
 *
 *   UPDATE companies SET monthly_tool_cap = 100 WHERE id = '<uuid>';
 *
 * Deliberately customer-facing: we do NOT surface per-call or aggregate USD
 * cost here. Those are our cost of goods sold (Anthropic + Places API spend)
 * and have no business being on a $97/month customer's settings page —
 * showing them invites the wrong mental model ("am I burning their credits?")
 * and exposes margin info that's none of the user's concern. The cost data
 * is still recorded on `usage_events` for internal analytics; it just stays
 * out of the UI.
 */

export default function UsageSection() {
  const { profile } = useAuth()
  const companyId = profile?.company_id

  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const s = await getMonthlyUsageSummary(companyId)
      if (!cancelled) {
        setSummary(s)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [companyId])

  // Reset date — same calendar-month rule as the cap check in usage.js.
  const resetLabel = formatResetDate()

  return (
    <section className="mt-10 bg-white border border-gray-200 rounded-xl p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">This month's usage</h2>
        <p className="text-sm text-gray-500 mt-1">
          Each tool resets to zero on <span className="font-medium text-gray-700">{resetLabel}</span>.
          Need a higher cap? <a href="mailto:support@leadeos.com" className="text-brand-600 hover:underline">Get in touch</a>.
        </p>
      </header>

      {loading && (
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        </div>
      )}

      {!loading && summary && (
        <>
          {summary.byTool.length === 0 ? (
            <p className="text-sm text-gray-500">
              You haven't run any tools yet this month.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {summary.byTool.map(row => (
                <ToolRow key={row.tool_id} row={row} cap={summary.cap} />
              ))}
            </ul>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              {summary.totalEvents} call{summary.totalEvents === 1 ? '' : 's'} this month
            </span>
          </div>
        </>
      )}
    </section>
  )
}

// ----------------------------------------------------------------------------
// Row
// ----------------------------------------------------------------------------

/**
 * ⚠️ Mirrors TOOL_CAP_EXEMPT in supabase/functions/claude/index.ts. These
 * buckets are metered by SPEND, not by run count, so rendering them against
 * the per-tool cap is simply wrong — the panel was showing "untagged 7 / 10"
 * with an almost-full amber-bound bar for a bucket that can never hit a cap.
 * An owner reading that sees themselves three runs from being cut off.
 *
 * The server is the authority; if it grows a new exemption, add it here too.
 */
const CAP_EXEMPT = new Set(['advisor', 'morning-opener', 'solomon-memory', 'untagged', 'library-analysis'])

// "untagged" is a server-side default, not a name for a person to read.
const EXEMPT_LABELS = {
  'advisor':         'Solomon conversations',
  'morning-opener':  'Daily openers',
  'solomon-memory':  'Remembering what you said',
  'library-analysis':'Library analysis',
  'untagged':        'Background work',
}

function ToolRow({ row, cap }) {
  const tool   = getToolById(row.tool_id)
  const exempt = CAP_EXEMPT.has(row.tool_id)
  const label  = EXEMPT_LABELS[row.tool_id] ?? tool?.name ?? row.tool_id
  const icon   = exempt ? '∞' : (tool?.icon ?? '•')
  const pct    = cap > 0 ? Math.min(100, Math.round((row.count / cap) * 100)) : 0
  const atCap  = !exempt && row.count >= cap

  return (
    <li className="p-3 flex items-center gap-4">
      <span className="text-xl flex-shrink-0 w-8 text-center" aria-hidden="true">{icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{label}</span>
          <span className={`text-xs font-mono flex-shrink-0 ${atCap ? 'text-amber-700' : 'text-gray-500'}`}>
            {exempt ? `${row.count} · no limit` : `${row.count} / ${cap}`}
          </span>
        </div>
        {!exempt && (
          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${atCap ? 'bg-amber-500' : 'bg-brand-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </li>
  )
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** "May 1, 2026" — matches the CapExceededNotice formatting. */
function formatResetDate() {
  const d = new Date()
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  return next.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}
