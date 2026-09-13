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
 * ⚠️ Same auth, same Supabase, same account — deliberately, for now. The spec's
 * rule is one auth layer, and an Eliv8 owner who opens this keeps the account
 * they have. What differs is only what a person sees and where they land.
 *
 * 🔴 FLAGGED TO CHANGE (Daniel, 13 Sep). One Supabase project means ONE USER
 * TABLE across both products, which is why his own email collided here with
 * "User already registered" — he is an Eliv8 owner. For a real way-out user
 * that is invisible today, and their data is already scoped to the PERSON and
 * never the company (migration 046), so nothing of theirs is reachable from the
 * other product.
 *
 * ⚠️ BUT THE COST OF SEPARATING ONLY GOES UP. Splitting means a second Supabase
 * project — its own auth, its own database, and either a duplicated `claude`
 * edge function or a shared gateway in front of both. Do it before real people
 * have accounts and it is configuration. Do it after and it is an account
 * migration with password resets for strangers who are mid-plan, which is the
 * worst possible moment to email somebody asking them to log in again.
 *
 * ⭐ So the decision point is BEFORE THE FIRST REAL USER, and it lands at the
 * same time as the domain and the name — all three are "what is this product
 * on its own" questions.
 */
/**
 * ⚠️ What this screen says depends on where the person was going. Bounced here
 * on the way to the first question, they have nothing saved yet; bounced here
 * on the way to the plan, they do.
 */
function headingFor(next) {
  if (next.endsWith('/plan')) return 'Your plan needs an account.'
  return 'Before the questions.'
}

function leadFor(next) {
  if (next.endsWith('/plan')) {
    return 'So the plan is still here tomorrow, and on your phone rather than just this browser.'
  }
  return 'Six questions, about fifteen minutes. The account is so your answers are still here if you stop halfway.'
}

export default function Enter() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Where they were headed before they were asked to sign in.
  const next = params.get('next') || WAYOUT_BASE

  // 🔴 DEFAULTS TO CREATING AN ACCOUNT, not signing in. The door used to open on
  // "Welcome back — your answers and your plan are where you left them" for
  // someone who had never made one. On a product with no users, first-time IS
  // the common case, and greeting a stranger as a returning customer is the
  // kind of small dishonesty people notice immediately.
  const [mode, setMode]         = useState('new')  // 'new' | 'in'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed]     = useState(false)
  const [show, setShow]         = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  // ⚠️ Guidance is not an error. Rendering "you already have an account" in
  // alarm red tells somebody they have done something wrong when they have not.
  const [notice, setNotice]     = useState('')
  const [sent, setSent]         = useState(false)
  // 🔴 THE DEAD END BEHIND THE DEAD END. Recovering from "already registered"
  // by flipping to sign-in only helps somebody who knows the password. Daniel
  // did not — his is an Eliv8 account from months ago — so the screen bounced
  // him between "you already have an account" and "invalid credentials" with no
  // exit. Eliv8's own login has a reset; this one never did.
  const [resetSent, setResetSent] = useState(false)

  async function sendReset() {
    if (!email) { setError('Put your email in first and I’ll send the link.'); return }
    setBusy(true)
    setError('')
    const { error: e3 } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (e3) setError(e3.message)
    else setResetSent(true)
  }

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
      // 🔴 THIS WAS A DEAD END DRESSED AS AN ERROR. Supabase says "User already
      // registered" and the screen just showed it — no way forward, on the
      // screen standing between somebody and the plan they have just spent
      // fifteen minutes on. They have an account; the only useful response is
      // to sign them in, not to report a database constraint at them.
      const already = /already registered|already exists/i.test(err?.message ?? '')
      if (already) {
        setMode('in')
        setNotice('You already have an account with that email. Sign in and your answers come with you — or reset the password below if you don’t have it.')
      } else if (/invalid login credentials/i.test(err?.message ?? '')) {
        // ⚠️ Never "wrong password" — it might be the wrong email, and telling
        // somebody which one is wrong is also telling a stranger which emails
        // have accounts.
        setError('That email and password don’t match. Reset it below if you’re not sure.')
      } else {
        setError(err.message || 'That did not work.')
      }
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
          {/* ⚠️ The copy follows where they were HEADED. Someone bounced here on
              the way to the questions has not answered any yet, so telling them
              their answers are safe is a sentence about nothing. Someone headed
              for the plan has one. */}
          <h1>{mode === 'in' ? 'Welcome back.' : headingFor(next)}</h1>
          <p className="wayout__lead">
            {mode === 'in'
              ? 'Your answers and your plan are where you left them.'
              : leadFor(next)}
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
            <div className="wayout__pw">
              <input
                id="wayout-password"
                className="wayout__input"
                type={show ? 'text' : 'password'}
                autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {/* ⚠️ Eliv8's sign-in has this and ours did not. On a phone, with a
                  password someone is inventing on the spot, a hidden field is
                  the commonest reason a first attempt fails. */}
              <button
                type="button"
                className="wayout__pwtoggle"
                onClick={() => setShow(v => !v)}
                aria-pressed={show}
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>

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

            {notice && <p className="wayout__notice">{notice}</p>}
            {error && <p className="wayout__error">{error}</p>}
            {resetSent && (
              <p className="wayout__notice">
                Sent. Open the link in that email and you’ll come straight back here.
              </p>
            )}

            <button
              className="wayout__btn"
              type="submit"
              disabled={busy || (mode === 'new' && !agreed)}
            >
              {busy ? 'One moment…' : mode === 'new' ? 'Create it' : 'Sign in'}
            </button>
          </form>

          {mode === 'in' && !resetSent && (
            <p className="wayout__hint">
              Can’t remember it?{' '}
              <button type="button" className="wayout__linkbtn" onClick={sendReset} disabled={busy}>
                Email me a reset link
              </button>
            </p>
          )}

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
