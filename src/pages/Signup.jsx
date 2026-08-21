import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { SITE_URL, SITE_NAME } from '../lib/seo'
import { TRIAL_DAYS } from '../lib/pricing'
import { parkPendingAcceptance } from '../lib/terms'

/**
 * Signup — mirror of Login's split-screen, but the brand-side copy flips
 * to future-orientation. Login is "welcome back," signup is "the start."
 *
 * SEO posture: noindex. The conversion path is Landing/Pricing → Signup,
 * not direct search. Indexing the signup form adds nothing and dilutes
 * the marketing pages' SERP authority.
 */
export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // Required. Blocks submit until ticked — see the note on the checkbox JSX.
  const [agreed, setAgreed] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!agreed) return
    setLoading(true)
    setError(null)

    // Park the acceptance BEFORE the network call.
    //
    // ⚠️ Supabase email confirmation returns a user with NO session, so we
    // cannot write the acceptance row here — the insert would fail RLS with
    // auth.uid() null. TermsGate flushes this on the first authenticated load
    // and keeps this timestamp, which is the moment they actually agreed.
    parkPendingAcceptance()

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else if (data.session) {
      navigate('/onboarding')
    } else {
      // Email confirmation required — show "check your email" state
      setConfirmSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Helmet>
        <title>Start your free trial — {SITE_NAME}</title>
        <link rel="canonical" href={`${SITE_URL}/signup`} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content={`Start your ${TRIAL_DAYS}-day free trial of GrowthOS — an AI business advisor for Christian business owners. No credit card required.`} />
      </Helmet>

      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <div className="relative md:w-1/2 bg-ink-900 overflow-hidden flex items-center justify-center px-8 py-12 md:py-16">
        <div
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.10) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-md">
          <Link to="/" className="inline-block mb-10">
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-white">Growth</span>
              <span className="text-brand-400">OS</span>
            </span>
          </Link>

          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400 mb-3">
            Start your journey
          </p>

          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
            Turn hard work into a business that actually grows.
          </h1>

          <p className="text-ink-300 text-sm leading-relaxed mb-10 max-w-sm">
            A 24-month plan custom-built for where you are today — and the tools, check-ins, and AI advisor to actually execute it.
          </p>

          <div className="space-y-3 max-w-sm">
            <TrustRow text={`${TRIAL_DAYS}-day free trial, no card required`} />
            <TrustRow text="Your roadmap built in the first 10 minutes" />
            <TrustRow text="Cancel anytime from settings" />
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="md:w-1/2 bg-ink-50 flex items-center justify-center px-6 py-12 md:py-16">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-ink-900 mb-1 tracking-tight">
            Create your account
          </h2>
          <p className="text-sm text-ink-500 mb-8">
            Two fields. Fourteen days. Let's go.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 text-xs font-medium"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[11px] text-ink-400 mt-1.5">
                Use at least 8 characters. Mix letters + numbers for extra strength.
              </p>
            </div>

            {confirmSent && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-5 text-center">
                <p className="text-2xl mb-2">✉️</p>
                <p className="text-sm font-semibold text-green-800 mb-1">Check your email</p>
                <p className="text-xs text-green-700 leading-relaxed">
                  We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and sign in.
                </p>
              </div>
            )}

            {!confirmSent && error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!confirmSent && (
            <button
              type="submit"
              disabled={loading}
              disabled={loading || !agreed}
              className="w-full bg-gold-gradient text-white rounded-lg px-4 py-3 text-sm font-bold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed glow-gold-sm hover:glow-gold transition-all duration-200"
            >
              {loading ? 'Creating your account…' : 'Start my free trial →'}
            </button>
            )}

            {/* ⚠️ This replaced the sentence "By creating an account you agree
                to our terms." — which linked to nothing, because no terms
                existed. Asserting an agreement that cannot be produced is
                worse than asking plainly, so now it is a real checkbox with a
                real link and a recorded acceptance.

                It is also no longer claiming the trial auto-converts. Nothing
                is charged during the pilot and no card is collected, so that
                sentence described a thing that could not happen. */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-brand-600"
              />
              <span className="text-[11px] text-ink-400 leading-relaxed">
                I accept the{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-semibold underline underline-offset-2">
                  pilot agreement
                </Link>
                {' '}— GrowthOS is in private pilot, Solomon gives business
                thinking rather than professional advice, and the decisions
                stay mine.
              </span>
            </label>
            <p className="text-[11px] text-ink-400 text-center leading-relaxed">
              Free while in pilot. No card, and nothing is charged.
            </p>
          </form>

          <p className="mt-8 text-sm text-ink-500 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------

function TrustRow({ text }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center mt-0.5">
        <span className="text-brand-300 text-xs leading-none">✓</span>
      </span>
      <span className="text-ink-300 text-sm leading-relaxed">{text}</span>
    </div>
  )
}
