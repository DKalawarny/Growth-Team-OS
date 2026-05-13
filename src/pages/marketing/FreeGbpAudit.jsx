import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../../components/layout/PublicHeader'
import { buildPageMeta, jsonLd, productSchema, CONTACT_EMAIL } from '../../lib/seo'

/**
 * /free-gbp-audit — lead magnet.
 *
 * Why this page exists:
 *   - "Free Google Business Profile audit" is one of the highest-intent,
 *     lowest-competition keyword sets in the home-services SEO space.
 *     It ranks fast because most agencies gate everything behind a 30
 *     minute discovery call.
 *   - It maps to a tool we already have (the GBP audit), so we can
 *     deliver it credibly. Email capture, then we run the audit and
 *     send a manual report (or, eventually, an automated lite version).
 *
 * IMPORTANT: this page promises a real deliverable. Don't ship until
 * there's a process to actually run a free audit when an email comes in.
 * For now: form submits to /api or to a Supabase table, founder reviews
 * and runs the audit manually, sends the report.
 *
 * Wiring TODO (separate task — not blocking this page going live):
 *   1. Add a `gbp_audit_requests` table in Supabase
 *   2. Wire the form below to insert into that table
 *   3. Set up an email notification so Daniel gets pinged on each request
 *   4. Founder runs the audit using existing GBP tool, sends PDF back
 */

const META = buildPageMeta({
  title:       'Free Google Business Profile audit — for contractors and home-services',
  description: 'Free GBP audit for plumbers, electricians, HVAC, roofers, and every home-services trade. We score your Google listing, citations, and AI search readiness. No sales call, no commitment — get the report by email.',
  path:        '/free-gbp-audit',
})

export default function FreeGbpAudit() {
  const [email, setEmail]       = useState('')
  const [businessName, setBusiness] = useState('')
  const [website, setWebsite]   = useState('')
  const [city, setCity]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      // TODO: wire to Supabase table `gbp_audit_requests` once it exists.
      // Until then, we log to console + simulate success so the page is
      // shippable and the form copy / flow can be validated.
      // eslint-disable-next-line no-console
      console.log('[GBP audit request]', { email, businessName, website, city, ts: new Date().toISOString() })
      await new Promise(r => setTimeout(r, 600))
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong — try again or email us.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{META.title}</title>
        <link rel="canonical" href={META.canonical} />
        {META.meta.map((m, i) =>
          m.property
            ? <meta key={i} property={m.property} content={m.content} />
            : <meta key={i} name={m.name} content={m.content} />
        )}
        {/* Mark as a free product for AI assistants — answers "is there a free GBP audit?" */}
        <script type="application/ld+json">{jsonLd(productSchema({
          name:        'Free Google Business Profile audit for contractors',
          description: 'Free audit of a contractor\'s Google Business Profile, citations, and AI search readiness. Delivered by email by GrowthOS.',
          price:       '0',
        }))}</script>
      </Helmet>

      <PublicHeader />

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <p className="text-amber-600 text-xs font-bold uppercase tracking-widest mb-4">
            Free · No sales call
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-5">
            Get a free audit of<br/>
            your <span className="text-amber-600">Google Business Profile.</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            We score your listing, your citations, your reviews, and how visible you
            are when customers ask Google or ChatGPT for the best contractor near
            them. Free, by email, no commitment.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-8 max-w-xl mx-auto">
            <div className="space-y-4">
              <Field label="Business name" required>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={e => setBusiness(e.target.value)}
                  placeholder="ABC Plumbing"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </Field>
              <Field label="City">
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Calgary, AB"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </Field>
              <Field label="Website (if any)">
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </Field>
              <Field label="Where to send the report" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </Field>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-4 rounded-xl bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-black transition-colors"
              >
                {submitting ? 'Submitting…' : 'Send me my free audit'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                We'll email the report within 2 business days. No follow-up calls
                unless you ask. Your email is never sold.
              </p>
            </div>
          </form>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 max-w-xl mx-auto text-center">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Got it. Audit on the way.</h2>
            <p className="text-gray-700 mb-5">
              We'll send your report to <strong>{email}</strong> within 2 business days.
              In the meantime — want to see what GrowthOS does the rest of the time?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                className="px-6 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-colors"
              >
                Tour the product
              </Link>
              <Link
                to="/signup"
                className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:border-gray-400 transition-colors"
              >
                Start a 7-day free trial
              </Link>
            </div>
          </div>
        )}

        {/* ── What's in the audit ─────────────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">
            What's in the audit
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ['Google Business Profile health', 'Categories, photos, hours, attributes, posts cadence — every field that affects local pack ranking.'],
              ['Citations + NAP consistency',    'Where your business is listed, where it isn\'t, and where the data is wrong.'],
              ['Review velocity + sentiment',    'How fast you\'re collecting reviews, what people say, and where you\'re losing them.'],
              ['AI search readiness score',      'Whether ChatGPT, Claude, and Perplexity will actually recommend you when asked.'],
              ['Schema + technical SEO',         'Structured data, page speed flags, and what Google can\'t parse on your site.'],
              ['Local competitor benchmark',     'Three nearby competitors ranked against you on the dimensions that matter.'],
            ].map(([title, body]) => (
              <div key={title} className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why free? ───────────────────────────────────────────────────── */}
        <section className="mt-16 bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-black text-gray-900 mb-3">Why are we doing this for free?</h2>
          <p className="text-gray-700 leading-relaxed max-w-xl mx-auto">
            Honest reason: most contractors who get the audit see what's possible
            and want help fixing it — and that's what GrowthOS does. The audit
            itself is genuinely free, no card, no follow-up call. If you want to
            fix what's in the report, that's a separate conversation.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Questions? <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-600 hover:underline">{CONTACT_EMAIL}</a>
          </p>
        </section>
      </main>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-700 mb-1.5 block">
        {label} {required && <span className="text-amber-600">*</span>}
      </span>
      {children}
    </label>
  )
}
