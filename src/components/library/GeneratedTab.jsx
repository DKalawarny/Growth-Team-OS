import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { TOOLS, getToolById } from '../../lib/tools'
import { ANALYSIS_TOOL_ID } from '../../lib/libraryAnalysis'
import HiringScorecard from '../tools/HiringScorecard'
import ExitReadinessReport from '../tools/ExitReadinessReport'
import OfferBuilderCard from '../tools/OfferBuilderCard'
import OrgChartView from '../tools/OrgChartView'
import CashFlowPlan from '../tools/CashFlowPlan'
import CFODashboardView from '../tools/CFODashboardView'
import RocksPlan from '../tools/RocksPlan'
import GBPAudit from '../tools/GBPAudit'
import NewsletterView from '../tools/NewsletterView'
import ContextUsedLine from '../tools/ContextUsedLine'

/**
 * GeneratedTab — tool outputs (scorecards, plans, offers).
 *
 * Changes from previous version:
 * - FilterChip pills → compact <select> dropdown
 * - Individual row cards → single container card with divider lines
 * - Inline expansion → slide-over panel (right-side overlay)
 * - Emits count via onCountChange prop so parent can show badge
 */
export default function GeneratedTab({ onCountChange }) {
  const { profile }             = useAuth()
  const [docs, setDocs]         = useState(null)
  const [error, setError]       = useState(null)
  const [slideDoc, setSlideDoc] = useState(null)
  const [params, setParams]     = useSearchParams()
  const toolFilter              = params.get('tool') || 'all'

  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false

    ;(async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, tool_id, title, tags, input_data, output_data, created_at')
        .eq('company_id', profile.company_id)
        .neq('tool_id', ANALYSIS_TOOL_ID)
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (error) { setError(error.message); setDocs([]) }
      else        { setDocs(data ?? []) }
    })()

    return () => { cancelled = true }
  }, [profile?.company_id])

  // Report count to parent header
  useEffect(() => {
    if (docs !== null && onCountChange) onCountChange(docs.length)
  }, [docs, onCountChange])

  const visibleDocs = useMemo(() => {
    if (!docs) return []
    return toolFilter === 'all' ? docs : docs.filter(d => d.tool_id === toolFilter)
  }, [docs, toolFilter])

  const usedToolIds = useMemo(() => {
    if (!docs) return []
    return [...new Set(docs.map(d => d.tool_id))]
  }, [docs])

  const setFilter = (toolId) => {
    const next = new URLSearchParams(params)
    if (toolId === 'all') next.delete('tool')
    else next.set('tool', toolId)
    setParams(next)
  }

  // ---- loading ----

  if (docs === null) {
    return (
      <div className="bg-white border border-ink-100 rounded-xl overflow-hidden shadow-sm">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 border-b border-ink-100 last:border-0 px-4 flex items-center gap-3">
            <div className="w-6 h-6 bg-ink-100 rounded animate-pulse flex-shrink-0" />
            <div className="h-4 w-48 bg-ink-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
        Couldn't load documents: {error}
      </div>
    )
  }

  if (docs.length === 0) return <GeneratedEmpty />

  return (
    <>
      {/* Compact filter row */}
      <div className="flex items-center gap-2 mb-4">
        <label className="text-xs text-ink-500 font-medium flex-shrink-0">Filter</label>
        <select
          value={toolFilter}
          onChange={e => setFilter(e.target.value)}
          className="text-xs border border-ink-200 rounded-lg px-2.5 py-1.5 bg-white text-ink-700 font-medium focus:outline-none focus:border-brand-400 transition-colors"
        >
          <option value="all">All ({docs.length})</option>
          {usedToolIds.map(id => {
            const tool  = getToolById(id)
            const count = docs.filter(d => d.tool_id === id).length
            return (
              <option key={id} value={id}>
                {tool?.name ?? id} ({count})
              </option>
            )
          })}
        </select>
      </div>

      {/* Single-card list with dividers */}
      {visibleDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center text-sm text-ink-400">
          No documents for this tool yet.
        </div>
      ) : (
        <div className="bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden">
          {visibleDocs.map(doc => (
            <Row key={doc.id} doc={doc} onOpen={() => setSlideDoc(doc)} />
          ))}
        </div>
      )}

      {/* Slide-over detail panel */}
      {slideDoc && (
        <SlideOver doc={slideDoc} onClose={() => setSlideDoc(null)} />
      )}
    </>
  )
}

// ── Row (divider style — no individual card) ──────────────────────────────────

function Row({ doc, onOpen }) {
  const tool = getToolById(doc.tool_id)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-ink-50 transition-colors border-b border-ink-100 last:border-0"
    >
      <span className="text-lg flex-shrink-0" aria-hidden>{tool?.icon ?? '📄'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink-900 truncate">{doc.title}</div>
        <div className="text-xs text-ink-400 mt-0.5">
          {tool?.name ?? doc.tool_id} · {formatDate(doc.created_at)}
        </div>
      </div>
      <span className="text-ink-300 text-xs flex-shrink-0">View →</span>
    </button>
  )
}

// ── Slide-over overlay ────────────────────────────────────────────────────────

function SlideOver({ doc, onClose }) {
  const tool = getToolById(doc.tool_id)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl border-l border-ink-100 z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ink-100 flex-shrink-0 bg-white">
          <span className="text-xl flex-shrink-0" aria-hidden>{tool?.icon ?? '📄'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-ink-900 truncate">{doc.title}</div>
            <div className="text-xs text-ink-400 mt-0.5">
              {tool?.name ?? doc.tool_id} · {formatDate(doc.created_at)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center text-xl text-ink-400 hover:text-ink-700 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Detail doc={doc} />
        </div>
      </div>
    </>
  )
}

// ── Tool-specific renderers ───────────────────────────────────────────────────

function Detail({ doc }) {
  const summary = doc.input_data?.context_summary ?? null
  const body = renderToolBody(doc)
  return (
    <div className="space-y-4">
      <ContextUsedLine summary={summary} />
      {body}
    </div>
  )
}

function renderToolBody(doc) {
  if (doc.tool_id === 'hiring-scorecard') return <HiringScorecard data={doc.output_data} />
  if (doc.tool_id === 'exit-readiness')   return <ExitReadinessReport data={doc.output_data} />
  if (doc.tool_id === 'offer-builder')    return <OfferBuilderCard data={doc.output_data} />
  if (doc.tool_id === 'org-chart')        return <OrgChartView data={doc.output_data} />
  if (doc.tool_id === 'cash-flow')        return <CashFlowPlan data={doc.output_data} />
  if (doc.tool_id === 'cfo-dashboard')    return <CFODashboardView data={doc.output_data} />
  if (doc.tool_id === 'rocks-tracker')    return <RocksPlan data={doc.output_data} />
  if (doc.tool_id === 'gbp-optimizer')    return <GBPAudit data={doc.output_data} />
  if (doc.tool_id === 'team-newsletter')  return <NewsletterView data={doc.output_data} />
  return (
    <pre className="text-xs text-ink-700 bg-ink-50 border border-ink-100 rounded p-3 overflow-x-auto">
      {JSON.stringify(doc.output_data, null, 2)}
    </pre>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function GeneratedEmpty() {
  return (
    <div className="bg-white border border-ink-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-ink-900 px-6 py-4">
        <span className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400">
          Generated documents
        </span>
      </div>
      <div className="p-10 text-center">
        <div className="text-4xl mb-3" aria-hidden>📄</div>
        <h2 className="text-lg font-bold text-ink-900 mb-1 tracking-tight">Nothing generated yet</h2>
        <p className="text-sm text-ink-500 max-w-md mx-auto mb-6 leading-relaxed">
          Run a tool — like the Hiring Planner — and the output shows up here.
        </p>
        <Link
          to="/tools"
          className="inline-flex items-center px-4 py-2.5 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold transition-colors glow-gold-sm"
        >
          Browse tools →
        </Link>
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {TOOLS.filter(t => t.status === 'available').map(t => (
            <Link
              key={t.id} to={t.route}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-50 hover:bg-ink-100 text-ink-700 text-xs font-medium transition-colors border border-ink-100"
            >
              <span aria-hidden>{t.icon}</span>
              <span>{t.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
