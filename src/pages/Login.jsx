import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { SITE_URL, SITE_NAME } from '../lib/seo'

/**
 * Login — premium split-screen treatment. Left side is the dark brand zone
 * (the pitch), right side is the sign-in card. On mobile the dark
 * zone collapses above the card.
 *
 * The brand side does more than decoration — it sets the emotional tone
 * before the user has even typed anything. Serious operators sign in here.
 *
 * SEO posture: noindex. Login pages should never be indexed — they have
 * no value in search results, dilute brand SERP real estate, and can
 * leak into "site:leadeos.com" listings instead of marketing pages.
 */
export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [resetMode, setResetMode]   = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent]   = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else navigate('/dashboard')
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setResetSent(true)
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Helmet>
        <title>Sign in — {SITE_NAME}</title>
        <link rel="canonical" href={`${SITE_URL}/login`} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Sign in to your GrowthOS account." />
      </Helmet>

      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <div className="relative md:w-1/2 bg-ink-900 overflow-hidden flex items-center justify-center px-8 py-12 md:py-16">
        {/* ambient gold orbs */}
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
            Welcome back
          </p>

          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
            Someone in your corner who reads the numbers.
          </h1>

          <p className="text-ink-300 text-sm leading-relaxed mb-10 max-w-sm">
            He remembers what you decided and why, argues the hard calls both ways, and tells you when he doesn't know.
          </p>

          {/* Trust signals / stage markers */}
          <div className="space-y-3 max-w-sm">
            <TrustRow text="Reads your books before he says anything" />
            <TrustRow text="Remembers what you decided, and why" />
            <TrustRow text="Tells you plainly when he doesn't know" />
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="md:w-1/2 bg-ink-50 flex items-center justify-center px-6 py-12 md:py-16">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-ink-900 mb-1 tracking-tight">
            Sign in
          </h2>
          <p className="text-sm text-ink-500 mb-8">
            Good to see you again.
          </p>

          {resetMode ? (
            /* ── Forgot password inline ─────────────────────────────── */
            resetSent ? (
              <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-6 text-center">
                <p className="text-2xl mb-2">✉️</p>
                <p className="text-sm font-semibold text-green-800 mb-1">Check your email</p>
                <p className="text-xs text-green-700 leading-relaxed">
                  We sent a password reset link to <strong>{resetEmail}</strong>. Click the link in the email to set a new password.
                </p>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setResetSent(false); setResetEmail('') }}
                  className="mt-4 text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <p className="text-sm text-ink-600 mb-4 leading-relaxed">
                    Enter your email and we'll send you a link to reset your password.
                  </p>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gold-gradient text-white rounded-lg px-4 py-3 text-sm font-bold tracking-wide disabled:opacity-50 glow-gold-sm hover:glow-gold transition-all duration-200"
                >
                  {resetLoading ? 'Sending…' : 'Send reset link →'}
                </button>

                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError(null) }}
                  className="w-full text-sm text-ink-400 hover:text-ink-600 text-center"
                >
                  ← Back to sign in
                </button>
              </form>
            )
          ) : (
            /* ── Normal sign in ─────────────────────────────────────── */
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-ink-500">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setResetMode(true); setResetEmail(email); setError(null) }}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
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
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold-gradient text-white rounded-lg px-4 py-3 text-sm font-bold tracking-wide disabled:opacity-50 glow-gold-sm hover:glow-gold transition-all duration-200"
              >
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          )}

          <p className="mt-8 text-sm text-ink-500 text-center">
            New to GrowthOS?{' '}
            <Link to="/signup" className="text-brand-600 hover:text-brand-700 font-semibold">
              Start your free trial
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
