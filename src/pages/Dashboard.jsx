import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { detectStage } from '../lib/stageEngine'
import {
  computeWeightedProgress,
  classifyAll,
  todayYmd,
} from '../lib/milestoneProgress'
import { getLibraryAnalysis, ANALYSIS_TOOL_ID } from '../lib/libraryAnalysis'

import NextFocusCard      from '../components/dashboard/NextFocusCard'
import RecentActivity     from '../components/dashboard/RecentActivity'
import DashboardCalendar  from '../components/dashboard/DashboardCalendar'
import RoadmapStrip       from '../components/dashboard/RoadmapStrip'
import ExecutiveBriefCard from '../components/dashboard/ExecutiveBriefCard'
import AdvisorTeaser      from '../components/dashboard/DailyPulse'
import TrajectorySection  from '../components/dashboard/TrajectorySection'
import QuickActions       from '../components/dashboard/QuickActions'
import Hero               from '../components/dashboard/Hero'
import KpiRow             from '../components/dashboard/KpiRow'
import ToolPulseStrip     from '../components/dashboard/ToolPulseStrip'
import OverdueMilestonesAlert from '../components/dashboard/OverdueMilestonesAlert'

/**
 * Dashboard — Option A redesign.
 *
 * Layout:
 *   1. Slim dark header bar   — greeting, company, stage, inline stats
 *   2. Chat panel (full-width) — the daily advisor chat, prominent
 *   3. KPI strip               — plan %, focus count, check-in, P&L
 *   4. Content grid            — Next Focus + Quick Actions / Recent Activity
 *   5. Roadmap strip
 */

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function daysBetween(iso, now) {
  const past = new Date(iso).getTime()
  if (!Number.isFinite(past)) return null
  return Math.max(0, Math.floor((now.getTime() - past) / (1000 * 60 * 60 * 24)))
}

export default function Dashboard() {
  const { profile, company } = useAuth()
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false

    ;(async () => {
      const [bpRes, msRes, ciRes, docsRes, pnlRes, intRes, analysis] = await Promise.all([
        supabase.from('business_profiles').select('*').eq('company_id', profile.company_id).maybeSingle(),
        supabase.from('milestones').select('*').eq('company_id', profile.company_id).order('sort_order', { ascending: true }),
        supabase.from('checkins').select('id, win, revenue_update, created_at').eq('company_id', profile.company_id).order('created_at', { ascending: false }).limit(5),
        supabase.from('documents').select('id, tool_id, title, created_at, output_data, input_data').eq('company_id', profile.company_id).neq('tool_id', ANALYSIS_TOOL_ID).order('created_at', { ascending: false }).limit(30),
        supabase.from('financial_snapshots').select('period_label, synced_at, period_end').eq('company_id', profile.company_id).eq('report_type', 'profit_and_loss').order('period_end', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
        supabase.from('integrations').select('status').eq('company_id', profile.company_id).eq('provider', 'quickbooks').maybeSingle(),
        getLibraryAnalysis(profile.company_id).catch(() => null),
      ])
      if (cancelled) return
      setState({
        loading:         false,
        businessProfile: bpRes.data   ?? null,
        milestones:      msRes.data   ?? [],
        checkins:        ciRes.data   ?? [],
        documents:       docsRes.data ?? [],
        latestPnl:       pnlRes.data  ?? null,
        qboStatus:       intRes.data?.status ?? 'disconnected',
        analysis:        analysis     ?? null,
      })
    })()

    return () => { cancelled = true }
  }, [profile?.company_id])

  const { weightedPct, sharePctById } = useMemo(
    () => computeWeightedProgress(state.milestones ?? []),
    [state.milestones],
  )
  const statusById = useMemo(
    () => classifyAll(state.milestones ?? [], todayYmd()),
    [state.milestones],
  )
  // Build toolDocs: latest doc per tool_id — fed into ToolPulseStrip.
  // Must be declared BEFORE the early return below so hook order stays
  // stable between the loading and loaded renders (Rules of Hooks).
  const toolDocs = useMemo(() => {
    const map = {}
    for (const doc of state.documents ?? []) {
      if (!map[doc.tool_id]) map[doc.tool_id] = doc
    }
    return map
  }, [state.documents])

  if (state.loading) return <LoadingSkeleton />

  const { businessProfile, milestones, checkins, documents, latestPnl, qboStatus, analysis } = state
  const stage = detectStage(businessProfile?.current_revenue)

  const firstName          = profile?.name?.split(' ')[0] ?? null
  const milestonesComplete = milestones.filter(m => m.completed).length
  const daysBuilding       = company?.created_at ? Math.max(1, daysBetween(company.created_at, new Date())) : 0

  const activeFocusCount = milestones.filter(m => {
    const s = statusById.get(m.id)
    return s === 'in-progress' || s === 'ready'
  }).length

  const daysSinceLastCheckin = checkins.length > 0
    ? daysBetween(checkins[0].created_at, new Date())
    : null

  const nextMilestone =
    milestones.find(m => statusById.get(m.id) === 'in-progress') ??
    milestones.find(m => statusById.get(m.id) === 'ready')       ??
    milestones.find(m => !m.completed)                           ??
    null

  return (
    <div className="min-h-screen bg-ink-50">

      {/* ── 1. Dark hero header ─────────────────────────────────────────────── */}
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Hero
            firstName={firstName}
            companyName={company?.name}
            stage={stage}
            businessProfile={businessProfile}
            daysBuilding={daysBuilding}
            milestonesComplete={milestonesComplete}
            totalMilestones={milestones.length}
            weightedPct={weightedPct}
          />
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-8 py-6 space-y-6">

        {/* 1. Getting Started — shown only until the first milestone exists */}
        {milestones.length === 0 && (
          <div className="bg-ink-900 border border-brand-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-brand-400">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white mb-0.5">Welcome — here's where to start</p>
                <p className="text-xs text-ink-400 mb-4">GrowthOS works best once it knows your business. Three quick steps get you up and running.</p>
                <div className="space-y-2">
                  {[
                    { step: '1', label: 'Set up your business profile', sub: 'Revenue, goals, and timeline — shapes everything Solomon tells you', to: '/settings' },
                    { step: '2', label: 'Build your first roadmap', sub: 'Add the 3–5 milestones that matter most this year', to: '/roadmap' },
                    { step: '3', label: 'Run your first check-in', sub: 'Weekly wins and revenue updates — keeps your plan sharp', to: '/advisor' },
                  ].map(({ step, label, sub, to }) => (
                    <Link key={step} to={to} className="flex items-center gap-3 p-3 rounded-lg bg-white/4 hover:bg-white/7 transition-colors group">
                      <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white group-hover:text-brand-300 transition-colors">{label}</p>
                        <p className="text-[11px] text-ink-500 leading-snug">{sub}</p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-ink-600 group-hover:text-brand-400 flex-shrink-0 ml-auto transition-colors">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overdue milestones alert — only renders if anything is past due */}
        <OverdueMilestonesAlert milestones={milestones} statusById={statusById} />

        {/* 2. Chat — full width, leads the page */}
        <AdvisorTeaser
          userId={profile?.id}
          companyId={profile?.company_id}
          firstName={firstName}
        />

        {/* 3. KPI strip — plan %, focus count, check-in, P&L */}
        <KpiRow
          planProgressPct={weightedPct}
          activeFocusCount={activeFocusCount}
          daysSinceLastCheckin={daysSinceLastCheckin}
          latestPnl={latestPnl}
          qboStatus={qboStatus}
        />

        {/* 4. Tool pulse — last-run summary for each key tool */}
        <ToolPulseStrip toolDocs={toolDocs} />

        {/* 5. Quick links — 4 user-configurable shortcut tiles */}
        <QuickActions />

        {/* Executive brief (library analysis) */}
        {analysis && <ExecutiveBriefCard analysis={analysis} />}

        {/* 4. Next focus — full width */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <NextFocusCard
              milestone={nextMilestone}
              sharePct={nextMilestone ? sharePctById.get(nextMilestone.id) : null}
              totalMilestones={milestones.length}
            />
          </div>
          <div className="space-y-5">
            <DashboardCalendar />
            <RecentActivity documents={documents} checkins={checkins} />
          </div>
        </div>

        {/* 5 & 6. Trajectory + Roadmap — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <TrajectorySection milestones={milestones} />
          <RoadmapStrip
            milestones={milestones}
            statusById={statusById}
            weightedPct={weightedPct}
          />
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-ink-50">
      {/* Slim header skeleton */}
      <div className="bg-ink-900 border-b border-ink-800 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-ink-800 rounded animate-pulse" />
            <div className="h-6 w-48 bg-ink-800 rounded animate-pulse" />
          </div>
          <div className="flex gap-6">
            {[1,2,3].map(i => <div key={i} className="h-8 w-14 bg-ink-800 rounded animate-pulse" />)}
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-8 py-6 space-y-5">
        <div className="h-80 bg-white rounded-2xl animate-pulse shadow-sm" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse shadow-sm" />)}
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 h-72 bg-white rounded-xl animate-pulse shadow-sm" />
          <div className="space-y-4">
            <div className="h-32 bg-white rounded-xl animate-pulse shadow-sm" />
            <div className="h-32 bg-white rounded-xl animate-pulse shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  )
}
