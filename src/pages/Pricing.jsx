import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../hooks/useAuth'
import { getSubscription, startCheckout } from '../lib/subscriptions'
import PublicHeader from '../components/layout/PublicHeader'
import {
  buildPageMeta,
  productSchema,
  faqPageSchema,
  jsonLd,
} from '../lib/seo'

/**
 * /pricing — public pricing page.
 *
 * SEO posture:
 *   - Per-page Helmet with pricing-specific meta (signals "this is the
 *     pricing page" not "this is the home page")
 *   - Product schema → Google may render the $97 price directly in
 *     search results as a rich snippet
 *   - FAQPage schema wraps the existing FAQS array → ChatGPT, Claude,
 *     Perplexity, and Google AI can answer specific questions ("does
 *     GrowthOS need a credit card?", "can I cancel?") without crawling
 *     the visible page
 *
 * Why FAQPage schema is high-leverage for AI: when an LLM hits a page
 * with FAQPage JSON-LD, it can extract the Q/A pairs as structured
 * facts. That's how AI answer snippets cite sources accurately. The
 * existing 6 FAQs are well-written for this — minor wording, big lift.
 */
const PRICING_META = buildPageMeta({
  title:       'Pricing — GrowthOS · $97/month for the AI advisor and every tool',
  description: 'GrowthOS pricing: $97/month or $970/year for the full AI advisor (Solomon), CFO Dashboard, cash flow forecasting, hiring planner, Local & AI Visibility audit, safety and compliance tracker, and every other tool. 14-day free trial, no credit card required.',
  path:        '/pricing',
})

const MONTHLY = 'monthly'
const ANNUAL  = 'annual'

// ── Feature groups ────────────────────────────────────────────────────────────
// Each group has a label, icon, and features with a short punchy description.

const FEATURE_GROUPS = [
  {
    label: 'Your AI Advisor',
    icon:  '💡',
    color: 'amber',
    features: [
      { name: 'Solomon', desc: 'On call 24/7. Knows your numbers, your goals, and your team. Opens every morning with what actually matters today.' },
      { name: 'Daily briefings', desc: 'Solomon reads your financials, roadmap, and check-ins overnight — and greets you with what needs your attention.' },
      { name: 'Long-term memory', desc: 'Every conversation builds context. The longer you use it, the smarter the advice.' },
    ],
  },
  {
    label: 'Your Financial Command Center',
    icon:  '📈',
    color: 'green',
    features: [
      { name: 'CFO Dashboard', desc: 'Live KPIs pulled straight from QuickBooks. Monthly commentary in plain English — no accountant required.' },
      { name: 'Cash Flow Forecast', desc: '13-week runway, updated automatically. Know what\'s coming before payroll week arrives.' },
      { name: 'Offer Builder', desc: 'Scope your jobs and price them properly. Stop leaving money on the table with vague quotes.' },
    ],
  },
  {
    label: 'Your Marketing Engine',
    icon:  '📍',
    color: 'blue',
    features: [
      { name: 'Local & AI Visibility', desc: 'Full audit of your Google Business Profile, website, citations, backlinks, and schema — plus a score for how visible you are when customers ask ChatGPT or Google AI who to call.' },
      { name: 'AI search readiness', desc: 'Find out exactly what\'s stopping you from being recommended by AI. Get specific content to create, directories to claim, and the review velocity needed to appear.' },
    ],
  },
  {
    label: 'Your Team & Hiring Tools',
    icon:  '🎯',
    color: 'purple',
    features: [
      { name: 'Hiring Planner', desc: 'Tell us the role, get back a scorecard, interview questions, red flags to watch for, and a 30-day onboarding plan.' },
      { name: 'Org Chart Planner', desc: 'Map the team you need in 12 months — not the one you\'re stuck with today.' },
      { name: 'Team Newsletter', desc: 'Monthly update for your crew. What you built, where you\'re headed, everyone aligned.' },
      { name: 'Safety & Compliance', desc: 'Track every licence, WCB registration, and compliance document. Never miss a renewal.' },
    ],
  },
  {
    label: 'Your Operating System',
    icon:  '🗺️',
    color: 'gray',
    features: [
      { name: 'Growth Roadmap', desc: 'Milestone-by-milestone plan from where you are to where you\'re going. With progress tracking built in.' },
      { name: 'Work Board', desc: 'Tasks, priorities, and progress — visible at a glance. No more sticky notes.' },
      { name: 'Check-ins', desc: 'Weekly reflection log. Your advisor reads your last 5 to stay current on how you\'re actually doing.' },
      { name: 'Document Library', desc: 'Every report GrowthOS generates, saved and searchable. Your whole business, documented.' },
    ],
  },
]

// ── Value comparison ──────────────────────────────────────────────────────────

const REPLACES = [
  { label: 'Business coach or consultant',  low: 500,  high: 2000 },
  { label: 'Part-time bookkeeper',          low: 400,  high: 800  },
  { label: 'Marketing strategy retainer',   low: 500,  high: 1500 },
  { label: 'Project management tool',       low: 50,   high: 200  },
  { label: 'HR / check-in tool',            low: 30,   high: 150  },
]

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Do I need a credit card to start?',
    a: 'Nope. Sign up with your email, get 7 full days of everything — no card, no commitment. You decide at the end of the trial whether it\'s worth it. We think you\'ll stay.',
  },
  {
    q: 'What exactly counts as a "report"?',
    a: 'One finished AI output — a GBP audit, a cash-flow forecast, a hiring scorecard. Refining an existing report also counts. In practice, most owners run 3–5 a month and never come close to the limit.',
  },
  {
    q: 'What if I need more than 10 reports per tool?',
    a: 'Just email us. We\'ll raise your cap the same day, no questions. The limit exists to stop runaway AI bills — not to slow you down.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, always. Monthly plans stop at the end of the billing period. Annual plans can cancel renewal any time — no refund mid-year, but we\'ll never charge you for something you don\'t want.',
  },
  {
    q: 'Is my business data private?',
    a: 'Completely. Your data lives in your own isolated workspace and is never used to train AI models or shared with anyone. What you put in stays yours.',
  },
  {
    q: 'Do I need QuickBooks for this to work?',
    a: 'No — QuickBooks unlocks the CFO dashboard automatically, but every other tool works without it. You can connect it later, or enter financial data manually.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const { session, company, loading: authLoading } = useAuth()
  const [billing,      setBilling]     = useState(MONTHLY)
  const [subscription, setSubscription] = useState(null)
  const [subLoading,   setSubLoading]  = useState(false)
  const [params, setParams] = useSearchParams()
  const [banner,  setBanner]  = useState(() => bannerFromParams(params))

  useEffect(() => {
    if (!params.get('checkout')) return
    const next = new URLSearchParams(params)
    next.delete('checkout')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!company?.id) return
    let cancelled = false
    ;(async () => {
      setSubLoading(true)
      const s = await getSubscription(company.id)
      if (!cancelled) { setSubscription(s); setSubLoading(false) }
    })()
    return () => { cancelled = true }
  }, [company?.id])

  const authState = { isAuthed: !!session, loading: authLoading || subLoading, subscription }

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{PRICING_META.title}</title>
        <link rel="canonical" href={PRICING_META.canonical} />
        {PRICING_META.meta.map((m, i) => {
          // Helmet needs either name=… or property=… — preserve whichever was set
          if (m.property) return <meta key={i} property={m.property} content={m.content} />
          return <meta key={i} name={m.name} content={m.content} />
        })}

        {/* JSON-LD — Product schema (lets Google show $97 price as a rich
            snippet directly in search results) + FAQPage schema (so AI
            assistants can answer specific GrowthOS questions verbatim
            from the structured Q&A list, not by inferring from the page). */}
        <script type="application/ld+json">{jsonLd(productSchema({
          name:        'GrowthOS — AI advisor + business tools',
          description: 'AI business advisor and full operating system for home-services contractors, specialty trades, and field-service companies. CFO dashboard, cash flow forecasting, hiring planner, Local & AI Visibility audit, safety and compliance tracker, growth roadmap, and more — for one monthly subscription.',
          price:       '97',
        }))}</script>
        <script type="application/ld+json">{jsonLd(faqPageSchema(FAQS))}</script>
      </Helmet>

      <PublicHeader />

      {banner && (
        <div className="max-w-2xl mx-auto mt-6 px-6">
          <div className="rounded-xl px-4 py-3 text-sm border bg-gray-50 border-gray-200 text-gray-700" role="status">
            <button onClick={() => setBanner(null)} className="float-right text-gray-400 hover:text-gray-600 ml-3">×</button>
            {banner.text}
          </div>
        </div>
      )}

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gray-950 pt-16 pb-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,158,11,0.10) 0%, transparent 70%)',
        }} />
        <div className="relative max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/10 text-amber-400 text-xs font-bold px-4 py-1.5 rounded-full mb-7 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            14-day free trial — no credit card
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-5">
            One subscription.<br />
            <span className="text-amber-400">Your entire business team.</span>
          </h1>
          <p className="text-lg text-white/55 max-w-xl mx-auto leading-relaxed">
            An AI advisor who knows your numbers. A live CFO dashboard. A hiring coach. A marketing analyst. A compliance tracker. A growth planner.
            All connected. All for <span className="text-white font-semibold">$97 a month.</span>
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/35">
            <span className="flex items-center gap-1.5"><Tick />No contracts</span>
            <span className="flex items-center gap-1.5"><Tick />Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Tick />Your data stays yours</span>
            <span className="flex items-center gap-1.5"><Tick />Setup in under 10 minutes</span>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-6 pb-24">

        {/* ── Billing toggle ───────────────────────────────────────────────────── */}
        <div className="flex justify-center -mt-5 mb-8 relative z-10">
          <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setBilling(MONTHLY)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                billing === MONTHLY ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling(ANNUAL)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billing === ANNUAL ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Annual
              <span className={`text-xs font-black px-2 py-0.5 rounded-full transition-colors ${
                billing === ANNUAL ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'
              }`}>
                Save $194
              </span>
            </button>
          </div>
        </div>

        {/* ── Price card ───────────────────────────────────────────────────────── */}
        <section className="max-w-md mx-auto mb-4">
          <div className="relative bg-gray-950 rounded-2xl p-8 border border-white/10 shadow-2xl text-center">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-amber-500 text-gray-950 text-xs font-black px-5 py-1.5 rounded-full shadow-lg uppercase tracking-wide whitespace-nowrap">
                Everything included — no upsells
              </span>
            </div>

            <div className="mt-2 mb-2">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-7xl font-black text-white leading-none">
                  {billing === ANNUAL ? '$81' : '$97'}
                </span>
                <div className="text-left">
                  <p className="text-white/40 text-sm leading-tight">USD / mo</p>
                  <p className="text-white/25 text-xs leading-tight">{billing === ANNUAL ? '~$111 CAD' : '~$133 CAD'}</p>
                </div>
              </div>
              {billing === ANNUAL ? (
                <p className="text-amber-400 font-bold mt-2">Billed annually at $970 USD (~$1,329 CAD) — 2 months completely free</p>
              ) : (
                <p className="text-white/25 text-sm mt-2">Pay annually and pocket $194 — that's 2 months free</p>
              )}
            </div>

            <div className="my-6 border-t border-white/8" />

            <OwnerCta billing={billing} authState={authState} />
            <p className="text-white/20 text-xs mt-4">14-day free trial · No credit card · Cancel anytime</p>
          </div>
        </section>

        {/* ── Agency teaser ────────────────────────────────────────────────────── */}
        <div className="max-w-md mx-auto mb-20">
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Working with multiple clients?</p>
              <p className="text-xs text-gray-500 mt-0.5">Agency and white-label options — let's talk.</p>
            </div>
            <a
              href="mailto:dkalawarny@hotmail.com?subject=GrowthOS%20Agency"
              className="flex-shrink-0 ml-4 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-white transition-colors"
            >
              Email us →
            </a>
          </div>
        </div>

        {/* ── What you get ─────────────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
              What you're actually getting.
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Not a list of features. A real breakdown of every tool, what it does, and why it matters to your business.
            </p>
          </div>

          <div className="space-y-6">
            {FEATURE_GROUPS.map((group, gi) => (
              <div key={gi} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                {/* Group header */}
                <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <span className="text-2xl">{group.icon}</span>
                  <h3 className="font-black text-gray-900 text-base">{group.label}</h3>
                </div>
                {/* Features */}
                <div className="divide-y divide-gray-50">
                  {group.features.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-4 px-6 py-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{f.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Value comparison ─────────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
              What $97 replaces.
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Most owners are already paying for this advice — just scattered, expensive, and slow.
              GrowthOS pulls it all into one place.
            </p>
          </div>

          <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {REPLACES.map((row, i) => {
              const midpoint = Math.round((row.low + row.high) / 2)
              return (
                <div key={i} className={`flex items-center justify-between px-6 py-4 bg-white ${i < REPLACES.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 font-bold text-lg">✗</span>
                    <span className="text-sm font-medium text-gray-700">{row.label}</span>
                  </div>
                  <span className="text-sm text-gray-400 font-medium tabular-nums">
                    ${row.low.toLocaleString()}–${row.high.toLocaleString()}<span className="text-xs">/mo</span>
                  </span>
                </div>
              )
            })}
            <div className="px-6 py-5 bg-gray-950 flex items-center justify-between">
              <div>
                <p className="text-white font-black text-base">GrowthOS</p>
                <p className="text-white/40 text-xs mt-0.5">Everything above — connected, AI-powered, and always on</p>
              </div>
              <div className="text-right">
                <p className="text-amber-400 font-black text-2xl">$97<span className="text-sm font-normal text-amber-400/60">/mo</span></p>
                <p className="text-white/30 text-xs mt-0.5">vs. $1,480–$4,650/mo separately</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
        <section className="mb-20 max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-8">
            Questions we actually get asked.
          </h2>
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {FAQS.map((faq, i) => (
              <FaqRow key={i} q={faq.q} a={faq.a} last={i === FAQS.length - 1} />
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ───────────────────────────────────────────────────────── */}
        <section className="bg-gray-950 rounded-2xl px-8 py-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(245,158,11,0.10) 0%, transparent 70%)',
          }} />
          <div className="relative">
            <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-3">Start today</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              14 days free. No card. No risk.
            </h2>
            <p className="text-white/50 max-w-md mx-auto mb-8 leading-relaxed">
              Get your first AI report in under an hour. Ask Solomon anything about your business. See your financials clearly — maybe for the first time.
              If it doesn't change how you run your business, cancel. We won't even ask why.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup?plan=owner"
                className="w-full sm:w-auto px-10 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-base transition-colors shadow-lg"
              >
                Start free trial — no credit card
              </Link>
              <a
                href="mailto:dkalawarny@hotmail.com"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 font-semibold text-sm transition-colors"
              >
                Have a question? Email us
              </a>
            </div>
            <p className="mt-6 text-white/20 text-xs">$97/month after trial · Cancel anytime · No contracts</p>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        <footer className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-gray-400">
          <span>© GrowthOS · The operating system for service businesses</span>
          <a href="mailto:dkalawarny@hotmail.com" className="underline hover:text-gray-600">dkalawarny@hotmail.com</a>
        </footer>

      </main>
    </div>
  )
}

// ── Owner CTA ─────────────────────────────────────────────────────────────────

function OwnerCta({ billing, authState }) {
  const [clicking, setClicking] = useState(false)
  const [err, setErr] = useState(null)
  const plan = billing === ANNUAL ? 'owner_annual' : 'owner'

  if (authState.loading) {
    return <div className="w-full h-14 bg-white/10 rounded-xl animate-pulse" />
  }

  const sub = authState.subscription
  const hasLiveSub = sub && (sub.status === 'active' || sub.status === 'trialing')

  if (hasLiveSub) {
    return (
      <Link
        to="/settings"
        className="block w-full text-center rounded-xl px-4 py-4 text-sm font-bold bg-white/10 border border-white/20 text-white/80 hover:bg-white/15 transition-colors"
      >
        You're on the {sub.plan} plan — manage billing →
      </Link>
    )
  }

  if (authState.isAuthed) {
    return (
      <div>
        <button
          type="button"
          onClick={async () => { setErr(null); setClicking(true); try { await startCheckout(plan) } catch (e) { setErr(e.message || 'Could not start checkout'); setClicking(false) } }}
          disabled={clicking}
          className="w-full rounded-xl px-4 py-4 text-base font-black bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 transition-colors shadow-lg"
        >
          {clicking ? 'Redirecting to Stripe…' : `Upgrade now — ${billing === ANNUAL ? '$970 / year' : '$97 / month'}`}
        </button>
        {err && <p className="text-xs text-red-400 mt-2 text-center">{err}</p>}
      </div>
    )
  }

  return (
    <Link
      to={`/signup?plan=${plan}`}
      className="block w-full text-center rounded-xl px-4 py-4 text-base font-black bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors shadow-lg"
    >
      Start 14-day free trial — free
    </Link>
  )
}

// ── FAQ row ───────────────────────────────────────────────────────────────────

function FaqRow({ q, a, last }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={!last ? 'border-b border-gray-100' : ''}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left font-bold text-gray-900 hover:bg-gray-50 transition-colors text-sm"
      >
        {q}
        <svg
          viewBox="0 0 16 16"
          className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>
      {open && (
        <p className="px-6 pb-5 text-sm text-gray-600 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function Tick() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l3 3 7-7" />
    </svg>
  )
}

// ── URL banner ────────────────────────────────────────────────────────────────

function bannerFromParams(params) {
  if (params.get('checkout') === 'canceled') {
    return { tone: 'neutral', text: "Checkout canceled — no charge was made. Come back whenever you're ready." }
  }
  return null
}
