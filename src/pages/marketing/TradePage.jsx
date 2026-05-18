import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../../components/layout/PublicHeader'
import { buildPageMeta, jsonLd, productSchema, softwareApplicationSchema, SITE_URL } from '../../lib/seo'
import { PRICE_MONTHLY_USD, TRIAL_DAYS } from '../../lib/pricing'

/**
 * /for/:trade — trade-specific landing pages.
 *
 * Why this page exists:
 *   - Each trade has its own search behaviour. A plumber Googles "AI for
 *     plumbers" or "plumbing business software" — landing pages targeting
 *     those specific terms rank way easier than fighting for "contractor
 *     software."
 *   - A plumber visiting a generic landing has to do mental work to map
 *     "home-services" to "me." A page that says "for plumbers" up top
 *     does that work for them and converts better.
 *
 * Editorial rule: don't fake trade-specific knowledge we don't have.
 * Each entry has shared content (the product story is the same) plus
 * trade-specific framing (vocabulary, problems, examples). If we need
 * to make up a stat or a workflow, write generic copy instead.
 *
 * Adding a new trade:
 *   1. Add an entry to TRADES keyed by URL slug
 *   2. Add the slug to TRADE_SLUGS export at the bottom (used by sitemap)
 *   3. Done — every new trade page is fully indexed and meta'd
 */

const TRADES = {
  plumbers: {
    label:        'plumbers',
    h1Trade:      'plumbing',
    properNoun:   'plumbing',
    icon:         '🔧',
    pain: [
      'Cash flow is hostage to slow-paying property managers and GCs',
      'You estimate two-hour calls in 30 seconds at the kitchen table',
      'Hiring an apprentice is a coin flip — no scorecard, all gut',
      'Customers ask Google or AI "best plumber near me" and your competitor with worse work shows up first',
    ],
    examples: [
      'Solomon flagging a 14-day cash gap from a slow-paying commercial client before payroll week',
      'A scope sheet for a kitchen reno that includes the actual material list, not a generic template',
      'A GBP audit telling you why three local plumbers outrank you',
    ],
    cta: 'Built for plumbing contractors and shop owners',
  },

  electricians: {
    label:        'electricians',
    h1Trade:      'electrical',
    properNoun:   'electrical',
    icon:         '⚡',
    pain: [
      'Material costs (copper, panels, fixtures) move weekly — your quotes age in days',
      'Service calls and project work pull the same crew in opposite directions',
      'Permits, inspections, and licence renewals fall through the cracks',
      'A single $20k commercial bid mistake eats a month of margin',
    ],
    examples: [
      'A bid that catches the new copper price before you send it',
      'Solomon weighing whether to hire a journeyman or a second apprentice',
      'A compliance tracker that tells you the licence renewal is due in 14 days',
    ],
    cta: 'Built for electrical contractors and licensed shops',
  },

  hvac: {
    label:        'HVAC contractors',
    h1Trade:      'HVAC',
    properNoun:   'HVAC',
    icon:         '🌡️',
    pain: [
      'Seasonality whiplashes your cash — Q1 and Q3 are tight, summer is chaos',
      'Maintenance contracts are gold but most software doesn\'t track them',
      'Service technicians, install crews, and office staff pull in different directions',
      'The cost of doing nothing on hiring is bigger than the cost of hiring wrong',
    ],
    examples: [
      'A 13-week cash forecast that knows your Q1 dip is coming',
      'Solomon helping you decide: another tech, or pricing changes first?',
      'AI search visibility audit so you actually appear when someone asks "best HVAC near me"',
    ],
    cta: 'Built for HVAC, heating, and cooling contractors',
  },

  roofing: {
    label:        'roofers',
    h1Trade:      'roofing',
    properNoun:   'roofing',
    icon:         '🏠',
    pain: [
      'Insurance jobs come in waves — you\'re feast-or-famine on cash',
      'Hail and storm work spikes demand and your team can\'t scale fast enough',
      'Material lead times surprise you mid-project',
      'Your "best" lead source last year became your worst this year — but you don\'t know why',
    ],
    examples: [
      'Cash flow forecasting that accounts for insurance pay timing',
      'A hiring scorecard for a foreman with 5 years of storm-work experience',
      'A GBP audit that explains why roofing competitors outrank you on weather-event days',
    ],
    cta: 'Built for roofing contractors and storm-restoration crews',
  },

  demolition: {
    label:        'demolition contractors',
    h1Trade:      'demolition',
    properNoun:   'demolition and abatement',
    icon:         '🔨',
    pain: [
      'Disposal and tipping fees move constantly and quietly eat margins',
      'Asbestos / hazmat compliance docs scatter across email, drive, and your inspector\'s clipboard',
      'GCs slow-pay you on demo because you\'re first off the job',
      'Every bid is unique — generic estimating tools fight you',
    ],
    examples: [
      'An offer builder that uses your real cost guide — not a generic template',
      'A compliance tracker for every WCB, asbestos, and hazmat document',
      'Solomon flagging that 60% of your AR is sitting with one slow-paying GC',
    ],
    cta: 'Built for demolition, abatement, and selective-demo contractors',
  },

  landscaping: {
    label:        'landscaping contractors',
    h1Trade:      'landscaping',
    properNoun:   'landscaping',
    icon:         '🌿',
    pain: [
      'Six months of revenue has to carry twelve months of fixed costs',
      'Crews ramp up in March, get cut in October — hiring is a yearly puzzle',
      'Maintenance contracts keep the lights on but design-build pays the rent',
      'Customers Google "landscapers near me" — if you\'re not in the top 3, you\'re invisible',
    ],
    examples: [
      'A cash forecast that knows winter is coming',
      'Hiring scorecards for the seasonal foreman vs. the year-round designer',
      'GBP audit + AI visibility for the spring search spike',
    ],
    cta: 'Built for landscaping, lawn care, and design-build contractors',
  },
}

export default function TradePage() {
  const { trade } = useParams()
  const data = TRADES[trade]

  if (!data) return <Navigate to="/" replace />

  const meta = buildPageMeta({
    title:       `GrowthOS for ${data.label} — AI advisor + business tools for ${data.h1Trade}`,
    description: `AI business advisor and full operating system built for ${data.label}. Cash flow forecasting, hiring planner, Google Business Profile audit, AI search visibility, and a finished document every time. $${PRICE_MONTHLY_USD}/month, ${TRIAL_DAYS}-day free trial.`,
    path:        `/for/${trade}`,
  })

  const canonical = `${SITE_URL}/for/${trade}`

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{meta.title}</title>
        <link rel="canonical" href={canonical} />
        {meta.meta.map((m, i) =>
          m.property
            ? <meta key={i} property={m.property} content={m.content} />
            : <meta key={i} name={m.name} content={m.content} />
        )}
        <script type="application/ld+json">{jsonLd(softwareApplicationSchema())}</script>
        <script type="application/ld+json">{jsonLd(productSchema({
          name:        `GrowthOS for ${data.label}`,
          description: `AI business advisor and operating system for ${data.label}. CFO dashboard, cash flow forecasting, hiring planner, Local & AI Visibility audit.`,
          price:       String(PRICE_MONTHLY_USD),
        }))}</script>
      </Helmet>

      <PublicHeader />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-gray-950 pt-16 pb-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,158,11,0.10) 0%, transparent 70%)',
        }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="text-5xl mb-5">{data.icon}</div>
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
            {data.cta}
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-5">
            The AI advisor and<br />operating system for<br />
            <span className="text-amber-400">{data.label}.</span>
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            Built around how {data.h1Trade} businesses actually run. Cash flow,
            hiring, marketing visibility, compliance — all in one place, all
            connected, all for ${PRICE_MONTHLY_USD}/month.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black transition-colors"
            >
              Start free trial — no card
            </Link>
            <Link
              to="/pricing"
              className="px-8 py-3.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-semibold transition-colors"
            >
              See full pricing
            </Link>
          </div>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-6 py-16">

        {/* ── Pain points ──────────────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="text-3xl font-black text-gray-900 mb-3 text-center">
            Sound familiar?
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-center mb-10">
            The friction points we hear constantly from {data.label}. GrowthOS doesn't
            fix all of them magically — but it gives you a co-pilot to think through them.
          </p>
          <div className="space-y-4">
            {data.pain.map((p, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-900 text-white font-bold text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-gray-700 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── What it looks like ───────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="text-3xl font-black text-gray-900 mb-3 text-center">
            What that looks like in practice
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-center mb-10">
            Real examples of what GrowthOS would do for a {data.label.replace(/s$/, '')} this week.
          </p>
          <div className="space-y-3">
            {data.examples.map((ex, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-amber-600 font-black flex-shrink-0">→</span>
                <p className="text-gray-800 leading-relaxed">{ex}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tools list ───────────────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="text-3xl font-black text-gray-900 mb-3 text-center">
            Everything you get — for ${PRICE_MONTHLY_USD}/month
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-center mb-10">
            One subscription, every tool. No tiers, no upsells, no per-seat fees.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['💡', 'Solomon — AI advisor'],
              ['📈', 'CFO Dashboard'],
              ['📊', 'Cash Flow Forecast'],
              ['📍', 'Local & AI Visibility'],
              ['💰', 'Offer Builder + cost guide'],
              ['🎯', 'Hiring Planner'],
              ['🦺', 'Safety & Compliance'],
              ['🧩', 'Org Chart Planner'],
              ['🗺️', 'Growth Roadmap'],
              ['📋', 'Work Board'],
              ['✅', 'Weekly Check-ins'],
              ['📚', 'Document Library'],
            ].map(([icon, name], i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200">
                <span className="text-xl">{icon}</span>
                <span className="text-sm font-bold text-gray-800">{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <section className="bg-gray-950 rounded-2xl px-8 py-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(245,158,11,0.12) 0%, transparent 70%)',
          }} />
          <div className="relative">
            <h2 className="text-3xl font-black mb-4">{TRIAL_DAYS} days free. No card. No risk.</h2>
            <p className="text-white/60 max-w-md mx-auto mb-8">
              Plug in your numbers, run a tool, see if Solomon actually knows your business.
              If it doesn't change how you run things, walk away.
            </p>
            <Link
              to="/signup"
              className="inline-block px-10 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black transition-colors"
            >
              Start free trial
            </Link>
            <p className="mt-5 text-white/30 text-xs">${PRICE_MONTHLY_USD}/month after trial · Cancel anytime · No contracts</p>
          </div>
        </section>

        {/* ── Other trade pages ───────────────────────────────────────────── */}
        <section className="mt-16 pt-10 border-t border-gray-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Also built for</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TRADES)
              .filter(([slug]) => slug !== trade)
              .map(([slug, t]) => (
                <Link
                  key={slug}
                  to={`/for/${slug}`}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-amber-400 hover:text-amber-600 transition-colors capitalize"
                >
                  {t.icon} {t.label}
                </Link>
              ))}
          </div>
        </section>
      </main>
    </div>
  )
}

// Source of truth for trade slugs — used by seo.js / sitemap.xml so we
// don't duplicate the slug list in two places.
export const TRADE_SLUGS = Object.keys(TRADES)
