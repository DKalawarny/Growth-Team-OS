import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getMonthlyUsageSummary, getUsageHistory } from '../lib/usage'
import { getToolById } from '../lib/tools'

/**
 * Analytics — /analytics
 *
 * Shows the owner a clear picture of how the platform is being used:
 *   1. KPI row  — this month vs last month (calls, cost, check-ins, advisor turns)
 *   2. 6-month cost trend bar chart
 *   3. Tool leaderboard — which tools are used most this month
 *   4. Activity heatmap — daily advisor + check-in activity, last 28 days
 */

export default function Analytics() {
  const { profile } = useAuth()
  const companyId   = profile?.company_id

  const [loading,   setLoading]   = useState(true)
  const [summary,   setSummary]   = useState(null)   // this month
  const [history,   setHistory]   = useState([])     // 6 months
  const [chatCount, setChatCount] = useState(0)      // advisor messages this month
  const [ciCount,   setCiCount]   = useState(0)      // check-ins this month
  const [lastChat,  setLastChat]  = useState(0)      // advisor messages last month
  const [lastCi,    setLastCi]    = useState(0)      // check-ins last month
  const [activity,  setActivity]  = useState([])     // last 28 days {date, chats, checkins}

  useEffect(() => {
    if (!companyId) return
    let cancelled = false

    ;(async () => {
      setLoading(true)

      const now       = new Date()
      const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      const last28    = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)

      const [s, h, chatRes, ciRes, lastChatRes, lastCiRes, actChat, actCi] = await Promise.all([
        getMonthlyUsageSummary(companyId),
        getUsageHistory(companyId, { months: 6 }),

        // Advisor messages this month
        supabase.from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('chat_type', 'advisor')
          .gte('created_at', thisMonth.toISOString()),

        // Check-ins this month
        supabase.from('checkins')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', thisMonth.toISOString()),

        // Advisor messages last month
        supabase.from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('chat_type', 'advisor')
          .gte('created_at', lastMonth.toISOString())
          .lt('created_at', thisMonth.toISOString()),

        // Check-ins last month
        supabase.from('checkins')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', lastMonth.toISOString())
          .lt('created_at', thisMonth.toISOString()),

        // Activity: chat messages last 28 days with dates
        supabase.from('chat_messages')
          .select('created_at')
          .eq('company_id', companyId)
          .eq('chat_type', 'advisor')
          .gte('created_at', last28.toISOString()),

        // Activity: check-ins last 28 days
        supabase.from('checkins')
          .select('created_at')
          .eq('company_id', companyId)
          .gte('created_at', last28.toISOString()),
      ])

      if (cancelled) return

      setSummary(s)
      setHistory(h)
      setChatCount(chatRes.count ?? 0)
      setCiCount(ciRes.count ?? 0)
      setLastChat(lastChatRes.count ?? 0)
      setLastCi(lastCiRes.count ?? 0)

      // Build 28-day activity grid
      const days = []
      for (let i = 27; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        days.push(d.toISOString().slice(0, 10))
      }
      const chatByDay = countByDay(actChat.data ?? [])
      const ciByDay   = countByDay(actCi.data ?? [])
      setActivity(days.map(d => ({ date: d, chats: chatByDay[d] ?? 0, checkins: ciByDay[d] ?? 0 })))

      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [companyId])

  if (loading) return <LoadingSkeleton />

  const thisMonthCalls = summary?.totalEvents ?? 0
  const lastMonthCalls = history[history.length - 2]?.calls ?? 0
  const thisMonthCost  = summary?.totalCost ?? 0
  const lastMonthCost  = history[history.length - 2]?.cost ?? 0

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <div className="bg-ink-900 border-b border-ink-800 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-ink-400 mt-1">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · how you're using GrowthOS
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">

        {/* ── KPI row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Tool runs"
            value={thisMonthCalls}
            prev={lastMonthCalls}
            unit="this month"
          />
          <KpiCard
            label="API cost"
            value={`$${thisMonthCost < 0.01 && thisMonthCost > 0 ? thisMonthCost.toFixed(4) : thisMonthCost.toFixed(2)}`}
            prev={lastMonthCost}
            prevValue={`$${lastMonthCost.toFixed(2)}`}
            unit="this month"
            invertDelta
          />
          <KpiCard
            label="Advisor turns"
            value={chatCount}
            prev={lastChat}
            unit="this month"
          />
          <KpiCard
            label="Check-ins"
            value={ciCount}
            prev={lastCi}
            unit="this month"
          />
        </div>

        {/* ── Cost trend ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-ink-900 mb-1">API spend — last 6 months</h2>
          <p className="text-xs text-ink-400 mb-6">Claude + Google Places costs in USD</p>
          <BarChart
            data={history.map(m => ({ label: shortMonth(m.month), value: m.cost }))}
            formatValue={v => v < 0.01 && v > 0 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`}
            color="brand"
          />
        </div>

        {/* ── Tool leaderboard ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-ink-900 mb-1">Tool usage this month</h2>
          <p className="text-xs text-ink-400 mb-6">Ranked by number of runs</p>
          {(summary?.byTool ?? []).length === 0 ? (
            <p className="text-sm text-ink-400">No tool runs recorded yet this month.</p>
          ) : (
            <div className="space-y-3">
              {(summary?.byTool ?? []).map((row, i) => {
                const tool  = getToolById(row.tool_id)
                const label = tool?.name ?? row.tool_id
                const icon  = tool?.icon ?? '•'
                const max   = summary.byTool[0]?.count ?? 1
                const pct   = Math.round((row.count / max) * 100)
                return (
                  <div key={row.tool_id} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-ink-800 truncate">{label}</span>
                        <span className="text-xs text-ink-400 font-mono flex-shrink-0 ml-2">
                          {row.count} run{row.count !== 1 ? 's' : ''} · ${row.cost < 0.01 ? row.cost.toFixed(4) : row.cost.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {i === 0 && (
                      <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        #1
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Activity grid ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-ink-900 mb-1">Daily activity — last 28 days</h2>
          <p className="text-xs text-ink-400 mb-6">Each column = one day · darker = more activity</p>
          <ActivityGrid data={activity} />
          <div className="flex items-center gap-4 mt-4 text-xs text-ink-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-brand-400 inline-block" /> Advisor chats
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-ink-400 inline-block" /> Check-ins
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, prev, prevValue, unit, invertDelta }) {
  const numValue = typeof value === 'number' ? value : null
  const delta    = numValue !== null && prev !== undefined ? numValue - prev : null
  const pctDelta = prev > 0 && delta !== null ? Math.round((delta / prev) * 100) : null

  // For cost, up is bad (red); for everything else, up is good (green)
  const isPositive = invertDelta ? delta <= 0 : delta >= 0

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-500 mb-2">{label}</p>
      <p className="text-3xl font-bold text-ink-900 tracking-tight">{value}</p>
      <p className="text-[11px] text-ink-400 mt-0.5">{unit}</p>
      {pctDelta !== null && pctDelta !== 0 && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(pctDelta)}% vs last month</span>
        </div>
      )}
      {(pctDelta === 0 || (delta === 0 && prev === 0)) && (
        <p className="text-[11px] text-ink-300 mt-2">Same as last month</p>
      )}
    </div>
  )
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

function BarChart({ data, formatValue, color = 'brand' }) {
  const max = Math.max(...data.map(d => d.value), 0.001)
  const barColor = color === 'brand' ? '#f59e0b' : '#4a5e7a'

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => {
        const pct    = (d.value / max) * 100
        const isLast = i === data.length - 1
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-ink-500 font-mono">{formatValue(d.value)}</span>
            <div className="w-full flex items-end" style={{ height: '72px' }}>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: isLast ? barColor : `${barColor}88`,
                }}
              />
            </div>
            <span className={`text-[10px] font-medium ${isLast ? 'text-ink-700' : 'text-ink-400'}`}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Activity grid ─────────────────────────────────────────────────────────────

function ActivityGrid({ data }) {
  const maxChats = Math.max(...data.map(d => d.chats), 1)
  const maxCi    = Math.max(...data.map(d => d.checkins), 1)

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {data.map(d => {
        const chatOpacity = d.chats > 0 ? 0.3 + (d.chats / maxChats) * 0.7 : 0
        const ciOpacity   = d.checkins > 0 ? 0.3 + (d.checkins / maxCi) * 0.7 : 0
        const hasActivity = d.chats > 0 || d.checkins > 0
        const dayLabel    = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)
        const dateNum     = new Date(d.date + 'T12:00:00').getDate()

        return (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ width: '28px' }}>
            {/* Chat bar */}
            <div
              className="w-full rounded-sm"
              style={{
                height: '20px',
                background: chatOpacity > 0 ? `rgba(245,158,11,${chatOpacity})` : '#f4f6fa',
                border: chatOpacity > 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid #e8edf4',
              }}
              title={`${d.date}: ${d.chats} chat message${d.chats !== 1 ? 's' : ''}`}
            />
            {/* Check-in bar */}
            <div
              className="w-full rounded-sm"
              style={{
                height: '20px',
                background: ciOpacity > 0 ? `rgba(74,94,122,${ciOpacity})` : '#f4f6fa',
                border: ciOpacity > 0 ? '1px solid rgba(74,94,122,0.3)' : '1px solid #e8edf4',
              }}
              title={`${d.date}: ${d.checkins} check-in${d.checkins !== 1 ? 's' : ''}`}
            />
            {/* Day label — show date number on Mondays or 1st/15th */}
            <span className={`text-[8px] font-medium ${hasActivity ? 'text-ink-600' : 'text-ink-300'}`}>
              {dayLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 border-b border-ink-800 px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-2">
          <div className="h-6 w-32 bg-ink-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-ink-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse shadow-sm border border-ink-100" />)}
        </div>
        <div className="h-56 bg-white rounded-2xl animate-pulse shadow-sm border border-ink-100" />
        <div className="h-64 bg-white rounded-2xl animate-pulse shadow-sm border border-ink-100" />
        <div className="h-40 bg-white rounded-2xl animate-pulse shadow-sm border border-ink-100" />
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortMonth(yyyy_mm) {
  const [y, m] = yyyy_mm.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short' })
}

function countByDay(rows) {
  const out = {}
  for (const r of rows) {
    const day = r.created_at.slice(0, 10)
    out[day] = (out[day] ?? 0) + 1
  }
  return out
}
