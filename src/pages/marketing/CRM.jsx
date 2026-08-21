import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { buildPageMeta, productSchema, jsonLd } from '../../lib/seo'

/**
 * /crm — public landing page for the CRM (the operations system that pairs
 * with GrowthOS). Stub copy + placeholder pricing — fill in real numbers
 * when pricing research is done. Real product name is TBD; using "the CRM"
 * everywhere as a placeholder until naming is resolved.
 *
 * Reachable from:
 *   - <CRMUpsellCard> on every cross-system tool preview
 *   - the Pricing page (eventually — bundle CTA)
 *   - the public Landing page (eventually)
 *
 * SEO posture:
 *   Targets the operations-software keyword space ("CRM for contractors",
 *   "field service CRM", "trades business CRM"). Pairs with the broader
 *   Landing page coverage so we capture both top-of-funnel ("AI advisor")
 *   and bottom-of-funnel ("CRM software") searches.
 *
 *   Framing note: the page used to be pitched specifically at demolition
 *   and abatement (it's where the wedge started). We broadened the public
 *   copy because GrowthOS's CRM works for any specialty-trade or
 *   home-services contractor — pipeline, projects, AR, forecast, labour
 *   rates aren't demo-specific. Demo / abatement remain supported and
 *   keep their dedicated /for/demolition landing page; they're just no
 *   longer the only voice on the main CRM pitch.
 */

const CRM_META = buildPageMeta({
  title:       'CRM for contractors — the operations system that pairs with GrowthOS',
  description: 'Quote-to-cash CRM for specialty-trade and home-services contractors. Pipeline, projects, accounts receivable, revenue forecast, and labour rates — in one place, built around how the work actually moves. Pairs with GrowthOS for AI-powered diagnostics.',
  path:        '/crm',
})

export default function CRM() {
  return (
    <div className="min-h-screen bg-ink-50">
      <Helmet>
        <title>{CRM_META.title}</title>
        <link rel="canonical" href={CRM_META.canonical} />
        {CRM_META.meta.map((m, i) => {
          if (m.property) return <meta key={i} property={m.property} content={m.content} />
          return <meta key={i} name={m.name} content={m.content} />
        })}
        <script type="application/ld+json">{jsonLd(productSchema({
          name:        'GrowthOS CRM — operations system for specialty-trade contractors',
          description: 'Quote-to-cash CRM for specialty-trade and home-services contractors. Pipeline, projects, accounts receivable, revenue forecast, and labour rates — in one place, built around how the work actually moves.',
          price:       '699',
        }))}</script>
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <header className="text-center space-y-4 max-w-3xl mx-auto pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            The operations system · pairs with GrowthOS
          </p>
          <h1 className="text-4xl font-bold text-ink-900 leading-tight">
            The CRM your trades&nbsp;business actually uses every day.
          </h1>
          <p className="text-base text-ink-600 leading-relaxed max-w-2xl mx-auto">
            Quote-to-cash for specialty-trade and home-services contractors.
            Pipeline, projects, accounts receivable, revenue forecast, labour
            rates — in one place, built around how the work actually moves.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <a
              href="mailto:hello@example.com?subject=Interested%20in%20the%20CRM"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-5 py-2.5 rounded-lg transition-colors"
            >
              Get a demo →
            </a>
            <Link
              to="/tools"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-white border border-ink-200 hover:border-ink-300 px-5 py-2.5 rounded-lg transition-colors"
            >
              See it paired with GrowthOS
            </Link>
          </div>
        </header>

        {/* What's in it */}
        <section className="bg-white border border-ink-100 rounded-2xl p-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-5">
            What's in it
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="flex gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden>{f.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-ink-600 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why pair with GrowthOS */}
        <section className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-2xl p-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-3">
            Why pair it with GrowthOS
          </h2>
          <h3 className="text-2xl font-bold text-ink-900 leading-tight mb-3 max-w-2xl">
            The CRM runs the work. GrowthOS thinks about it.
          </h3>
          <p className="text-sm text-ink-700 leading-relaxed mb-5 max-w-2xl">
            On its own the CRM tracks status. Paired with GrowthOS, the same
            data drives diagnostic tools that you can't get from either
            product alone:
          </p>
          <ul className="space-y-2 max-w-2xl">
            {PAIRED_INSIGHTS.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink-800">
                <span className="text-brand-600 flex-shrink-0">→</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pricing — placeholder */}
        <section className="bg-white border border-ink-100 rounded-2xl p-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-5">
            Pricing
          </h2>
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-6 text-sm text-brand-900">
            <strong>Pricing TBD.</strong> Numbers below are placeholders —
            replace with real tier pricing once the market study lands.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TIERS.map(tier => (
              <div
                key={tier.name}
                className={`rounded-xl p-5 border ${
                  tier.featured
                    ? 'bg-ink-900 text-white border-ink-900'
                    : 'bg-white text-ink-900 border-ink-200'
                }`}
              >
                {tier.featured && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-300 mb-2">
                    Best value
                  </p>
                )}
                <h3 className="text-lg font-bold mb-1">{tier.name}</h3>
                <p className={`text-xs leading-relaxed mb-3 ${tier.featured ? 'text-ink-300' : 'text-ink-600'}`}>
                  {tier.tagline}
                </p>
                <div className="text-2xl font-bold mb-1">{tier.price}</div>
                <p className={`text-[11px] mb-4 ${tier.featured ? 'text-ink-400' : 'text-ink-500'}`}>
                  {tier.unit}
                </p>
                <ul className={`space-y-1.5 text-xs ${tier.featured ? 'text-ink-200' : 'text-ink-700'}`}>
                  {tier.includes.map((line, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className={tier.featured ? 'text-brand-300' : 'text-brand-600'}>✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <footer className="text-center pt-4 pb-12">
          <p className="text-sm text-ink-600 mb-3">
            Want a walkthrough on your live numbers?
          </p>
          <a
            href="mailto:hello@example.com?subject=CRM%20demo%20request"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-5 py-2.5 rounded-lg transition-colors"
          >
            Book a 20-minute demo →
          </a>
        </footer>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon:  '📋',
    title: 'Quote master',
    body:  'Pipeline by stage, win rate, scope tags for your service categories, size or unit bands. See what\'s in flight and what\'s probable.',
  },
  {
    icon:  '🗂️',
    title: 'Project tracker',
    body:  'Planning → Active → On Hold → Complete → Closed-Out. PM assignment, contract value, schedule.',
  },
  {
    icon:  '💵',
    title: 'Accounts receivable',
    body:  'Contract → billed → paid. Holdback tracking, overdue flags, recent invoices, payment history by client.',
  },
  {
    icon:  '📈',
    title: 'Revenue forecast',
    body:  '12-month rolling allocation. Awarded + probable, FTE load, contribution to overhead, breakeven.',
  },
  {
    icon:  '👷',
    title: 'Labour rates & burden',
    body:  'Default burden rate, LOA tiers, starred roles per scope. Auto-fills new line items so quotes are consistent.',
  },
  {
    icon:  '⚙️',
    title: 'Templates & exclusions',
    body:  'Reusable scope blocks, exclusions, client-provides clauses. Speed up quoting without losing precision.',
  },
]

const PAIRED_INSIGHTS = [
  'Pipeline-to-Hire — when to start interviewing based on backlog conversion + ramp time',
  'Estimator Scorecard — bid accuracy and where each estimator is sharpest',
  'Foreman Scorecard — labour variance and on-time delivery across recent jobs',
  'Job Autopsy — line-by-line diff between quoted and actual, with one lesson for the next bid',
  'Hiring, Cash Flow, and CFO tools get sharper too — they read pipeline, AR, and labour data automatically',
]

const TIERS = [
  {
    name:     'CRM only',
    tagline:  'The operations system on its own.',
    price:    '$XXX',
    unit:     '/ month · placeholder',
    featured: false,
    includes: [
      'Quote master + Project tracker',
      'Accounts receivable + Revenue forecast',
      'Labour rates + templates',
      'Up to N users (TBD)',
    ],
  },
  {
    name:     'CRM + GrowthOS',
    tagline:  'Operations + the AI advisor on top. The cross-system tools light up.',
    price:    '$XXX',
    unit:     '/ month · placeholder',
    featured: true,
    includes: [
      'Everything in CRM only',
      'GrowthOS advisor + every tool',
      'Pipeline-to-Hire, Estimator/Foreman scorecards, Job Autopsy',
      'Discount vs buying separately',
    ],
  },
  {
    name:     'GrowthOS only',
    tagline:  'The advisor without the operations system.',
    price:    '$XXX',
    unit:     '/ month · placeholder',
    featured: false,
    includes: [
      'Every standalone GrowthOS tool',
      'QuickBooks + manual upload as data source',
      'Cross-system tools shown as previews until CRM is connected',
    ],
  },
]
