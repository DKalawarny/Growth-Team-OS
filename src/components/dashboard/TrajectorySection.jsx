import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

// ── Revenue range → midpoint (annual $) ───────────────────────────────────────

const REVENUE_MIDPOINTS = {
  'Pre-revenue':      0,
  '$0 – $100k':      50_000,
  '$100k – $500k':  300_000,
  '$500k – $1M':    750_000,
  '$1M – $5M':    3_000_000,
  '$5M – $10M':   7_500_000,
  '$10M+':        12_000_000,
}

function parseRevenue(label) { return REVENUE_MIDPOINTS[label] ?? 0 }

function parseTimelineMonths(label) {
  if (!label) return 24
  if (label.includes('6 month')) return 6
  if (label.includes('1 year'))  return 12
  if (label.includes('2 year'))  return 24
  if (label.includes('3'))       return 42
  if (label.includes('5+'))      return 72
  return 24
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function monthLabel(m) {
  const d = new Date()
  d.setMonth(d.getMonth() + m)
  return `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`
}

function fmtRev(val) {
  if (!val) return '$0'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000)     return `$${Math.round(val / 1_000)}k`
  return `$${val}`
}

function buildCurve(current, target, months) {
  const cur = Math.max(1, current || 0)
  if (!target || cur >= target || months <= 0) return []
  const r    = Math.pow(target / cur, 1 / months) - 1
  const step = months <= 12 ? 1 : months <= 36 ? 3 : 6
  const pts  = []
  for (let m = 0; m <= months; m += step) {
    pts.push({ m, label: monthLabel(m), rev: Math.round(Math.min(cur * Math.pow(1 + r, m), target * 1.05)) })
  }
  return pts
}

function etaLabel(months) {
  if (months <= 0) return 'Now'
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
}

function monthlyGrowthPct(current, target, months) {
  const cur = Math.max(1, current || 0)
  if (!target || cur >= target || months <= 0) return null
  return ((Math.pow(target / cur, 1 / months) - 1) * 100).toFixed(1)
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ProjTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-2.5 py-1.5 text-xs" style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.1)' }}>
      <span className="text-white/50">{label}: </span>
      <span className="text-amber-400 font-bold">{fmtRev(payload[0]?.value)}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrajectorySection({ milestones = [] }) {
  const { profile } = useAuth()
  const [bizProfile, setBizProfile] = useState(null)

  useEffect(() => {
    if (!profile?.company_id) return
    supabase
      .from('business_profiles')
      .select('current_revenue, goal_timeline, primary_goal')
      .eq('company_id', profile.company_id)
      .maybeSingle()
      .then(({ data }) => setBizProfile(data))
      .catch(() => {})
  }, [profile?.company_id])

  const { curve, currentRev, targetRev, timelineMo } = useMemo(() => {
    const current = parseRevenue(bizProfile?.current_revenue)
    const target  = current > 0 ? Math.min(current * 3, 10_000_000) : 100_000
    const months  = parseTimelineMonths(bizProfile?.goal_timeline)
    return {
      curve:      buildCurve(current, target, months),
      currentRev: current,
      targetRev:  target,
      timelineMo: months,
    }
  }, [bizProfile])

  const completedMs = milestones.filter(m => m.completed).length
  const totalMs     = milestones.length
  const planPct     = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0
  const growth      = monthlyGrowthPct(currentRev, targetRev, timelineMo)
  const takeHome    = targetRev > 0 ? fmtRev(Math.round(targetRev * 0.28 / 12)) : null

  const hasData = curve.length > 1

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #0d1117 0%, #111827 60%, #0f1923 100%)',
        boxShadow: '0 0 60px rgba(245,158,11,0.06), 0 20px 40px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5"
            style={{ color: 'rgba(245,158,11,0.7)' }}
          >
            Your trajectory
          </div>
          <h2 className="text-base font-black text-white leading-tight">
            {hasData
              ? <>{fmtRev(currentRev)} → <span style={{ color: '#F59E0B' }}>{fmtRev(targetRev)}</span> by {etaLabel(timelineMo)}</>
              : <>Set your revenue goal to see your projection.</>
            }
          </h2>
        </div>
        <Link
          to="/trajectories"
          className="text-[10.5px] font-semibold flex-shrink-0 mt-0.5 transition-colors"
          style={{ color: 'rgba(245,158,11,0.6)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(245,158,11,1)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,158,11,0.6)' }}
        >
          Full projection →
        </Link>
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────────── */}
      <div className="px-5 pb-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={curve} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="trajGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip content={<ProjTooltip />} />
              <Area
                type="monotone"
                dataKey="rev"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#trajGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="h-[120px] rounded-xl flex flex-col items-center justify-center text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            <div className="text-2xl mb-1.5 opacity-30">📈</div>
            <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Set your goal in{' '}
              <Link to="/trajectories" style={{ color: 'rgba(245,158,11,0.6)' }}>Trajectories</Link>
              {' '}to see your curve
            </p>
          </div>
        )}
      </div>

      {/* ── Stat row ─────────────────────────────────────────────────────────── */}
      {hasData && (
        <div className="px-5 pb-5 grid grid-cols-2 gap-2.5">
          <StatCard label="Target" value={fmtRev(targetRev)} sub="annual" accent />
          <StatCard label="Projected by" value={etaLabel(timelineMo)} sub={`${timelineMo} months`} />
          {growth && <StatCard label="Monthly growth" value={`${growth}%`} sub="needed" />}
          {takeHome && <StatCard label="Est. take-home" value={takeHome} sub="per month" />}
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────────────────────────────── */}
      {hasData && totalMs > 0 && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Roadmap progress
            </span>
            <span className="text-[10px] font-bold" style={{ color: 'rgba(245,158,11,0.8)' }}>
              {completedMs} / {totalMs} done
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${planPct}%`, background: 'linear-gradient(90deg, #92400e, #f59e0b)' }}
            />
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Every milestone you complete is a brick in the building. Keep laying them.
        </p>
      </div>
    </section>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        background: accent ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
        style={{ color: 'rgba(255,255,255,0.3)' }}>
        {label}
      </div>
      <div className="text-base font-black tabular-nums leading-tight"
        style={{ color: accent ? '#F59E0B' : 'rgba(255,255,255,0.9)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{sub}</div>
      )}
    </div>
  )
}
