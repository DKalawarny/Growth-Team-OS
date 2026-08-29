import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getInviteByToken, acceptInvite } from '../lib/invites'
import Wordmark from '../components/brand/Wordmark'

/**
 * Invite — advisor accept-invite page.
 *
 * URL: /invite/:token
 *
 * Flow:
 *   1. Load invite metadata from the token (company name, who invited them)
 *   2. If the user isn't logged in, show a sign-in / sign-up form inline
 *   3. Once authenticated, "Accept invite" calls accept_invite() RPC
 *   4. On success, redirect to /advisor
 *
 * The page handles three invite states:
 *   pending  → normal accept flow
 *   accepted → "already accepted, go to portal"
 *   revoked  → "this link is no longer valid"
 *   expired  → "this link has expired, ask the owner to resend"
 */
export default function Invite() {
  const { token }    = useParams()
  const navigate     = useNavigate()

  const [invite, setInvite]       = useState(null)       // the invite row
  const [company, setCompany]     = useState(null)        // the client company
  const [inviteState, setInviteState] = useState('loading') // loading|ok|invalid|expired|revoked|accepted
  const [session, setSession]     = useState(undefined)   // undefined = resolving

  // Auth form
  const [authMode, setAuthMode]   = useState('signin')    // signin | signup
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [name, setName]           = useState('')
  const [authBusy, setAuthBusy]   = useState(false)
  const [authError, setAuthError] = useState(null)

  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState(null)

  // 1. Check current session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 2. Load invite
  useEffect(() => {
    if (!token) { setInviteState('invalid'); return }
    ;(async () => {
      try {
        const inv = await getInviteByToken(token)
        if (!inv) { setInviteState('invalid'); return }

        if (inv.status === 'revoked')   { setInviteState('revoked');   return }
        if (inv.status === 'accepted')  { setInviteState('accepted');  setInvite(inv); return }
        if (new Date(inv.expires_at) < new Date()) { setInviteState('expired'); return }

        setInvite(inv)
        setInviteState('ok')

        // Load the company name for display
        const { data: co } = await supabase
          .from('companies').select('name').eq('id', inv.company_id).maybeSingle()
        setCompany(co ?? null)
      } catch {
        setInviteState('invalid')
      }
    })()
  }, [token])

  // Auth handlers
  async function handleSignIn(e) {
    e.preventDefault()
    setAuthBusy(true); setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setAuthError(error.message); setAuthBusy(false) }
    // session update triggers onAuthStateChange above
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setAuthBusy(true); setAuthError(null)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })
    if (error) { setAuthError(error.message); setAuthBusy(false) }
    // After sign-up Supabase auto-signs in; bootstrap is skipped for advisors
    // (they have no company of their own — that's fine, the invite handler
    //  creates their company_members row and the portal works without bootstrap)
  }

  // Accept invite (called once authenticated)
  async function handleAccept() {
    setAccepting(true); setAcceptError(null)
    try {
      await acceptInvite(token)
      navigate('/advisor-portal', { replace: true })
    } catch (err) {
      setAcceptError(err.message ?? 'Something went wrong.')
      setAccepting(false)
    }
  }

  // ── Render states ──

  if (inviteState === 'loading' || session === undefined) return <Shell><LoadingSpinner /></Shell>

  if (inviteState === 'invalid') return (
    <Shell>
      <StatusCard icon="❌" title="Invite not found" body="This link isn't valid. Ask the business owner to send a new one." />
    </Shell>
  )

  if (inviteState === 'revoked') return (
    <Shell>
      <StatusCard icon="🚫" title="Invite revoked" body="The business owner has revoked this invite link. Ask them to generate a new one." />
    </Shell>
  )

  if (inviteState === 'expired') return (
    <Shell>
      <StatusCard icon="⏰" title="Invite expired" body="This invite link expired after 30 days. Ask the business owner to send a fresh one." />
    </Shell>
  )

  if (inviteState === 'accepted' && !session) return (
    <Shell>
      <StatusCard icon="✅" title="Already accepted" body="This invite has already been used. Sign in to access the workspace." cta={{ label: 'Sign in →', href: '/login' }} />
    </Shell>
  )

  if (inviteState === 'accepted' && session) {
    // Already accepted — just navigate them to the portal
    navigate('/advisor', { replace: true })
    return null
  }

  // ── Normal accept flow ──

  return (
    <Shell>
      <div className="w-full max-w-md">

        {/* Invite card */}
        <div className="bg-white rounded-2xl shadow-xl border border-ink-100 overflow-hidden mb-5">
          <div className="bg-ink-900 px-6 py-5 relative overflow-hidden">
            <div
              className="absolute -top-8 -right-8 w-36 h-36 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)' }}
            />
            <div className="relative">
              <div className="text-3xl mb-2">🤝</div>
              <h1 className="text-lg font-bold text-white leading-tight">
                You've been invited as an advisor
              </h1>
              {company?.name && (
                <p className="text-sm text-brand-300 mt-1">
                  to <span className="font-semibold">{company.name}</span>'s Eliv8 OS workspace
                </p>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-sm text-ink-500 leading-relaxed mb-5">
              As an advisor you'll have read-only access to their roadmap, check-ins, and business intelligence — everything you need to give great advice without being able to change anything.
            </p>

            {/* What they'll see */}
            <div className="space-y-2 mb-5">
              {[
                ['📍', 'Roadmap & milestones'],
                ['📝', 'Weekly check-ins'],
                ['📊', 'Executive briefing (library intelligence)'],
                ['🎯', 'KPIs and progress'],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-2 text-sm text-ink-600">
                  <span aria-hidden>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Accept button — only if already signed in */}
            {session ? (
              <div>
                {acceptError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {acceptError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full py-3 rounded-xl bg-gold-gradient text-white font-bold tracking-wide text-sm glow-gold-sm hover:glow-gold disabled:opacity-50 transition-all duration-200"
                >
                  {accepting ? 'Accepting…' : 'Accept invite →'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-ink-400 text-center">
                Sign in or create a free account below to accept
              </p>
            )}
          </div>
        </div>

        {/* Auth form — only shown when not signed in */}
        {!session && (
          <div className="bg-white rounded-2xl shadow-xl border border-ink-100 overflow-hidden">
            <div className="flex border-b border-ink-100">
              {['signin', 'signup'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setAuthMode(mode); setAuthError(null) }}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    authMode === mode
                      ? 'text-brand-600 border-b-2 border-brand-500 -mb-px'
                      : 'text-ink-400 hover:text-ink-700'
                  }`}
                >
                  {mode === 'signin' ? 'I have an account' : 'Create free account'}
                </button>
              ))}
            </div>

            <form
              onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}
              className="px-6 py-5 space-y-4"
            >
              {authMode === 'signup' && (
                <label className="block">
                  <span className="text-sm font-semibold text-ink-800 mb-1 block">Your name</span>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    required placeholder="Jane Smith"
                    disabled={authBusy}
                  />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold text-ink-800 mb-1 block">Email</span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="you@example.com"
                  disabled={authBusy}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink-800 mb-1 block">Password</span>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  disabled={authBusy}
                />
              </label>

              {authError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
              >
                {authBusy
                  ? (authMode === 'signin' ? 'Signing in…' : 'Creating account…')
                  : (authMode === 'signin' ? 'Sign in' : 'Create account')}
              </button>
            </form>
          </div>
        )}
      </div>
    </Shell>
  )
}

// ── Sub-components ──

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center p-6">
      <div className="mb-6 text-center">
        <Wordmark tone="light" size={24} />
        <div className="text-xs text-ink-400 mt-0.5">Executive team for business owners</div>
      </div>
      {children}
    </div>
  )
}

function StatusCard({ icon, title, body, cta }) {
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-ink-100 overflow-hidden">
      <div className="bg-ink-900 px-6 py-4" />
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">{icon}</div>
        <h2 className="text-lg font-bold text-ink-900 mb-2">{title}</h2>
        <p className="text-sm text-ink-500 leading-relaxed">{body}</p>
        {cta && (
          <a
            href={cta.href}
            className="mt-5 inline-block px-5 py-2.5 rounded-xl bg-ink-900 text-white text-sm font-semibold hover:bg-ink-800 transition-colors"
          >
            {cta.label}
          </a>
        )}
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center gap-3 text-ink-400">
      <span className="w-5 h-5 border-2 border-ink-300 border-t-brand-400 rounded-full animate-spin" />
      <span className="text-sm">Loading invite…</span>
    </div>
  )
}
