import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  TERMS_VERSION,
  OPERATOR_LEGAL_NAME,
  hasAcceptedCurrentTerms,
  recordAcceptance,
} from '../../lib/terms'

/**
 * TermsGate — blocks the app until the signed-in user has accepted the
 * version of the pilot agreement currently in force.
 *
 * ⭐ WHY A GATE AND NOT JUST A SIGNUP CHECKBOX
 *
 * A checkbox on the signup form only ever covers people who sign up AFTER it
 * ships. It misses the three groups that matter most:
 *
 *   1. Everyone who already has an account. They agreed to nothing, because
 *      until now there was nothing to agree to.
 *   2. Anyone whose signup returns no session. Supabase email confirmation
 *      does exactly this, so the checkbox physically cannot write its row —
 *      the insert fails RLS because auth.uid() is null.
 *   3. Everyone already signed in when a NEW version ships.
 *
 * The gate covers all three, because it asks the only question that actually
 * matters — "is there an acceptance row for the current version?" — rather
 * than assuming a form did its job.
 *
 * ⚠️ IT FAILS OPEN, DELIBERATELY.
 *
 * If the check errors, the app renders normally. Locking a paying-attention
 * pilot user out of their own business data because a network request blipped
 * would be a worse outcome than a delayed acceptance, and they will be asked
 * again on the next load. hasAcceptedCurrentTerms returns null (not false) on
 * error precisely so this distinction is available here.
 */
export default function TermsGate({ children }) {
  const { session, profile } = useAuth()
  const userId = session?.user?.id ?? null

  // null = still checking, true = accepted (or unknown → fail open), false = must accept
  const [accepted, setAccepted] = useState(null)
  const [checked,  setChecked]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!userId) { setAccepted(true); return }
    let cancelled = false
    ;(async () => {
      const result = await hasAcceptedCurrentTerms(userId)
      if (cancelled) return
      // null (error) → treat as accepted. See the fail-open note above.
      setAccepted(result === null ? true : result)
    })()
    return () => { cancelled = true }
  }, [userId, session])

  async function handleAccept() {
    if (!checked || saving) return
    setSaving(true)
    setError('')
    const { error: err } = await recordAcceptance({
      userId,
      companyId: profile?.company_id ?? null,
      source: 'gate',
    })
    if (err) {
      setError('Could not save that — check your connection and try again.')
      setSaving(false)
      return
    }
    setAccepted(true)
    setSaving(false)
  }

  // Still checking, or nothing to do → render the app.
  if (accepted !== false) return children

  return (
    <>
      {/* The app stays mounted underneath so nothing unloads or loses state. */}
      <div aria-hidden="true" className="pointer-events-none select-none">{children}</div>

      <div
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 overflow-y-auto"
        style={{ background: 'rgba(13,20,19,0.55)', backdropFilter: 'blur(3px)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-gate-title"
      >
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-ink-100 p-7 my-auto">
          <h2 id="terms-gate-title" className="text-xl font-black text-ink-900 mb-2">
            Before you carry on
          </h2>
          <p className="text-sm text-ink-500 leading-relaxed mb-5">
            GrowthOS is in private pilot, and there is now an agreement covering
            it. It is short. Please have a look before you accept.
          </p>

          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-5">
            <p className="text-[13.5px] text-ink-800 leading-relaxed">
              GrowthOS is unfinished software being tested. It gives you
              AI-generated business opinions, <strong>not professional advice</strong>,
              and it will sometimes be wrong. Every decision stays yours. Anything
              expensive to get wrong — a hire, a price, a tax or safety question —
              check with a real professional first.
            </p>
          </div>

          <p className="text-[13px] text-ink-500 leading-relaxed mb-5">
            The pilot is free and nothing will be charged to you during it. It is
            run personally by {OPERATOR_LEGAL_NAME} while the company behind
            GrowthOS is being incorporated — when that is done you will be asked
            to accept a version in the company&rsquo;s name.
          </p>

          <label className="flex items-start gap-3 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-brand-600"
            />
            <span className="text-sm text-ink-700 leading-relaxed">
              I have read and accept the{' '}
              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 font-semibold underline underline-offset-2"
              >
                pilot agreement
              </Link>
              , including that GrowthOS does not give professional advice and is
              provided without warranty.
            </span>
          </label>

          {error && (
            <p className="text-xs mb-4" style={{ color: '#b91c1c' }}>{error}</p>
          )}

          <button
            type="button"
            onClick={handleAccept}
            disabled={!checked || saving}
            className="w-full rounded-xl px-5 py-3 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Accept and continue'}
          </button>

          <p className="text-[11px] text-ink-400 text-center mt-3 leading-relaxed">
            Version {TERMS_VERSION}. If you would rather not accept, email
            support and we will close your account.
          </p>
        </div>
      </div>
    </>
  )
}
