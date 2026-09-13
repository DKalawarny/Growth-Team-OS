import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { supabase } from '../../lib/supabase'
import { WAYOUT_BASE } from '../../lib/wayout/brand'

/**
 * The way out — setting a new password.
 *
 * 🔴 WHY THIS FILE EXISTS. The reset email used to land on Eliv8's
 * /reset-password: a stranger halfway through a plan about their marriage and
 * their money, sent from one product into another one's branding, mid-recovery,
 * at the least confident moment they will ever have with us. Daniel: "it should
 * be a completely different sign in page, eliv8 should not link to this one."
 *
 * ⚠️ Same mechanism as the other product's, deliberately — Supabase puts a
 * recovery token in the URL fragment and the client picks it up as a
 * PASSWORD_RECOVERY event. What differs is only whose page they are standing
 * on while it happens.
 *
 * ⚠️ THIS IS AS FAR AS SEPARATION GOES WITHOUT SPLITTING THE AUTH ITSELF. Both
 * products still share one Supabase project and therefore one user table, which
 * is the decision noted in CLAUDE.md — due before the first real user, because
 * afterwards it means password resets sent to strangers who are mid-plan.
 */
export default function Reset() {
  const navigate = useNavigate()
  const [status, setStatus]   = useState('waiting')  // waiting | ready | done
  const [password, setPassword] = useState('')
  const [show, setShow]       = useState(false)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready')
    })
    // ⚠️ The event can fire before this mounts, so an existing session counts
    // too — otherwise someone who arrives on a fast connection waits forever
    // for something that already happened.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setStatus(s => (s === 'waiting' ? 'ready' : s))
    })
    return () => subscription.unsubscribe()
  }, [])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) { setError(err.message); return }
    setStatus('done')
    // Straight back to where they were going, not to a dashboard.
    setTimeout(() => navigate(`${WAYOUT_BASE}/plan`, { replace: true }), 900)
  }

  if (status === 'done') {
    return (
      <WayoutShell title="Password set">
        <p className="wayout__q">Done.</p>
        <p className="wayout__lead">Taking you back to your plan.</p>
      </WayoutShell>
    )
  }

  return (
    <WayoutShell wide title="Set a password">
      <div className="wayout__spread">
        <div className="wayout__col">
          <h1>Pick a new password.</h1>
          <p className="wayout__lead">
            Then you’re straight back to where you were. Your answers haven’t
            gone anywhere.
          </p>
        </div>

        <div className="wayout__col">
          {status === 'waiting' ? (
            <p className="wayout__notice">
              Open this page from the link in the email — that’s what lets it set
              a new password. If you typed the address in by hand, go back to the
              email and tap the link.
            </p>
          ) : (
            <form onSubmit={submit}>
              <label className="wayout__label" htmlFor="wayout-newpw">New password</label>
              <div className="wayout__pw">
                <input
                  id="wayout-newpw"
                  className="wayout__input"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button type="button" className="wayout__pwtoggle" onClick={() => setShow(v => !v)} aria-pressed={show}>
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="wayout__hint">Eight characters or more.</p>
              {error && <p className="wayout__error">{error}</p>}
              <button className="wayout__btn" type="submit" disabled={busy}>
                {busy ? 'One moment…' : 'Set it'}
              </button>
            </form>
          )}
        </div>
      </div>
    </WayoutShell>
  )
}
