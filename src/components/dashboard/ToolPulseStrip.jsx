/**
 * ToolPulseStrip — compact strip of "last run" cards for key tools.
 *
 * Only renders cards for tools that have actually been used — no empty
 * placeholder states. If nothing has been run yet, the strip returns null
 * and takes up no space.
 *
 * Each card shows:
 *   - Tool icon + name
 *   - Tool-specific key insight (grade, KPI, subject line, etc.)
 *   - How long ago it was last run
 *   - A direct link to the tool
 *
 * Props:
 *   toolDocs — Map<tool_id, document_row> — latest doc per tool.
 *              Built in Dashboard.jsx from the highlights fetch.
 */

import { Link } from 'react-router-dom'

// The tools we want to surface. Order determines display order.
const PULSE_TOOLS = [
  { id: 'cfo-dashboard',    icon: '📈', name: 'CFO',         route: '/tools/cfo',          accent: '#6366f1' },
  { id: 'cash-flow',        icon: '📊', name: 'Cash Flow',   route: '/tools/cash-flow',    accent: '#0d9488' },
  { id: 'team-newsletter',  icon: '📰', name: 'Newsletter',  route: '/tools/newsletter',   accent: '#8b5cf6' },
  { id: 'hiring-scorecard', icon: '🎯', name: 'Hiring',      route: '/tools/hiring',       accent: '#1cbe8c' },
  { id: 'gbp-optimizer',    icon: '📍', name: 'Visibility',  route: '/tools/gbp',          accent: '#10b981' },
  { id: 'offer-builder',    icon: '💰', name: 'Offer',       route: '/tools/offer-builder', accent: '#f97316' },
  { id: 'safety-vault',     icon: '🦺', name: 'Safety',      route: '/tools/safety',       accent: '#ef4444' },
]

// Grade → colour for the CFO badge
const GRADE_COLOR = {
  A: 'text-green-700 bg-green-100',
  B: 'text-brand-700 bg-brand-100',
  C: 'text-brand-700 bg-brand-100',
}

function gradeBadgeClass(grade) {
  const letter = (grade || '').trim().charAt(0).toUpperCase()
  return GRADE_COLOR[letter] ?? 'text-red-700 bg-red-100'
}

/** Extract the most meaningful 1-2 lines from a doc's output/input data. */
function extractInsight(toolId, doc) {
  const out = doc.output_data ?? {}
  const inp = doc.input_data  ?? {}

  switch (toolId) {
    case 'cfo-dashboard': {
      const grade  = out.health_grade ?? null
      const period = out.period_label || inp.period_label || null
      const topKpi = Array.isArray(out.kpis) ? out.kpis[0] : null
      return {
        badge:  grade,
        line1:  period ?? doc.title,
        line2:  topKpi ? `${topKpi.label}: ${topKpi.value}` : null,
      }
    }
    case 'team-newsletter': {
      const subject = out.subject ?? null
      const firstSection = Array.isArray(out.sections) ? out.sections[0]?.heading : null
      return {
        line1: subject ?? doc.title,
        line2: firstSection ?? null,
      }
    }
    case 'cash-flow': {
      const period = inp.period_label ?? out.period_label ?? null
      const runway = out.runway_weeks ? `${out.runway_weeks}w runway` : null
      return {
        line1: period ?? doc.title,
        line2: runway,
      }
    }
    case 'hiring-scorecard': {
      const role = out.role_title || inp.role_title || inp.role || null
      return {
        line1: role ?? doc.title,
        line2: null,
      }
    }
    case 'gbp-optimizer': {
      const topChange = out.top_changes?.[0] || out.actions?.[0] || null
      const line2 = typeof topChange === 'string' ? topChange.slice(0, 55) + (topChange.length > 55 ? '…' : '') : null
      return {
        line1: doc.title,
        line2: line2,
      }
    }
    case 'offer-builder': {
      const offer = out.offer_name || out.name || inp.offer_name || null
      return {
        line1: offer ?? doc.title,
        line2: out.price ? `Price: ${out.price}` : null,
      }
    }
    default:
      return { line1: doc.title, line2: null }
  }
}

/** Human-readable relative time: "Today", "Yesterday", "3 days ago", etc. */
function relativeTime(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function ToolPulseStrip({ toolDocs = {} }) {
  // Only show tools that have been run
  const active = PULSE_TOOLS.filter(t => toolDocs[t.id])
  if (active.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-400">
          Tool pulse
        </h2>
        <Link to="/tools" className="text-[10.5px] text-ink-400 hover:text-brand-500 transition-colors">
          All tools →
        </Link>
      </div>

      {/* Horizontal scrollable strip — wraps on wider viewports */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {active.map(tool => {
          const doc     = toolDocs[tool.id]
          const insight = extractInsight(tool.id, doc)
          const when    = relativeTime(doc.created_at)

          return (
            <Link
              key={tool.id}
              to={tool.route}
              className="group relative bg-white border border-ink-100 hover:border-ink-200 hover:shadow-sm rounded-xl p-3.5 transition-all duration-150 overflow-hidden flex flex-col gap-1.5"
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
                style={{ background: tool.accent }}
              />

              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{tool.icon}</span>
                  <span className="text-[10.5px] font-semibold text-ink-500 uppercase tracking-wide">
                    {tool.name}
                  </span>
                </div>
                {/* CFO grade badge */}
                {insight.badge && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${gradeBadgeClass(insight.badge)}`}>
                    {insight.badge}
                  </span>
                )}
              </div>

              {/* Key insight */}
              <div className="text-sm font-semibold text-ink-800 leading-snug line-clamp-1">
                {insight.line1}
              </div>
              {insight.line2 && (
                <div className="text-[11px] text-ink-400 leading-snug line-clamp-1">
                  {insight.line2}
                </div>
              )}

              {/* Footer row */}
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-[10px] text-ink-300">{when}</span>
                <span
                  className="text-[10px] font-semibold text-ink-400 group-hover:translate-x-0.5 transition-transform"
                  style={{ color: tool.accent }}
                >
                  →
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
