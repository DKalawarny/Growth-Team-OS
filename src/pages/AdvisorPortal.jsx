import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

/**
 * AdvisorPortal — landing page for users who have advisor access to one or
 * more client companies.
 *
 * Shows a card for each client with:
 *   - Company name
 *   - A brief snapshot (milestone progress, last check-in)
 *   - "Enter workspace →" button
 *
 * When the user clicks a client, enterClient() overrides the active
 * company_id in useAuth and redirects to the Dashboard.
 */
export default function AdvisorPortal() {
  const { advisorClients, enterClient, profile, isAdvisor } = useAuth()
  const navigate = useNavigate()
  const [snapshots, setSnapshots] = useState({}) // company_id → { progress, lastCheckin }
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!advisorClients.length) { setLoading(false); return }

    ;(async () => {
      const results = {}
      await Promise.all(advisorClients.map(async (client) => {
        try {
          const [msRes, ciRes] = await Promise.all([
            supabase
              .from('milestones')
              .select('completed, weight')
              .eq('company_id', client.company_id),
            supabase
              .from('checkins')
              .select('created_at, win')
              .eq('company_id', client.company_id)
              .order('created_at', { ascending: false })
              .limit(1),
          ])

          const miles     = msRes.data ?? []
          const total     = miles.length
          const done      = miles.filter(m => m.completed).length
          const pct       = total > 0 ? Math.round((done / total) * 100) : 0
          const lastCI    = ciRes.data?.[0] ?? null

          results[client.company_id] = { pct, done, total, lastCI }
        } catch { /* non-critical */ }
      }))

      setSnapshots(results)
      setLoading(false)
    })()
  }, [advisorClients])

  async function handleEnter(client) {
    await enterClient(client.company_id)
    navigate('/dashboard')
  }

  // If user has no advisor clients, redirect home
  if (!loading && !isAdvisor) {
    navigate('/', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-ink-50">

      {/* Header */}
      <div className="bg-ink-900 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-8 py-10">
          <div className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400 mb-2">
            Advisor portal
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Your clients
          </h1>
          <p className="text-sm text-ink-400 mt-1">
            Read-only access to each client's GrowthOS workspace.
            {profile?.name && ` Signed in as ${profile.name}.`}
          </p>
        </div>
      </div>

      {/* Client list */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-28 bg-white rounded-xl animate-pulse border border-ink-100" />
            ))}
          </div>
        ) : advisorClients.length === 0 ? (
          <div className="bg-white border border-dashed border-ink-200 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🤝</div>
            <h2 className="text-lg font-bold text-ink-900 mb-2">No clients yet</h2>
            <p className="text-sm text-ink-500 max-w-sm mx-auto leading-relaxed">
              Ask a business owner to send you an advisor invite link. Once you accept it, their workspace appears here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {advisorClients.map(client => {
              const snap = snapshots[client.company_id]
              return (
                <ClientCard
                  key={client.company_id}
                  client={client}
                  snap={snap}
                  onEnter={() => handleEnter(client)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Client card ──

function ClientCard({ client, snap, onEnter }) {
  const lastCI = snap?.lastCI
  const daysSince = lastCI
    ? Math.floor((Date.now() - new Date(lastCI.created_at).getTime()) / 86_400_000)
    : null

  return (
    <div className="bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden hover:border-brand-200 transition-colors group">
      <div className="px-5 py-4 flex items-center gap-4">

        {/* Avatar initial */}
        <div className="w-12 h-12 rounded-xl bg-ink-900 flex items-center justify-center text-brand-400 font-black text-xl flex-shrink-0">
          {client.company_name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-ink-900 truncate">
            {client.company_name}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {snap ? (
              <>
                {/* Progress bar */}
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-[width]"
                      style={{ width: `${snap.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-400 tabular-nums">
                    {snap.done}/{snap.total} milestones
                  </span>
                </div>

                {/* Last check-in */}
                {daysSince !== null && (
                  <span className={`text-xs ${daysSince > 14 ? 'text-brand-600' : 'text-ink-400'}`}>
                    {daysSince === 0 ? 'Checked in today'
                      : daysSince === 1 ? 'Last check-in yesterday'
                      : `Last check-in ${daysSince}d ago`}
                    {daysSince > 14 && ' ⚠️'}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-ink-300 animate-pulse">Loading…</span>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onEnter}
          className="flex-shrink-0 px-4 py-2 rounded-lg bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800 transition-colors group-hover:glow-gold-sm"
        >
          Enter workspace →
        </button>
      </div>
    </div>
  )
}
