import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRef } from 'react'
import { callClaude, SONNET } from '../../lib/anthropic'
import { fetchWebsiteContent } from '../../lib/websiteScraper'
import { assignMilestoneDates, buildDependencyUpdates } from '../../lib/milestoneDates'

/**
 * DangerSettings — destructive actions. Conventional "danger zone" pattern
 * (GitHub, Stripe, Vercel) — a dedicated tab so destructive buttons are
 * never near the routine save-and-edit flow.
 *
 * Today:
 *   - Regenerate roadmap (wipes existing milestones, re-runs Claude)
 *
 * Future home for:
 *   - Delete workspace / account
 *   - Reset onboarding answers
 *   - Wipe AI memory
 */
export default function DangerSettings() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [regenState, setRegenState] = useState('idle')   // idle | confirm | running | error
  const [regenError, setRegenError] = useState(null)

  // Password change state
  const [pwState, setPwState]       = useState('idle')   // idle | saving | done | error
  const [pwCurrent, setPwCurrent]   = useState('')
  const [pwNew, setPwNew]           = useState('')
  const [pwConfirm, setPwConfirm]   = useState('')
  const [pwError, setPwError]       = useState(null)
  const [showPw, setShowPw]         = useState(false)

  // Delete account state
  const [deleteState, setDeleteState] = useState('idle') // idle | confirm | deleting
  const deleteInputRef = useRef(null)

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (pwNew !== pwConfirm) { setPwError('New passwords do not match.'); return }
    if (pwNew.length < 8)    { setPwError('Password must be at least 8 characters.'); return }
    setPwState('saving'); setPwError(null)
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    if (error) { setPwError(error.message); setPwState('error') }
    else { setPwState('done'); setPwCurrent(''); setPwNew(''); setPwConfirm('') }
  }

  async function handleDeleteAccount() {
    setDeleteState('deleting')
    // Sign out — data remains but session is gone. Full deletion requires a backend
    // function; for now we sign out and show a "contact us" message.
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function handleRegenerate() {
    if (!profile?.company_id) return
    setRegenState('running')
    setRegenError(null)

    try {
      // 1. Pull the current (persisted) profile.
      const { data: bp, error: bpErr } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle()
      if (bpErr) throw new Error(bpErr.message)
      if (!bp) throw new Error('Business profile not found.')

      // 2. Refresh the website scrape if a URL is set.
      let websiteContent = bp.website_content
      if (bp.website) {
        const fresh = await fetchWebsiteContent(bp.website)
        if (fresh) websiteContent = fresh
      }

      // 3. Claude → new milestones.
      const raw = await callClaude({
        model:        SONNET,
        promptKey: 'ROADMAP_SYSTEM_PROMPT',
        messages:     [{ role: 'user', content: JSON.stringify(buildPayload(bp, websiteContent)) }],
        maxTokens:    4000,
        json:         true,
      })
      const parsed = safeParseMilestones(raw)
      if (!parsed?.milestones?.length) throw new Error("Couldn't read the AI response. Try again.")

      // 4. Wipe existing milestones + insert the new ones.
      //    Two statements; supabase-js doesn't expose transactions. Worst
      //    case: delete succeeds, insert fails — user ends up with 0
      //    milestones and can regenerate again. The button is forgiving.
      const { error: delErr } = await supabase
        .from('milestones').delete().eq('company_id', profile.company_id)
      if (delErr) throw new Error(`Could not clear old milestones: ${delErr.message}`)

      const datedMilestones = assignMilestoneDates(parsed.milestones)
      const rows = datedMilestones.map((m, i) => ({
        company_id:  profile.company_id,
        title:       String(m.title ?? '').slice(0, 200),
        description: m.description ?? null,
        timeframe:   m.timeframe ?? null,
        category:    m.category ?? null,
        actions:     Array.isArray(m.actions) ? m.actions : [],
        books:       Array.isArray(m.books)   ? m.books   : [],
        sort_order:  i,
        start_date:  m.start_date ?? null,
        end_date:    m.end_date ?? null,
        weight:      sanitizeWeight(m.weight),
      }))
      // INSERT ... RETURNING preserves input order — see Onboarding.jsx.
      const { data: insertedRows, error: insErr } = await supabase
        .from('milestones')
        .insert(rows)
        .select('id')
      if (insErr) throw new Error(`Could not save new milestones: ${insErr.message}`)

      // Dependency wiring — array indexes → UUIDs. Best-effort.
      const depUpdates = buildDependencyUpdates(parsed.milestones, insertedRows ?? [])
      if (depUpdates.length > 0) {
        await Promise.all(depUpdates.map(u =>
          supabase.from('milestones').update({ depends_on: u.depends_on }).eq('id', u.id)
        ))
      }

      // 5. Persist the refreshed website_content.
      if (websiteContent && websiteContent !== bp.website_content) {
        await supabase
          .from('business_profiles')
          .update({ website_content: websiteContent })
          .eq('company_id', profile.company_id)
      }

      navigate('/roadmap')
    } catch (err) {
      setRegenError(err.message ?? 'Something went wrong.')
      setRegenState('error')
    }
  }

  if (regenState === 'running') return <RegeneratingScreen />

  return (
    <div className="space-y-4">

      {/* ── Change password ─────────────────────────────────────────── */}
      <section className="bg-white border border-ink-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink-900 mb-1">Change password</h2>
        <p className="text-sm text-ink-500 mb-4 leading-relaxed">
          Update your login password. You'll stay signed in after saving.
        </p>

        {pwState === 'done' ? (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <span>✓</span> Password updated successfully.
          </div>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required minLength={8}
                  value={pwNew}
                  onChange={e => setPwNew(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className="pr-14"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400 hover:text-ink-600 font-medium">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-1.5">Confirm new password</label>
              <input
                type={showPw ? 'text' : 'password'}
                required minLength={8}
                value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                placeholder="Same password again"
                autoComplete="new-password"
              />
            </div>
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            <button
              type="submit"
              disabled={pwState === 'saving'}
              className="border border-ink-200 text-ink-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink-50 transition-colors disabled:opacity-50"
            >
              {pwState === 'saving' ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </section>

      {/* ── Regenerate roadmap ──────────────────────────────────────── */}
      <section className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink-900 mb-1">Regenerate roadmap</h2>
        <p className="text-sm text-ink-500 mb-4 leading-relaxed">
          Replace your current milestones with a fresh roadmap based on your latest answers in{' '}
          <strong className="text-ink-700">Business</strong>.
          <strong className="block mt-1 text-red-600">
            This deletes every existing milestone — including completed ones.
          </strong>
        </p>

        {regenState === 'error' && regenError && (
          <p className="text-sm text-red-600 mb-3">{regenError}</p>
        )}

        {regenState !== 'confirm' ? (
          <button
            type="button"
            onClick={() => setRegenState('confirm')}
            className="border border-red-300 text-red-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Regenerate roadmap
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRegenerate}
              className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Yes, replace my roadmap
            </button>
            <button
              type="button"
              onClick={() => setRegenState('idle')}
              className="text-sm text-ink-400 hover:text-ink-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      {/* ── Delete workspace ────────────────────────────────────────── */}
      <section className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink-900 mb-1">Delete workspace</h2>
        <p className="text-sm text-ink-500 leading-relaxed mb-4">
          Permanently delete this workspace and all data — milestones, documents,
          financial records, and advisor memory. <strong className="text-red-600">This cannot be undone.</strong>
        </p>

        {deleteState === 'idle' && (
          <button
            type="button"
            onClick={() => setDeleteState('confirm')}
            className="border border-red-300 text-red-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Delete workspace
          </button>
        )}

        {deleteState === 'confirm' && (
          <div className="space-y-3 max-w-sm">
            <p className="text-sm font-medium text-ink-800">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              ref={deleteInputRef}
              type="text"
              placeholder="DELETE"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (deleteInputRef.current?.value === 'DELETE') handleDeleteAccount()
                  else deleteInputRef.current?.focus()
                }}
                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Yes, delete everything
              </button>
              <button
                type="button"
                onClick={() => setDeleteState('idle')}
                className="text-sm text-ink-400 hover:text-ink-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteState === 'deleting' && (
          <p className="text-sm text-ink-500">Deleting your workspace…</p>
        )}
      </section>
    </div>
  )
}

function RegeneratingScreen() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center relative">
        <div className="w-14 h-14 mx-auto mb-8 relative">
          <div className="absolute inset-0 rounded-full border-4 border-ink-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-400 animate-spin" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-500 mb-3">
          Rebuilding your roadmap
        </p>
        <h2 className="text-2xl font-bold text-ink-900 mb-3 tracking-tight">
          Regenerating your roadmap…
        </h2>
        <p className="text-ink-400 text-sm max-w-xs mx-auto">This takes 10–20 seconds.</p>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Helpers (kept local — same shape as Onboarding.jsx)
// ----------------------------------------------------------------------------

function buildPayload(bp, websiteContent) {
  return {
    business_name:   bp.business_name,
    website:         bp.website,
    industry:        bp.industry,
    location:        bp.location,
    team_size:       bp.team_size,
    hours_per_week:  bp.hours_per_week,
    last_revenue:    bp.last_revenue,
    current_revenue: bp.current_revenue,
    profit_margin:   bp.profit,
    primary_goals:   bp.primary_goal,
    goal_timeline:   bp.goal_timeline,
    website_content: websiteContent,
  }
}

function safeParseMilestones(raw) {
  if (!raw) return null
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  try { return JSON.parse(trimmed) }
  catch {
    const start = trimmed.indexOf('{')
    const end   = trimmed.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    try { return JSON.parse(trimmed.slice(start, end + 1)) }
    catch { return null }
  }
}

function sanitizeWeight(w) {
  const n = Number(w)
  if (!Number.isFinite(n)) return 5
  return Math.max(1, Math.min(10, Math.round(n)))
}
