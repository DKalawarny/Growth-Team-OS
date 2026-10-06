import { useEffect, useRef, useState } from 'react'
import {
  createInvite, listInvites, revokeInvite, buildInviteUrl,
  listTeam, setMemberRole, removeMember,
} from '../../lib/invites'
import { GRANTABLE_ROLES, ROLE_LABEL, ROLE_DESCRIPTION } from '../../lib/access'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { homeFor } from '../../lib/access'
import { setJobCostsForOperations } from '../../lib/jobAmounts'

/**
 * ⭐⭐ PEOPLE WITH ACCESS — the owner adds someone to the business and picks
 * what they can see. Three presets, not a grid of switches (settled 2 Sep):
 * Runs the business · Office · Operations. Crews are not here — they stay on
 * the magic links in the Team card below (decided 3 Oct).
 *
 * 🔴 Nothing on this screen protects anything. The database (migration 075)
 * decides who can read what and refuses role changes from anyone but the
 * owner; this is only the place the owner asks for them.
 *
 * Destructive actions use the in-place confirm the advisor card already uses.
 */
export default function PeopleSection({ companyId, userId }) {
  // ⭐ The one switch (settled 2 Sep): may Operations see job costs? Off by default.
  const { company, refresh, startPreview } = useAuth()
  const navigate = useNavigate()
  const [costsOn, setCostsOn] = useState(!!company?.job_costs_for_operations)
  async function toggleCosts(next) {
    setErr(''); setCostsOn(next)
    try { await setJobCostsForOperations(companyId, next); await refresh?.() }
    catch (ex) { setCostsOn(!next); setErr(ex.message) }
  }
  const [team, setTeam]         = useState([])
  const [invites, setInvites]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [email, setEmail]       = useState('')
  const [role, setRole]         = useState('manager')
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState('')
  const [confirming, setConfirming] = useState(null)   // { kind, id }
  const [copiedId, setCopiedId] = useState(null)
  const copyTimer = useRef(null)

  useEffect(() => {
    if (!companyId) return
    let live = true
    ;(async () => {
      const [t, inv] = await Promise.all([
        listTeam(companyId).catch(() => []),
        listInvites(companyId).catch(() => []),
      ])
      if (!live) return
      setTeam(t)
      setInvites(inv.filter(i => i.status === 'pending' && i.role && i.role !== 'advisor'))
      setLoading(false)
    })()
    return () => { live = false }
  }, [companyId])

  async function invite(e) {
    e.preventDefault()
    if (busy) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Put in the email address they will sign in with.'); return }
    setBusy(true); setErr('')
    try {
      const inv = await createInvite({ companyId, userId, email, role })
      setInvites(prev => [inv, ...prev])
      setEmail('')
      copy(inv)
    } catch (ex) {
      setErr(ex?.message ?? 'That did not go through. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function copy(inv) {
    navigator.clipboard?.writeText(buildInviteUrl(inv.token)).then(() => {
      setCopiedId(inv.id)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopiedId(null), 2500)
    }).catch(() => {})
  }

  async function changeRole(person, next) {
    setErr('')
    try {
      await setMemberRole(person.id, next)
      setTeam(prev => prev.map(p => (p.id === person.id ? { ...p, role: next } : p)))
    } catch (ex) { setErr(ex.message) }
  }

  async function remove(person) {
    setConfirming(null); setErr('')
    try {
      await removeMember(person.id)
      setTeam(prev => prev.filter(p => p.id !== person.id))
    } catch (ex) { setErr(ex.message) }
  }

  async function revoke(inv) {
    setConfirming(null)
    await revokeInvite(inv.id).catch(() => {})
    setInvites(prev => prev.filter(i => i.id !== inv.id))
  }

  const label = 'text-[10.5px] font-semibold uppercase tracking-widest text-ink-400 mb-2'

  return (
    <section className="bg-white border border-ink-100 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-ink-900 px-6 py-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400 mb-0.5">People with access</div>
        <p className="text-xs text-ink-400">Add someone from inside the business and choose what they can see. You can change it or remove them any time.</p>
      </div>

      <div className="p-6 space-y-6">
        {err && <p className="text-[12px] text-red-600" role="alert">{err}</p>}

        {!loading && (
          <div>
            <div className={label}>On this account</div>
            <div className="space-y-2">
              {team.map(p => {
                const me = p.id === userId
                const isConfirming = confirming?.kind === 'remove' && confirming.id === p.id
                return (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink-100 rounded-lg px-4 py-2.5 bg-ink-50/40">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink-900 truncate">{p.name || p.email || 'Unnamed'}{me ? ' (you)' : ''}</div>
                      {p.name && p.email && <div className="text-[11px] text-ink-400 truncate">{p.email}</div>}
                    </div>
                    {p.role === 'owner' ? (
                      <span className="text-xs font-semibold text-ink-600">Owner</span>
                    ) : isConfirming ? (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-ink-500">Remove their access?</span>
                        <button type="button" onClick={() => remove(p)} className="text-xs font-semibold text-red-600 hover:text-red-700">Yes, remove</button>
                        <button type="button" onClick={() => setConfirming(null)} className="text-xs text-ink-400 hover:text-ink-600">Keep</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <select
                          aria-label={`What ${p.name || p.email || 'they'} can see`}
                          value={GRANTABLE_ROLES.includes(p.role) ? p.role : 'manager'}
                          onChange={e => changeRole(p, e.target.value)}
                          className="text-xs py-1.5"
                        >
                          {GRANTABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                        <button type="button" onClick={() => { startPreview(p.role, p.name || p.email); navigate(homeFor(p.role)) }} className="text-xs font-semibold text-ink-600 hover:text-ink-900">View as</button>
                        <button type="button" onClick={() => setConfirming({ kind: 'remove', id: p.id })} className="text-xs text-ink-400 hover:text-red-600">Remove</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <label className="flex items-start gap-3 border border-ink-100 rounded-lg px-4 py-3 cursor-pointer">
          <input type="checkbox" checked={costsOn} onChange={e => toggleCosts(e.target.checked)} className="mt-1" />
          <span>
            <span className="block text-sm font-semibold text-ink-900">Operations can see job costs</span>
            <span className="block text-[12px] text-ink-500 leading-relaxed">What each job was quoted, what it cost and what was invoiced. Off means only you, whoever runs the business and the office see them.</span>
          </span>
        </label>

        <form onSubmit={invite}>
          <div className={label}>Add someone</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Their email address"
            className="w-full text-sm"
            autoComplete="off"
          />
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">What they can see</legend>
            {GRANTABLE_ROLES.map(r => (
              <label key={r} className={`flex gap-3 items-start border rounded-lg px-4 py-3 cursor-pointer ${role === r ? 'border-ink-900 bg-ink-50/60' : 'border-ink-100'}`}>
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-1" />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{ROLE_LABEL[r]}</span>
                  <span className="block text-[12px] text-ink-500 leading-relaxed">{ROLE_DESCRIPTION[r]}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <button type="submit" disabled={busy} className="mt-3 px-4 py-2 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold disabled:opacity-50">
            {busy ? 'Creating…' : 'Create invite link'}
          </button>
          <p className="text-[11px] text-ink-400 mt-1.5 leading-relaxed">
            The link is copied for you to send them. It only works for that email address, and lasts 30 days.
          </p>
        </form>

        {invites.length > 0 && (
          <div>
            <div className={label}>Waiting to join</div>
            <div className="space-y-2">
              {invites.map(inv => {
                const isConfirming = confirming?.kind === 'revoke' && confirming.id === inv.id
                return (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink-100 rounded-lg px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm text-ink-900 truncate">{inv.email}</div>
                      <div className="text-[11px] text-ink-400">{ROLE_LABEL[inv.role] ?? inv.role}</div>
                    </div>
                    {isConfirming ? (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-ink-500">Cancel this invite?</span>
                        <button type="button" onClick={() => revoke(inv)} className="text-xs font-semibold text-red-600">Yes, cancel it</button>
                        <button type="button" onClick={() => setConfirming(null)} className="text-xs text-ink-400">Keep</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => copy(inv)} className="text-xs font-semibold text-ink-700 hover:text-ink-900">
                          {copiedId === inv.id ? 'Copied' : 'Copy link'}
                        </button>
                        <button type="button" onClick={() => setConfirming({ kind: 'revoke', id: inv.id })} className="text-xs text-ink-400 hover:text-red-600">Cancel</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
