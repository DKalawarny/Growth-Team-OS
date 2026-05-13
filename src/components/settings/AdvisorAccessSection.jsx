import { useEffect, useRef, useState } from 'react'
import {
  createInvite,
  listInvites,
  revokeInvite,
  listAdvisors,
  removeAdvisor,
  buildInviteUrl,
} from '../../lib/invites'

/**
 * AdvisorAccessSection — invite a coach / accountant / mentor as a
 * read-only viewer of the workspace.
 *
 * Two destructive actions (revoke an invite, remove an active advisor)
 * use an in-place confirm pattern rather than window.confirm — the page
 * already establishes that pattern with the Regenerate roadmap section,
 * and a native confirm() dialog feels jarring inside the settings flow.
 */
export default function AdvisorAccessSection({ companyId, userId }) {
  const [invites,  setInvites]  = useState([])
  const [advisors, setAdvisors] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [email,    setEmail]    = useState('')

  // Confirm-state for destructive actions. We track which row is mid-confirm
  // so we can swap its action button for a Yes/Cancel pair without rendering
  // a modal.
  const [confirming, setConfirming] = useState(null)
    // shape: { kind: 'revoke-invite' | 'remove-advisor', id: string } | null
  const copyTimerRef = useRef(null)

  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      const [inv, adv] = await Promise.all([
        listInvites(companyId).catch(() => []),
        listAdvisors(companyId).catch(() => []),
      ])
      setInvites(inv)
      setAdvisors(adv)
      setLoading(false)
    })()
  }, [companyId])

  async function handleCreate() {
    if (!companyId || !userId || creating) return
    setCreating(true)
    setCreateErr(null)
    try {
      const inv = await createInvite({ companyId, userId, email })
      setInvites(prev => [inv, ...prev])
      setEmail('')
    } catch (err) {
      setCreateErr(err?.message ?? 'Could not generate the invite link. Try again.')
    } finally {
      setCreating(false)
    }
  }

  async function confirmRevoke(inviteId) {
    setConfirming(null)
    await revokeInvite(inviteId).catch(() => {})
    setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, status: 'revoked' } : i))
  }

  async function confirmRemoveAdvisor(memberId) {
    setConfirming(null)
    await removeAdvisor(memberId).catch(() => {})
    setAdvisors(prev => prev.filter(a => a.id !== memberId))
  }

  function handleCopy(invite) {
    const url = buildInviteUrl(invite.token)
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invite.id)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const pendingInvites = invites.filter(i => i.status === 'pending')

  return (
    <section className="mt-10 bg-white border border-ink-100 rounded-xl overflow-hidden shadow-sm">
      {/* Dark header */}
      <div className="bg-ink-900 px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400 mb-0.5">
            Advisor access
          </div>
          <p className="text-xs text-ink-400">
            Invite a coach or advisor to view your workspace — read-only, no editing.
          </p>
        </div>
        <span className="text-2xl flex-shrink-0">🤝</span>
      </div>

      <div className="p-6 space-y-6">
        {/* Active advisors */}
        {!loading && advisors.length > 0 && (
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-400 mb-2">
              Active advisors
            </div>
            <div className="space-y-2">
              {advisors.map(a => {
                const isConfirming = confirming?.kind === 'remove-advisor' && confirming.id === a.id
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 border border-ink-100 rounded-lg px-4 py-2.5 bg-ink-50/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-ink-900 text-brand-400 font-bold text-xs flex items-center justify-center">
                        A
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-ink-900">Advisor</div>
                        <div className="text-[11px] text-ink-400">
                          Access granted {formatDate(a.created_at)}
                        </div>
                      </div>
                    </div>
                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-ink-500">Remove access?</span>
                        <button
                          type="button"
                          onClick={() => confirmRemoveAdvisor(a.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                        >
                          Yes, remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming({ kind: 'remove-advisor', id: a.id })}
                        className="text-xs text-ink-400 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Generate invite link */}
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-400 mb-2">
            Generate invite link
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Advisor's email (optional)"
              className="flex-1 text-sm"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {creating ? 'Generating…' : 'Generate link'}
            </button>
          </div>
          {createErr && (
            <p className="text-[11px] text-red-600 mt-1.5">{createErr}</p>
          )}
          <p className="text-[11px] text-ink-400 mt-1.5 leading-relaxed">
            The link is valid for 30 days. Copy it and share directly with your advisor — they'll create a free account if they don't have one.
          </p>
        </div>

        {/* Pending invite links */}
        {pendingInvites.length > 0 && (
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-400 mb-2">
              Pending links
            </div>
            <div className="space-y-2">
              {pendingInvites.map(inv => {
                const isConfirming = confirming?.kind === 'revoke-invite' && confirming.id === inv.id
                return (
                  <div key={inv.id} className="flex items-center gap-2 border border-ink-100 rounded-lg px-3 py-2 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ink-500 truncate font-mono">
                        {buildInviteUrl(inv.token).replace('https://', '')}
                      </div>
                      <div className="text-[10.5px] text-ink-400 mt-0.5">
                        Expires {formatDate(inv.expires_at)}
                        {inv.email && ` · for ${inv.email}`}
                      </div>
                    </div>
                    {isConfirming ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => confirmRevoke(inv.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
                        >
                          Yes, revoke
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopy(inv)}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            copiedId === inv.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-ink-100 hover:bg-ink-200 text-ink-700'
                          }`}
                        >
                          {copiedId === inv.id ? '✓ Copied' : 'Copy link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming({ kind: 'revoke-invite', id: inv.id })}
                          className="flex-shrink-0 text-xs text-ink-300 hover:text-red-500 transition-colors"
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && advisors.length === 0 && pendingInvites.length === 0 && (
          <p className="text-sm text-ink-400">
            No advisors yet. Generate a link above and share it with your coach, accountant, or mentor.
          </p>
        )}
      </div>
    </section>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
