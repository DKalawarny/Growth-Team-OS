import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { supabase } from '../../lib/supabase'
import { parkPendingAcceptance } from '../../lib/terms'
import { WAYOUT_BASE, WAYOUT_NAME_TITLE } from '../../lib/wayout/brand'

/**
 * The way out — its own front door.
 *
 * 🔴 WHY THIS EXISTS. Until now every route here leaned on Eliv8's `/login`, so
 * someone halfway through writing about their marriage and their money got
 * bounced to a page headed "ELIV8 OS — someone in your corner who reads the
 * numbers", and after signing in landed in a business dashboard with a sidebar
 * of P&Ls and succession scores. Two products, two completely different people,
 * one front door belonging to the wrong one.
 *
 * ⭐ THE DOMAIN IS NOT THE BLOCKER, AND I HAD BEEN TREATING IT AS ONE. A
 * separate hostname is worth doing and waits on the name — but the thing that
 * actually made this feel attached to Eliv8 was borrowing its sign-in and its
 * landing page, and neither needed a domain to fix. When the name lands, the
 * hostname simply maps `/` here and nothing below changes.
 *
 * ⚠️ Same auth, same Supabase, same account — deliberately. The spec's rule is
 * one auth layer, and an Eliv8 owner who opens this keeps their existing
 * account. What differs is only what a person sees and where they are returned
 * to.
 */
export default function Enter() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Where they were headed before they were asked to sign in.
  const next = params.get('next') || WAYOUT_BASE

  const [mode, setMode]         = useState('in')   // 'in' | 'new'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed]     = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  const [sent, setSent]         = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (mode === 'new' && !agreed) return
    setBusy(true)
    setError('')

    try {
      if (mode === 'new') {
        // ⚠️ Parked BEFORE the network call, exactly as Eliv8's signup does:
        // with email confirmation on, signUp returns a user with NO session, so
        // the acceptance row cannot be written here — RLS would reject it with
        // auth.uid() null. TermsGate flushes it on the first authenticated load
        // and keeps this timestamp, which is when they actually agreed.
        parkPendingAcceptance()
        const { data, error: e1 } = await supabase.auth.signUp({ email, password })
        if (e1) throw e1
        if (data.session) navigate(next, { replace: true })
        else setSent(true)                  // confirmation email path
      } else {
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password })
        if (e2) throw e2
        navigate(next, { replace: true })
      }
    } catch (err) {
      setError(err.message || 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <WayoutShell title="Check your email">
        <p className="wayout__q">Check your email.</p>
        <p className="wayout__lead">
          There is a link waiting. Open it and you will come straight back here —
          your answers are saved.
        </p>
      </WayoutShell>
    )
  }

  return (
    <WayoutShell title={mode === 'new' ? 'Start' : 'Sign in'}>
      <div className="wayout__spread">
        <div className="wayout__col">
          <h1>{mode === 'new' ? 'Keep your answers.' : 'Welcome back.'}</h1>
          <p className="wayout__lead">
            {mode === 'new'
              ? 'An account so the plan is still here tomorrow, and on your phone.'
              : 'Your answers and your plan are where you left them.'}
          </p>
        </div>

        <div className="wayout__col">
          <form onSubmit={submit}>
            <label className="wayout__label" htmlFor="wayout-email">Email</label>
            <input
              id="wayout-email"
              className="wayout__input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <label className="wayout__label" htmlFor="wayout-password">Password</label>
            <input
              id="wayout-password"
              className="wayout__input"
              type="password"
              autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            {/* ⚠️ Consent is required to create an account and the submit stays
                disabled until it is ticked — the same rule Eliv8 signup follows,
                because it is the same operator and the same terms. */}
            {mode === 'new' && (
              <label className="wayout__consent">
                <input
                  id="wayout-agree"
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                />
                <span>I’m over 18 and I agree to the terms.</span>
              </label>
            )}

            {error && <p className="wayout__error">{error}</p>}

            <button
              className="wayout__btn"
              type="submit"
              disabled={busy || (mode === 'new' && !agreed)}
            >
              {busy ? 'One moment…' : mode === 'new' ? 'Create it' : 'Sign in'}
            </button>
          </form>

          <p className="wayout__hint">
            {mode === 'new' ? 'Already started? ' : 'First time? '}
            <button
              type="button"
              className="wayout__linkbtn"
              onClick={() => { setMode(mode === 'new' ? 'in' : 'new'); setError('') }}
            >
              {mode === 'new' ? 'Sign in' : 'Create an account'}
            </button>
          </p>

          <p className="wayout__fine">
            {WAYOUT_NAME_TITLE} keeps what you write to itself. Nobody else sees it.
          </p>
        </div>
      </div>
    </WayoutShell>
  )
}
