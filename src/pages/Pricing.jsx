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
import { PRICE_MONTHLY_USD, PRICE_ANNUAL_USD, ANNUAL_MONTHLY_EQUIV, PRICE_MONTHLY_CAD_EST, PRICE_ANNUAL_CAD_EST, TRIAL_DAYS } from '../lib/pricing'

/**
 * /pricing — public pricing page.
 *
 * SEO posture:
 *   - Per-page Helmet with pricing-specific meta (signals "this is the
 *     pricing page" not "this is the home page")
 *   - Product schema → Google may render the price directly in search
 *     results as a rich snippet. It reads the number from lib/pricing.js;
 *     never hardcode a second copy here.
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
  title:       `Pricing — GrowthOS · $${PRICE_MONTHLY_USD}/month for the AI advisor and every tool`,
  description: `GrowthOS pricing: $${PRICE_MONTHLY_USD}/month or $${PRICE_ANNUAL_USD}/year for Solomon, the advisor for Christian business owners — plus finances, cash flow forecasting, hiring, decisions, playbooks, compliance, and succession. ${TRIAL_DAYS}-day free trial, no credit card required.`,
  path:        '/pricing',
})

const MONTHLY = 'monthly'
const ANNUAL  = 'annual'

// ── Feature groups ────────────────────────────────────────────────────────────
// Each group has a label, icon, and features with a short punchy description.

const FEATURE_GROUPS = [
  {
    label: 'Your advisor',
    icon:  '💡',
    color: 'amber',
    features: [
      { name: 'Solomon', desc: 'Knows your numbers, your people, and what you decided last quarter. Argues the hard calls more than one way and tells you where he lands — and what he cannot see.' },
      { name: 'He remembers', desc: 'Constraints, decisions, people, commitments. You do not re-explain your business every time you open it, and he will tell you when something you say contradicts something you said before.' },
      { name: 'He will say he does not know', desc: 'Answers about rules and obligations come from your own documents and the actual regulation, with the source shown. He does not guess at the law and he does not flatter you.' },
    ],
  },
  {
    label: 'Money',
    icon:  '📈',
    color: 'green',
    features: [
      { name: 'Finances', desc: 'Live figures pulled straight from QuickBooks, with the month read back to you in plain English — what changed, what it means, what to do about it.' },
      { name: 'Cash flow forecast', desc: 'The next thirteen weeks, updated automatically. Know before payroll week becomes a problem.' },
      { name: 'Pricing something honestly', desc: 'What the work is genuinely worth — neither gouging nor underselling yourself out of discomfort.' },
    ],
  },
  {
    label: 'People',
    icon:  '🎯',
    color: 'purple',
    features: [
      { name: 'Think through a hire', desc: 'Whether to hire at all, what the role really is, and what you are actually looking for in the person. Scorecard, questions, and a first-30-days plan if you go ahead.' },
      { name: 'Plan the team you will need', desc: 'What the team should look like in twelve months, and the order to build it in.' },
      { name: 'An honest update for the team', desc: 'Say where the business is really heading, in words you would be comfortable having repeated back to you.' },
      { name: 'Safety and compliance', desc: 'Every licence, registration, and compliance document tracked, so a renewal never catches you out.' },
    ],
  },
  {
    label: 'The business',
    icon:  '🗺️',
    color: 'gray',
    features: [
      { name: 'Roadmap', desc: 'A milestone-by-milestone plan from where you are to where you are going, with the slipped ones surfaced honestly rather than buried.' },
      { name: 'Playbooks', desc: 'Get the jobs that live in your head onto paper, so the business can run a day without you in it.' },
      { name: 'Check-ins', desc: 'A short weekly log. Solomon reads the recent ones so he knows how you are actually doing, not just how the numbers are.' },
      { name: 'Succession', desc: 'What would have to be true for someone else to run this, and how far off that is today.' },
      { name: 'Documents', desc: 'Everything GrowthOS writes for you, saved and searchable.' },
    ],
  },
]

// ── Value comparison ──────────────────────────────────────────────────────────

const REPLACES = [
  { label: 'Business coach or consultant',  low: 500,  high: 2000 },
  { label: 'Part-time bookkeeper',          low: 400,  high: 800  },
  { label: 'Fractional CFO or advisor',     low: 500,  high: 1500 },
  { label: 'Project management tool',       low: 50,   high: 200  },
  { label: 'HR / check-in tool',            low: 30,   high: 150  },
]

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Do I need a credit card to start?',
    a: `Nope. Sign up with your email and get ${TRIAL_DAYS} full days of everything — no card, no commitment. You decide at the end of the trial whether it is worth it.`,
  },
  {
    q: 'What exactly counts as a "report"?',
    a: 'One finished piece of work — a cash-flow forecast, a hiring scorecard, a written playbook. Refining an existing one also counts. In practice most owners run 3–5 a month and never come close to the limit.',
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
          description: 'An AI business advisor for Christian business owners, plus the tools to act on the advice: finances, cash flow forecasting, hiring, decisions, written procedures, compliance, and succession — for one monthly subscription.',
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
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/10 text-brand-400 text-xs font-bold px-4 py-1.5 rounded-full mb-7 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            {TRIAL_DAYS}-day free trial — no credit card
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-5">
            One subscription.<br />
            <span className="text-brand-400">Your entire business team.</span>
          </h1>
          <p className="text-lg text-white/55 max-w-xl mx-auto leading-relaxed">
            An AI advisor who knows your numbers. A live CFO dashboard. A hiring coach. A marketing analyst. A compliance tracker. A growth planner.
            All connected. All for <span className="text-white font-semibold">${PRICE_MONTHLY_USD} a month.</span>
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
                billing === ANNUAL ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-700'
              }`}>
                Save ${PRICE_MONTHLY_USD * 2}
              </span>
            </button>
          </div>
        </div>

        {/* ── Price card ───────────────────────────────────────────────────────── */}
        <section className="max-w-md mx-auto mb-4">
          <div className="relative bg-gray-950 rounded-2xl p-8 border border-white/10 shadow-2xl text-center">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-brand-500 text-gray-950 text-xs font-black px-5 py-1.5 rounded-full shadow-lg uppercase tracking-wide whitespace-nowrap">
                Everything included — no upsells
              </span>
            </div>

            <div className="mt-2 mb-2">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-7xl font-black text-white leading-none">
                  {billing === ANNUAL ? `$${ANNUAL_MONTHLY_EQUIV}` : `$${PRICE_MONTHLY_USD}`}
                </span>
                <div className="text-left">
                  <p className="text-white/40 text-sm leading-tight">USD / mo</p>
                  {/* Derived, never written by hand. These were literal
                      '~$133' / '~$111' — the $97-era conversions — and stayed
                      that way through the price change while
                      PRICE_MONTHLY_CAD_EST sat unused two files away. */}
                  <p className="text-white/25 text-xs leading-tight">
                    ~${billing === ANNUAL ? Math.round(PRICE_ANNUAL_CAD_EST / 12) : PRICE_MONTHLY_CAD_EST} CAD
                  </p>
                </div>
              </div>
              {billing === ANNUAL ? (
                <p className="text-brand-400 font-bold mt-2">Billed annually at ${PRICE_ANNUAL_USD} USD — 2 months completely free</p>
              ) : (
                <p className="text-white/25 text-sm mt-2">Pay annually and pocket $194 — that's 2 months free</p>
              )}
            </div>

            <div className="my-6 border-t border-white/8" />

            <OwnerCta billing={billing} authState={authState} />
            <p className="text-white/20 text-xs mt-4">{TRIAL_DAYS}-day free trial · No credit card · Cancel anytime</p>
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
              href="mailto:support@leadeos.com?subject=GrowthOS%20Agency"
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
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
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
              What ${PRICE_MONTHLY_USD} replaces.
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
                <p className="text-brand-400 font-black text-2xl">${PRICE_MONTHLY_USD}<span className="text-sm font-normal text-brand-400/60">/mo</span></p>
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
            <p className="text-brand-400 text-sm font-bold uppercase tracking-widest mb-3">Start today</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              {TRIAL_DAYS} days free. No card. No risk.
            </h2>
            <p className="text-white/50 max-w-md mx-auto mb-8 leading-relaxed">
              Get your first AI report in under an hour. Ask Solomon anything about your business. See your financials clearly — maybe for the first time.
              If it doesn't change how you run your business, cancel. We won't even ask why.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup?plan=owner"
                className="w-full sm:w-auto px-10 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-gray-950 font-black text-base transition-colors shadow-lg"
              >
                Start free trial — no credit card
              </Link>
              <a
                href="mailto:support@leadeos.com"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 font-semibold text-sm transition-colors"
              >
                Have a question? Email us
              </a>
            </div>
            <p className="mt-6 text-white/20 text-xs">${PRICE_MONTHLY_USD}/month after trial · Cancel anytime · No contracts</p>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        <footer className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-gray-400">
          <span>© GrowthOS · The operating system for service businesses</span>
          <a href="mailto:support@leadeos.com" className="underline hover:text-gray-600">support@leadeos.com</a>
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
          className="w-full rounded-xl px-4 py-4 text-base font-black bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-gray-950 transition-colors shadow-lg"
        >
          {clicking ? 'Redirecting to Stripe…' : `Upgrade now — ${billing === ANNUAL ? `$${PRICE_ANNUAL_USD} / year` : `$${PRICE_MONTHLY_USD} / month`}`}
        </button>
        {err && <p className="text-xs text-red-400 mt-2 text-center">{err}</p>}
      </div>
    )
  }

  return (
    <Link
      to={`/signup?plan=${plan}`}
      className="block w-full text-center rounded-xl px-4 py-4 text-base font-black bg-brand-500 hover:bg-brand-400 text-gray-950 transition-colors shadow-lg"
    >
      Start {TRIAL_DAYS}-day free trial — free
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
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
