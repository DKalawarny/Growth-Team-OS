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
import { PRICE_MONTHLY_USD, PRICE_ANNUAL_USD, ANNUAL_MONTHLY_EQUIV, PRICE_MONTHLY_CAD_EST, PRICE_ANNUAL_CAD_EST, TRIAL_DAYS, PAYMENTS_LIVE, ANNUAL_SAVINGS_USD, ANNUAL_MONTHS_FREE, SHOW_PUBLIC_PRICE, PILOT_PRICE_LINE, PILOT_PRICE_BLURB } from '../lib/pricing'
import Wordmark from '../components/brand/Wordmark'

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
 *     Eliv8 OS need a credit card?", "can I cancel?") without crawling
 *     the visible page
 *
 * Why FAQPage schema is high-leverage for AI: when an LLM hits a page
 * with FAQPage JSON-LD, it can extract the Q/A pairs as structured
 * facts. That's how AI answer snippets cite sources accurately. The
 * existing 6 FAQs are well-written for this — minor wording, big lift.
 */
const PRICING_META = buildPageMeta({
  title:       SHOW_PUBLIC_PRICE
    ? `Pricing — Eliv8 OS · $${PRICE_MONTHLY_USD}/month for the AI advisor and every tool`
    : 'Pricing — Eliv8 OS · free while in private pilot',
  description: SHOW_PUBLIC_PRICE
    ? `Eliv8 OS pricing: $${PRICE_MONTHLY_USD}/month or $${PRICE_ANNUAL_USD}/year for Solomon, an advisor who reads your actual numbers, plus finances, cash flow forecasting, hiring, decisions, SOPs, compliance, and succession. ${TRIAL_DAYS}-day free trial, no credit card required.`
    : 'Eliv8 OS is in private pilot and free to use: Solomon the advisor, plus finances, cash flow forecasting, hiring, decisions, SOPs, compliance and succession. We are setting the price with the first owners using it. No card required.',
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
      { name: 'Solomon', desc: 'Solomon knows your numbers, your people and what you decided last quarter. On the hard decisions it argues both sides, then tells you which way it leans and what it cannot see.' },
      { name: 'Remembers your business', desc: 'Solomon remembers your limits, your decisions, your people and what you said you would do. You never have to explain the business twice. If you say something that contradicts what you said before, it tells you.' },
      { name: 'Will not guess', desc: 'When you ask about rules and obligations, Solomon answers from your own documents and the actual regulation, and shows you the source. It does not guess at the law and it does not flatter you.' },
    ],
  },
  {
    label: 'Money',
    icon:  '📈',
    color: 'green',
    features: [
      { name: 'Finances', desc: 'Your live figures come straight from QuickBooks. Solomon explains the month in plain English: what changed, what it means and what to do.' },
      { name: 'Cash flow forecast', desc: 'A forecast of your next thirteen weeks that updates itself. You see a tight payroll week before it arrives.' },
      { name: 'Pricing something honestly', desc: 'Find a fair price for the work, one that does not overcharge the customer or shortchange you.' },
    ],
  },
  {
    label: 'People',
    icon:  '🎯',
    color: 'purple',
    features: [
      { name: 'Think through a hire', desc: 'Work out whether to hire at all, what the role really is, and what kind of person you need. If you go ahead, you get a scorecard, interview questions and a plan for their first 30 days.' },
      { name: 'Plan the team you will need', desc: 'See what your team should look like in twelve months, and which roles to fill first.' },
      { name: 'An honest update for the team', desc: 'Tell your team where the business is really heading, in words you would be happy to hear repeated.' },
      { name: 'Safety and compliance', desc: 'Eliv8 OS tracks every licence, registration and compliance document, so a renewal never catches you out.' },
    ],
  },
  {
    label: 'The business',
    icon:  '🗺️',
    color: 'gray',
    features: [
      { name: 'Roadmap', desc: 'A step-by-step plan from where you are to where you want to be. Milestones that slip are shown plainly, not hidden.' },
      { name: 'SOPs', desc: 'Write down the jobs that only you know how to do, so the business can run a day without you.' },
      { name: 'Check-ins', desc: 'You write a short log each week. Solomon reads the recent ones, so the advice fits how you are really doing and not only the numbers.' },
      { name: 'Succession', desc: 'See what has to be in place before someone else can run the business, and how far off you are today.' },
      { name: 'Documents', desc: 'Everything Eliv8 OS writes for you, saved and searchable.' },
    ],
  },
]

// ── Value comparison ──────────────────────────────────────────────────────────

// ⚠️ 31 Aug — "Part-time bookkeeper, $400–800/mo" was removed from this list.
// There is no bookkeeping in the product, and the claim contradicted the
// product in two places: the CFO Dashboard's sixth section is literally
// "pointed questions to take to the bookkeeper" (it assumes you have one), and
// Solomon's own prompt says "I'd want a bookkeeper to confirm the margin
// figure". We defer to a bookkeeper everywhere else and were selling their
// replacement here. The total below moved with it — do not re-add a row
// without checking the product actually does that job.
const REPLACES = [
  { label: 'Business coach or consultant',  low: 500,  high: 2000 },
  { label: 'Fractional CFO or advisor',     low: 500,  high: 1500 },
  { label: 'Project management tool',       low: 50,   high: 200  },
  { label: 'HR / check-in tool',            low: 30,   high: 150  },
]
const REPLACES_LOW  = REPLACES.reduce((n, r) => n + r.low, 0)
const REPLACES_HIGH = REPLACES.reduce((n, r) => n + r.high, 0)

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Do I need a credit card to start?',
    // ⚠️ Same one-offer rule as the landing hero: a trial only means
    // something once there is a price to trial against, and
    // SHOW_PUBLIC_PRICE is false. Do not hardcode either half.
    a: SHOW_PUBLIC_PRICE
      ? `Nope. Sign up with your email and get ${TRIAL_DAYS} full days of everything. No card, no commitment. You decide at the end of the trial whether it is worth it.`
      : 'No. You sign up with your email, with no card and no commitment. Eliv8 OS is free while it is in private pilot, and we are setting the price with the first owners using it.',
  },
  {
    q: 'What exactly counts as a "report"?',
    a: 'A report is one finished piece of work, such as a cash flow forecast, a hiring scorecard or a written SOP. Changing an existing one also counts. Talking to Solomon does not count.',
  },
  {
    q: 'What if I need more than 10 reports per tool?',
    // 12 Oct, Daniel on the old answer ("Just email us. We'll raise your cap
    // the same day, no questions"): "not true, we should have another tier I
    // think for more use later." Nobody was raising caps by email, and the
    // support address has no mailbox. Say what is true: the limit resets, and
    // a bigger plan is coming. Do not name a price for it until there is one.
    // The "$10" that used to be here is OUR cost ceiling per account, not a
    // charge. Daniel read it as a charge ("we aren't charging so how would
    // that work"), so a visitor would too. No dollar figure here.
    a: 'Right now the limit is 10 a month for each tool, and it resets every month. There is also a monthly limit on how much each account can use Solomon and the tools in total. If you reach it, everything pauses until the next month. You are never charged for either limit. They are there because every answer costs us money to run. A plan with more room for heavier use is coming later. If you are hitting the limit, tell us from the Help page in the app, so we know who needs it.',
  },
  {
    q: 'Can I cancel anytime?',
    // 12 Oct: during the pilot there are no monthly or annual plans, so the
    // old answer described billing that does not exist yet.
    a: SHOW_PUBLIC_PRICE
      ? 'Yes, always. A monthly plan stops at the end of the billing period. An annual plan can have its renewal cancelled at any time. We do not refund part of a year, and we will never charge you for something you do not want.'
      : 'Yes. We charge nothing during the pilot, so there is nothing to cancel. You can stop using Eliv8 OS at any time.',
  },
  {
    q: 'Is my business data private?',
    a: 'Your data lives in your own isolated workspace, is never sold or shared, and is not used to train AI models. The providers we send it to do not train on API data. What you put in stays yours.',
  },
  {
    q: 'Do I need QuickBooks for this to work?',
    a: 'No. QuickBooks unlocks the CFO dashboard automatically, but every other tool works without it. You can connect it later, or enter financial data manually.',
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
            assistants can answer specific Eliv8 OS questions verbatim
            from the structured Q&A list, not by inferring from the page). */}
        <script type="application/ld+json">{jsonLd(productSchema({
          name:        'Eliv8 OS, AI advisor + business tools',
          description: 'An AI business advisor, plus the tools to act on the advice: finances, cash flow forecasting, hiring, decisions, written procedures, compliance, and succession, for one monthly subscription.',
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
            {SHOW_PUBLIC_PRICE ? `${TRIAL_DAYS}-day free trial. No credit card` : 'Private pilot, free, no credit card'}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-5">
            One subscription.<br />
            <span className="text-brand-400">Your entire business team.</span>
          </h1>
          {/* ⚠️ 31 Aug — this read "An AI advisor who knows your numbers. A live
              CFO dashboard. A hiring coach. A marketing analyst. A compliance
              tracker. A growth planner. All connected." Three problems, all the
              same family as "All 10+ tools" on the landing card.

              A HIRING COACH AND A MARKETING ANALYST DO NOT EXIST. There is a
              Hiring Planner that builds a scorecard and a GBP/search audit.
              Naming them as people inflates the product exactly where it is
              being asked for money.

              It was also six parallel fragments — the advertising register that
              got nine landing headlines rejected — and it said "who" of the
              product, days after the pronoun pass. Named tools and one concrete
              claim instead of six personas.

              ⚠️ "ten tools" is the honest count of what is REACHABLE (nine in
              the /tools grid plus Succession in the sidebar). Do not round it up
              and do not write "10+". */}
          <p className="text-lg text-white/55 max-w-xl mx-auto leading-relaxed">
            Solomon reads your books and remembers what you decided. You also get ten tools that work from the same numbers, including the CFO dashboard, a thirteen-week cash flow forecast, hiring, pricing, compliance and succession. {SHOW_PUBLIC_PRICE
              ? <>All for <span className="text-white font-semibold">${PRICE_MONTHLY_USD} a month.</span></>
              : <span className="text-white font-semibold">Free while we are in private pilot.</span>}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/35">
            <span className="flex items-center gap-1.5"><Tick />No contracts</span>
            <span className="flex items-center gap-1.5"><Tick />Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Tick />Your data stays yours</span>
            <span className="flex items-center gap-1.5"><Tick />Nothing to install</span>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-6 pb-24">

        {/* ── Billing toggle ───────────────────────────────────────────────────
            Hidden while no price is published: a monthly/annual switch that
            toggles between two things you cannot buy is just confusing. */}
        {SHOW_PUBLIC_PRICE && (
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
                Save ${ANNUAL_SAVINGS_USD}
              </span>
            </button>
          </div>
        </div>
        )}

        {/* ── Price card ───────────────────────────────────────────────────────── */}
        <section className="max-w-md mx-auto mb-4">
          <div className="relative bg-gray-950 rounded-2xl p-8 border border-white/10 shadow-2xl text-center">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-brand-500 text-gray-950 text-xs font-black px-5 py-1.5 rounded-full shadow-lg uppercase tracking-wide whitespace-nowrap">
                Everything included. No upsells
              </span>
            </div>

            {SHOW_PUBLIC_PRICE ? (
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
                <p className="text-brand-400 font-bold mt-2">Billed annually at ${PRICE_ANNUAL_USD} USD, 2 months completely free</p>
              ) : (
                <p className="text-white/25 text-sm mt-2">Pay annually and pocket ${ANNUAL_SAVINGS_USD}, that's {ANNUAL_MONTHS_FREE} months free</p>
              )}
            </div>
            ) : (
            <div className="mt-2 mb-2">
              <p className="text-4xl font-black text-white leading-tight">{PILOT_PRICE_LINE}</p>
              <p className="text-white/40 text-sm mt-3 leading-relaxed">{PILOT_PRICE_BLURB}</p>
            </div>
            )}

            <div className="my-6 border-t border-white/8" />

            <OwnerCta billing={billing} authState={authState} />
            <p className="text-white/20 text-xs mt-4">{SHOW_PUBLIC_PRICE ? `${TRIAL_DAYS}-day free trial · No credit card · Cancel anytime` : 'Free while in private pilot · No credit card · Cancel anytime'}</p>
          </div>
        </section>

        {/* ── Agency teaser ────────────────────────────────────────────────────── */}
        <div className="max-w-md mx-auto mb-20">
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Working with multiple clients?</p>
              <p className="text-xs text-gray-500 mt-0.5">Agency and white-label options, let's talk.</p>
            </div>
            <a
              href="mailto:support@eliv8os.com?subject=Eliv8 OS%20Agency"
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
              Here is every tool, what it does, and why it matters to your business.
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
              {SHOW_PUBLIC_PRICE ? `What $${PRICE_MONTHLY_USD} replaces.` : 'What it replaces.'}
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Most owners already pay for this advice. It is scattered, expensive and slow. Eliv8 OS puts it in one place.
            </p>
          </div>

          <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {REPLACES.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-red-400 font-bold text-lg">✗</span>
                  <span className="text-[15px] font-medium text-gray-800">{row.label}</span>
                </div>
                <span className="text-[15px] text-gray-600 font-medium tabular-nums whitespace-nowrap">
                  ${row.low.toLocaleString()} to ${row.high.toLocaleString()}<span className="text-xs">/mo</span>
                </span>
              </div>
            ))}
            {/* 12 Oct, Daniel: "we should have the total of all those added at
                the bottom, then free right now." The total was a pale 12px
                line under the Eliv8 price. It is its own row now, added up
                from the rows above so it can never drift from them. */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
              <span className="text-[15px] font-bold text-gray-900">Paid for separately</span>
              <span className="text-base sm:text-lg font-black text-gray-900 tabular-nums whitespace-nowrap">
                ${REPLACES_LOW.toLocaleString()} to ${REPLACES_HIGH.toLocaleString()}<span className="text-sm font-semibold">/mo</span>
              </span>
            </div>
            <div className="px-4 sm:px-6 py-5 bg-gray-950 flex items-center justify-between gap-4">
              <div>
                <Wordmark tone="dark" size={16} />
                <p className="text-white/70 text-[13px] mt-1">Everything above, working from the same set of numbers</p>
              </div>
              <p className="text-brand-400 font-black text-xl sm:text-2xl text-right flex-shrink-0">
                {SHOW_PUBLIC_PRICE ? <>${PRICE_MONTHLY_USD}<span className="text-sm font-normal text-brand-400/60">/mo</span></> : 'Free right now'}
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
        <section className="mb-20 max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-8">
            The questions worth asking.
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
              {SHOW_PUBLIC_PRICE ? `${TRIAL_DAYS} days free. No card. No risk.` : 'Free while in pilot. No card. No risk.'}
            </h2>
            <p className="text-white/50 max-w-md mx-auto mb-8 leading-relaxed">
              Connect QuickBooks or start without it. Ask Solomon anything about your business and see what it says with your real numbers in front of it. We charge nothing during the pilot, and we will tell you well before that changes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup?plan=owner"
                className="w-full sm:w-auto px-10 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-gray-950 font-black text-base transition-colors shadow-lg"
              >
                {SHOW_PUBLIC_PRICE ? 'Start free trial. No credit card' : 'Start free. No credit card'}
              </Link>
              {/* 16 Oct, Daniel on the support inbox: "ideally we dont want
                  people using it much". The demo answers most questions. */}
              <Link
                to="/demo"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 font-semibold text-sm transition-colors"
              >
                Open the live demo
              </Link>
            </div>
            <p className="mt-6 text-white/20 text-xs">{SHOW_PUBLIC_PRICE ? `$${PRICE_MONTHLY_USD}/month after trial · Cancel anytime · No contracts` : 'Free while in private pilot · Cancel anytime · No contracts'}</p>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        <footer className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-gray-400">
          <span>© Eliv8 OS · An advisor for owners who care how it&rsquo;s run, not only what it returns</span>
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
        You're on the {sub.plan} plan, manage billing →
      </Link>
    )
  }

  // ⚠️ During the pilot this rendered a live-looking "Upgrade now — $147 /
  // month" button whose handler began `if (!PAYMENTS_LIVE) return` — so it
  // looked enabled, showed no error, and did nothing at all when clicked. A
  // dead primary CTA reads as a broken product, and it contradicts the pilot
  // agreement it sits next to. Settings → Billing already handles this state
  // properly; say the same thing here.
  if (authState.isAuthed && !PAYMENTS_LIVE) {
    return (
      <div className="rounded-xl px-4 py-4 text-center bg-white/5 border border-white/15">
        <p className="text-sm font-bold text-white/90">You're on the free pilot</p>
        <p className="text-xs text-white/50 mt-1">
          Nothing to pay and no card on file. If pricing is introduced you'll be
          told before anything is charged.
        </p>
      </div>
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
          {clicking ? 'Redirecting to Stripe…' : `Upgrade now, ${billing === ANNUAL ? `$${PRICE_ANNUAL_USD} / year` : `$${PRICE_MONTHLY_USD} / month`}`}
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
      {SHOW_PUBLIC_PRICE ? `Start ${TRIAL_DAYS}-day free trial` : 'Start free'}
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
    return { tone: 'neutral', text: "Checkout canceled. No charge was made. Come back whenever you're ready." }
  }
  return null
}
