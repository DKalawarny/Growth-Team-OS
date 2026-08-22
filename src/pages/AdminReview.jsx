import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

/**
 * AdminReview — internal-only page at /admin/review.
 *
 * Purpose:
 *   Lets the platform owner (Daniel) sit down on a Sunday morning and read
 *   the last week of Solomon conversations across every company. The point
 *   is QA: spot any answers that drifted out of scope (HR/legal/tax advice),
 *   any tone slips, or any factual hallucinations — and flag them so the
 *   prompts can be tightened.
 *
 * Why this is a page and not a Supabase Studio query:
 *   It's about building the HABIT. A reading view that mimics the chat the
 *   user actually sees, with a single-tap flag button, makes review
 *   sustainable. SQL works for one-offs but doesn't scale to "do this every
 *   Sunday."
 *
 * Access:
 *   Gated on the logged-in user's email matching ADMIN_EMAILS below. No
 *   role table, no DB migration — small enough to keep dead simple.
 *   Update ADMIN_EMAILS to grant access to a co-admin.
 *
 * Data shape:
 *   Pulls chat_messages where chat_type='advisor' from the last N days,
 *   joined client-side with profiles + companies for names. Groups by
 *   company → conversation (defined as messages within 60 min gaps).
 *
 * Flagging:
 *   Stored in localStorage under `growthos:review-flags` as a Set of
 *   message IDs plus per-id notes. Deliberately client-side for v1 —
 *   moving to a `flagged_messages` table is a 5-minute migration once
 *   the habit is real.
 */

const ADMIN_EMAILS = ['dkalawarny@hotmail.com']
const DEFAULT_DAYS = 7
const STORAGE_KEY  = 'growthos:review-flags'
// New conversation when gap between messages exceeds this many minutes.
const CONVO_GAP_MIN = 60

// ── Flag persistence helpers ──────────────────────────────────────────────

function loadFlags() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveFlags(flags) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch {
    // ignore quota errors — flagging is best-effort
  }
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AdminReview() {
  const { session, profile, loading: authLoading } = useAuth()

  const [days,     setDays]     = useState(DEFAULT_DAYS)
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [flags,    setFlags]    = useState(() => loadFlags())
  const [activeCompany, setActiveCompany] = useState(null) // null = list view

  const userEmail = session?.user?.email?.toLowerCase()
  const isAdmin   = userEmail && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(userEmail)

  // ── Fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        const [msgRes, profRes, compRes] = await Promise.all([
          supabase
            .from('chat_messages')
            .select('id, company_id, user_id, role, content, created_at')
            .eq('chat_type', 'advisor')
            .gte('created_at', since)
            .order('created_at', { ascending: true }),
          supabase.from('profiles').select('id, name'),
          supabase.from('companies').select('id, name'),
        ])
        if (cancelled) return

        if (msgRes.error)  throw msgRes.error
        if (profRes.error) throw profRes.error
        if (compRes.error) throw compRes.error

        const profiles  = Object.fromEntries((profRes.data ?? []).map(p => [p.id, p.name]))
        const companies = Object.fromEntries((compRes.data ?? []).map(c => [c.id, c.name]))
        setData({ messages: msgRes.data ?? [], profiles, companies })
      } catch (err) {
        if (!cancelled) setError(err.message ?? String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [days, isAdmin])

  // ── Group messages: company → conversation thread ─────────────────────
  const groupedByCompany = useMemo(() => {
    if (!data) return []
    const byCompany = new Map()

    for (const m of data.messages) {
      const key = m.company_id
      if (!byCompany.has(key)) byCompany.set(key, [])
      byCompany.get(key).push(m)
    }

    const out = []
    for (const [companyId, msgs] of byCompany.entries()) {
      // Split into conversations on 60-min gaps
      const convos = []
      let current = []
      let lastTs = null
      for (const m of msgs) {
        const ts = new Date(m.created_at).getTime()
        if (lastTs != null && (ts - lastTs) > CONVO_GAP_MIN * 60_000) {
          if (current.length) convos.push(current)
          current = []
        }
        current.push(m)
        lastTs = ts
      }
      if (current.length) convos.push(current)

      // Newest conversation first
      convos.reverse()

      out.push({
        companyId,
        companyName: data.companies[companyId] ?? '(unknown company)',
        messageCount: msgs.length,
        convoCount:   convos.length,
        lastActivity: msgs[msgs.length - 1].created_at,
        convos,
      })
    }
    // Sort by most recent activity
    out.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
    return out
  }, [data])

  const flaggedCount = Object.keys(flags).length

  // ── Flag actions ─────────────────────────────────────────────────────
  function toggleFlag(messageId, note = '') {
    setFlags(prev => {
      const next = { ...prev }
      if (next[messageId]) delete next[messageId]
      else next[messageId] = { note, flaggedAt: new Date().toISOString() }
      saveFlags(next)
      return next
    })
  }

  function updateNote(messageId, note) {
    setFlags(prev => {
      if (!prev[messageId]) return prev
      const next = { ...prev, [messageId]: { ...prev[messageId], note } }
      saveFlags(next)
      return next
    })
  }

  function clearAllFlags() {
    if (!window.confirm('Clear all flags? This cannot be undone.')) return
    setFlags({})
    saveFlags({})
  }

  // ── Auth gate ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-white border border-ink-100 rounded-xl shadow-sm p-8">
          <p className="text-sm text-ink-700">This page is restricted.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-xs font-bold text-brand-600 hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────
  if (activeCompany) {
    const group = groupedByCompany.find(g => g.companyId === activeCompany)
    return (
      <CompanyView
        group={group}
        profiles={data?.profiles ?? {}}
        flags={flags}
        onToggleFlag={toggleFlag}
        onUpdateNote={updateNote}
        onBack={() => setActiveCompany(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-700">
              Internal — Admin only
            </div>
            <h1 className="text-xl font-bold text-ink-900 leading-tight">Solomon chat review</h1>
            <p className="text-[11px] text-ink-400 mt-1 max-w-md leading-snug">
              Read the last {days} days of advisor conversations. Flag any answer that drifted out of scope, slipped tone, or made something up — then tighten the prompts.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <label className="text-ink-400">Window</label>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="bg-ink-800 text-white border border-ink-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {flaggedCount > 0 && (
          <FlagSummary
            flags={flags}
            messages={data?.messages ?? []}
            companies={data?.companies ?? {}}
            onClear={clearAllFlags}
          />
        )}

        {loading && (
          <div className="bg-white border border-ink-100 rounded-xl p-8 text-center text-sm text-ink-500">
            Loading conversations…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && groupedByCompany.length === 0 && (
          <div className="bg-white border border-ink-100 rounded-xl p-12 text-center">
            <p className="text-sm font-semibold text-ink-700">No conversations in this window</p>
            <p className="text-xs text-ink-500 mt-1">Try widening the window or come back later.</p>
          </div>
        )}

        {!loading && !error && groupedByCompany.map(group => (
          <button
            key={group.companyId}
            onClick={() => setActiveCompany(group.companyId)}
            className="w-full text-left bg-white border border-ink-100 rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900 truncate">{group.companyName}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  {group.convoCount} conversation{group.convoCount === 1 ? '' : 's'} ·{' '}
                  {group.messageCount} message{group.messageCount === 1 ? '' : 's'} ·{' '}
                  Last active {relativeTime(group.lastActivity)}
                </p>
              </div>
              <span className="text-xs text-ink-500 flex-shrink-0">Read →</span>
            </div>
          </button>
        ))}
      </main>
    </div>
  )
}

// ── Company-level view: read all conversations in transcript form ─────────

function CompanyView({ group, profiles, flags, onToggleFlag, onUpdateNote, onBack }) {
  if (!group) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center p-8">
        <button onClick={onBack} className="text-xs font-bold text-brand-600 hover:underline">
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-white border-b border-ink-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button onClick={onBack} className="text-[11px] font-bold text-brand-700 hover:underline mb-1">
              ← All companies
            </button>
            <h1 className="text-base font-bold text-ink-900 truncate">{group.companyName}</h1>
            <p className="text-[10px] text-ink-400 mt-0.5">
              {group.convoCount} conversation{group.convoCount === 1 ? '' : 's'} · {group.messageCount} messages
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {group.convos.map((convo, ci) => {
          const first = convo[0]
          const userName = profiles[first.user_id] ?? '(unknown user)'
          return (
            <div key={`${ci}-${first.id}`} className="bg-white border border-ink-100 rounded-xl overflow-hidden">
              <div className="bg-ink-50 px-4 py-2.5 border-b border-ink-100 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-ink-700">
                  {userName} · {new Date(first.created_at).toLocaleString()}
                </p>
                <p className="text-[10px] text-ink-500">{convo.length} message{convo.length === 1 ? '' : 's'}</p>
              </div>
              <div className="p-4 space-y-3">
                {convo.map(m => (
                  <Message
                    key={m.id}
                    msg={m}
                    flag={flags[m.id]}
                    onToggleFlag={onToggleFlag}
                    onUpdateNote={onUpdateNote}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}

// ── Single message bubble + flag UI ───────────────────────────────────────

function Message({ msg, flag, onToggleFlag, onUpdateNote }) {
  const [noteOpen, setNoteOpen] = useState(Boolean(flag))
  const isUser = msg.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-ink-900 text-white'
              : 'bg-brand-50 text-ink-900 border border-brand-100'
          }`}
        >
          {msg.content}
        </div>

        {/* Only Solomon's responses get a flag affordance. The owner's
            messages don't need flagging — we're auditing Solomon, not them. */}
        {!isUser && (
          <div className="mt-1.5 flex items-center gap-2">
            <button
              onClick={() => {
                onToggleFlag(msg.id)
                setNoteOpen(true)
              }}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                flag
                  ? 'bg-amber-200 text-amber-900'
                  : 'text-ink-500 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              {flag ? '⚑ Flagged' : '⚑ Flag'}
            </button>
            <span className="text-[10px] text-ink-400">{new Date(msg.created_at).toLocaleTimeString()}</span>
          </div>
        )}

        {!isUser && flag && noteOpen && (
          <textarea
            value={flag.note ?? ''}
            onChange={e => onUpdateNote(msg.id, e.target.value)}
            placeholder="Why? (e.g. 'Gave specific HR advice — should redirect to Employment Standards')"
            className="mt-2 w-full text-xs bg-amber-50 border border-amber-200 rounded p-2 resize-y min-h-[44px] focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        )}
      </div>
    </div>
  )
}

// ── Flag summary at the top of the list view ──────────────────────────────

function FlagSummary({ flags, messages, companies, onClear }) {
  const ids = Object.keys(flags)
  const messagesById = useMemo(
    () => Object.fromEntries(messages.map(m => [m.id, m])),
    [messages],
  )

  function copySummary() {
    const lines = ids.map(id => {
      const m = messagesById[id]
      const f = flags[id]
      if (!m) return `[Flag ${id}] ${f.note || ''}`
      return [
        `Company: ${companies[m.company_id] ?? m.company_id}`,
        `When:    ${new Date(m.created_at).toLocaleString()}`,
        `Note:    ${f.note || '(no note)'}`,
        `Solomon said: ${(m.content || '').slice(0, 600)}${m.content?.length > 600 ? '…' : ''}`,
      ].join('\n')
    })
    const text = `Solomon review notes — ${new Date().toLocaleDateString()}\n\n${lines.join('\n\n---\n\n')}`
    navigator.clipboard?.writeText(text).then(
      () => window.alert(`Copied ${ids.length} flag${ids.length === 1 ? '' : 's'} to clipboard.`),
      () => window.alert('Copy failed — your browser may have blocked clipboard access.'),
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 leading-none mt-0.5">⚑</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">
            {ids.length} flagged message{ids.length === 1 ? '' : 's'}
          </p>
          <p className="text-[11px] text-amber-800 mt-0.5">
            Saved locally to this browser. Copy them out before clearing — that's your prompt-tuning to-do list.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={copySummary}
              className="text-[11px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1 rounded"
            >
              Copy review notes
            </button>
            <button
              onClick={onClear}
              className="text-[11px] font-bold text-amber-800 hover:underline px-2 py-1"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tiny helpers ──────────────────────────────────────────────────────────

function relativeTime(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const min = Math.floor(ms / 60_000)
  if (min < 1)   return 'just now'
  if (min < 60)  return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)   return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}
