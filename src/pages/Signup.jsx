import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Signup — mirror of Login's split-screen, but the brand-side copy flips
 * to future-orientation. Login is "welcome back," signup is "the start."
 */
export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else navigate('/onboarding')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

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
            <TrustRow text="14-day free trial, no card required" />
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
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
              <p className="text-[11px] text-ink-400 mt-1.5">
                Use at least 8 characters. Mix letters + numbers for extra strength.
              </p>
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
              {loading ? 'Creating your account…' : 'Start my free trial →'}
            </button>

            <p className="text-[11px] text-ink-400 text-center leading-relaxed">
              By creating an account you agree to our terms. Your trial auto-converts after 14 days — cancel from settings anytime.
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
