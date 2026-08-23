import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../../components/layout/PublicHeader'
import { buildPageMeta, jsonLd, productSchema, SITE_URL } from '../../lib/seo'
import { PRICE_MONTHLY_USD, TRIAL_DAYS, SHOW_PUBLIC_PRICE } from '../../lib/pricing'

/**
 * /vs/:competitor — head-to-head comparison page.
 *
 * Why this page exists:
 *   - "[competitor] alternative" and "[competitor] vs X" are the highest-
 *     intent SEO keywords in B2B SaaS. People searching them are weeks
 *     from a buying decision, not months.
 *   - Nobody else is writing fair comparison pages in this space — most
 *     are agency-written hatchet jobs that buyers see right through.
 *     Honest comparisons rank fast and convert hard.
 *
 * Editorial rule: be ACCURATE about competitors. They're real companies
 * with real customers. Trashing them makes us look small. Acknowledge
 * what they do well, then explain who GrowthOS is actually for. If the
 * reader is a better fit for the competitor, they should be able to
 * tell from this page — that's a feature, not a bug. Ranking + qualifying
 * beats ranking + bouncing.
 *
 * Adding a new competitor:
 *   1. Add an entry to COMPETITORS keyed by URL slug
 *   2. Done — sitemap.xml entry, meta, schema all auto-generated
 */

const COMPETITORS = {
  knowify: {
    name:    'Knowify',
    tagline: 'Construction job-costing software',
    url:     'https://www.knowify.com',
    summary: 'Knowify is a job-costing and project management tool aimed at construction subcontractors. It does estimating, scheduling, time tracking, and integrates tightly with QuickBooks. Strong at the operational layer — weak on advisory and growth.',
    bestFor: 'Subcontractors who want detailed job-costing and tight QuickBooks sync — and don\'t need a strategic advisor.',
    pricing: 'From around $186/month for a 5-user team. Add-ons drive the price up quickly.',
    strengths: [
      'Deep job-costing and labour tracking',
      'Tight, real-time QuickBooks sync',
      'Built specifically for construction trades',
      'Scheduling and field-team workflows',
    ],
    weaknesses: [
      'No AI advisor or strategic guidance — pure operations',
      'No memory of your decisions or your reasoning',
      'No hiring scorecards or org planning',
      'Steeper price for small teams',
    ],
    growthOSWins: [
      'Solomon (AI advisor) — pulls your numbers and tells you what to do, not just what happened',
      'Hiring, org planning and succession — Knowify is operations-only',
      'Remembers your decisions and constraints across months, not just this session',
      SHOW_PUBLIC_PRICE ? `$${PRICE_MONTHLY_USD}/month flat — no per-seat math, no add-ons` : 'One flat price when we launch — no per-seat math, no add-ons',
    ],
    competitorWins: [
      'Deeper job-costing detail if you live in the field every day',
      'More mature scheduling and time-tracking workflows',
    ],
    pickThem: 'You\'re a 10-50 person construction sub, your bottleneck is real-time job-costing accuracy, and you don\'t need strategic advice from your software.',
    pickUs: 'You are an owner-operator who needs actual counsel — something that understands your numbers and tells you what to do about them, and that cares how the business is run and not only what it earns.',
  },

  jobber: {
    name:    'Jobber',
    tagline: 'Field-service CRM and scheduling',
    url:     'https://www.getjobber.com',
    summary: 'Jobber is the dominant field-service CRM for home-services. It does quoting, scheduling, dispatching, invoicing, and customer communications. Famously good at what it does — and explicitly not an advisor or growth tool.',
    bestFor: 'Field-service businesses (lawn care, plumbing, cleaning, etc.) where the bottleneck is dispatching crews and getting paid.',
    pricing: 'From $39/month (limited) up to $349/month for full features. Per-user pricing on higher tiers.',
    strengths: [
      'Best-in-class scheduling and dispatching',
      'Strong customer communications (texts, emails, payments)',
      'Mobile app crews actually use',
      'Big ecosystem of integrations',
    ],
    weaknesses: [
      'No AI advisor or strategic layer',
      'No CFO dashboard or cash flow forecasting',
      'No hiring or org-planning tools',
      'No memory of what you decided, or why',
      'Higher tiers get pricey fast',
    ],
    growthOSWins: [
      'AI advisor that knows your business — Jobber has no equivalent',
      'CFO dashboard, cash flow forecasting, hiring planner — strategic tools Jobber doesn\'t build',
      'Succession planning and written playbooks',
      SHOW_PUBLIC_PRICE ? `Flat $${PRICE_MONTHLY_USD}/month for everything` : 'One flat price for everything — no tiers, no per-seat',
    ],
    competitorWins: [
      'Mature scheduling, dispatching, and customer-facing workflows',
      'Field-team mobile app',
      'Larger integration library',
    ],
    pickThem: 'Your bottleneck is dispatching, scheduling, and getting invoices paid. You have field crews running multiple jobs a day and need real-time coordination.',
    pickUs: 'You already have ops handled, or your ops are simpler than Jobber needs to manage. What you actually need is counsel — cash flow, hiring, the hard decisions, what happens to this business after you. The advisor, and the tools to act on the advice.',
  },

  'housecall-pro': {
    name:    'Housecall Pro',
    tagline: 'All-in-one home-services platform',
    url:     'https://www.housecallpro.com',
    summary: 'Housecall Pro is a field-service platform aimed at residential home-services trades — plumbing, HVAC, electrical, cleaning. Strong on scheduling, payments, and customer experience. Light on strategic and advisory tools.',
    bestFor: 'Residential home-services contractors with active dispatching needs and a customer-experience focus.',
    pricing: 'From $79/month (limited) up to $279/month per office. Add-ons stack quickly.',
    strengths: [
      'Polished customer-facing experience (booking, texts, reviews)',
      'Strong payments and invoicing',
      'Mobile-first scheduling',
      'Established marketplace and integrations',
    ],
    weaknesses: [
      'No AI advisor',
      'No CFO dashboard or cash flow forecasting',
      'No hiring scorecards',
      'No memory of your decisions across months',
      'Per-user fees and add-ons inflate the real price',
    ],
    growthOSWins: [
      'Solomon — strategic advisor knowing your numbers and goals',
      'Cash flow forecasting and CFO dashboard',
      'Hiring, org chart, roadmap and succession planning',
      'Flat pricing — no per-user inflation',
    ],
    competitorWins: [
      'Better customer-facing booking + reviews + payment workflows',
      'More mature mobile app for crews',
    ],
    pickThem: 'You run a high-volume residential service business, your customer experience IS your moat, and dispatching/payments are your daily friction.',
    pickUs: 'You have customer experience handled. Your real friction is the deciding — what to do next, when to hire, where the cash is actually going, and whether the business is still serving your family or consuming it.',
  },

  buildertrend: {
    name:    'Buildertrend',
    tagline: 'Construction project management',
    url:     'https://buildertrend.com',
    summary: 'Buildertrend is a heavy-duty construction project management platform aimed at homebuilders, remodelers, and larger commercial subs. Deep features, deeper price tag. Built for companies with project managers, not for owner-operators.',
    bestFor: 'Homebuilders and remodelers managing 10+ active projects with dedicated project managers and admin staff.',
    pricing: 'From around $399/month, scaling to $1,099+/month. Often quoted custom.',
    strengths: [
      'Deepest project management feature set in the construction space',
      'Document management, scheduling, change orders, daily logs',
      'Client portals and detailed financials per project',
      'Strong in larger, project-heavy GC and remodeler workflows',
    ],
    weaknesses: [
      'Significant cost — out of reach for most sub-$5M contractors',
      'Steep learning curve',
      'No AI advisor — features-driven, not advisory',
      'Sized for project managers, not owner-operators',
      'No advisory layer, and no memory of your decisions',
    ],
    growthOSWins: [
      'Built for owner-operators, not project managers',
      'AI advisor that thinks about strategy, not just project tracking',
      'Far cheaper than the bookkeeper or fractional CFO it stands beside ($400–1,100/month)',
      'No 2-week onboarding required',
      'Hiring, decisions, playbooks and succession built in',
    ],
    competitorWins: [
      'Materially deeper project management features for larger builders',
      'Better fit for companies with dedicated project managers',
      'Mature commercial-construction workflows',
    ],
    pickThem: 'You\'re a homebuilder or remodeler running 10+ active projects with dedicated PM staff. You need every project management feature in the catalog and the budget supports it.',
    pickUs: 'You are an owner-operator, not a project manager. You do not need a catalogue of project-management features — you need counsel that understands your size and the way you want this run.'
  },
}

export default function Comparison() {
  const { competitor } = useParams()
  const data = COMPETITORS[competitor]

  // Slug we don't recognize → bounce to pricing rather than 404 to keep
  // SEO authority on the user. Could later become a "compare GrowthOS to ___"
  // request page.
  if (!data) return <Navigate to="/pricing" replace />

  const meta = buildPageMeta({
    title:       `GrowthOS vs ${data.name} — an honest comparison`,
    description: `Comparing GrowthOS and ${data.name} for owner-operated businesses. ${data.summary.slice(0, 100)}... See which one actually fits — including when the answer is ${data.name}.`,
    path:        `/vs/${competitor}`,
  })

  const canonical = `${SITE_URL}/vs/${competitor}`

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
        <script type="application/ld+json">{jsonLd(productSchema({
          name:        `GrowthOS — alternative to ${data.name}`,
          description: `An AI business advisor for owners who want counsel, not another operations tool. Considered alongside ${data.name} by owner-operators who already have scheduling and invoicing handled.`,
        }))}</script>
      </Helmet>

      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="text-center mb-16">
          <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-4">Honest Comparison</p>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-5">
            GrowthOS vs {data.name}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Both are good tools. They do different things. Here's a fair side-by-side
            so you can pick the right one — even if that's not us.
          </p>
        </section>

        {/* ── Summary table ──────────────────────────────────────────────── */}
        <section className="mb-16 overflow-hidden rounded-2xl border border-gray-200">
          <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-500">
            <div className="p-4">Dimension</div>
            <div className="p-4 border-l border-gray-200 text-brand-600">GrowthOS</div>
            <div className="p-4 border-l border-gray-200">{data.name}</div>
          </div>
          <Row label="What it is" growth="AI advisor + business OS for owner-operators" them={data.tagline} />
          <Row label="Best for" growth="Specialty-trade owners, $500k–$15M revenue, 3–50 people" them={data.bestFor} />
          <Row label="Pricing" growth={SHOW_PUBLIC_PRICE ? `$${PRICE_MONTHLY_USD}/month flat, all features, all users` : 'Free while in private pilot; one flat price at launch'} them={data.pricing} />
          <Row label="AI advisor" growth="Yes — Solomon, with long-term memory" them="No" />
          <Row label="CFO dashboard + cash flow forecast" growth="Yes" them={
            data.name === 'Knowify' ? 'Partial (job-costing only)' : 'No'
          } />
          <Row label="Hiring planner / scorecards" growth="Yes" them="No" />
          <Row label="Remembers your decisions" growth="Yes" them="No" />
          {/* ⚠️ This said "pair with our CRM", pointing prospects at a product
              that does not exist and is not being built. Keep the answer
              honest and complete: we don't do dispatching, on purpose, and the
              tool you already use is the answer — not a promise from us. */}
          <Row label="Field crew dispatching" growth="No — on purpose. Keep the tool you already use for that." them={
            data.name === 'Knowify' || data.name === 'Buildertrend' ? 'Limited' : 'Yes — strong'
          } last />
        </section>

        {/* ── What they do well ──────────────────────────────────────────── */}
        <section className="grid md:grid-cols-2 gap-6 mb-16">
          <ColumnCard tone="green" title={`What ${data.name} does well`} items={data.strengths} />
          <ColumnCard tone="red"   title={`Where ${data.name} falls short`} items={data.weaknesses} />
        </section>

        {/* ── Where each one wins ─────────────────────────────────────────── */}
        <section className="grid md:grid-cols-2 gap-6 mb-16">
          <ColumnCard tone="amber" title="Where GrowthOS wins" items={data.growthOSWins} />
          <ColumnCard tone="gray"  title={`Where ${data.name} wins`}  items={data.competitorWins} />
        </section>

        {/* ── Decision frame ─────────────────────────────────────────────── */}
        <section className="mb-16 grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-7">
            <h3 className="font-black text-gray-900 text-lg mb-3">Pick {data.name} if…</h3>
            <p className="text-gray-700 leading-relaxed">{data.pickThem}</p>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Visit {data.name} →
            </a>
          </div>
          <div className="bg-gray-950 border border-brand-500/30 rounded-2xl p-7 text-white">
            <h3 className="font-black text-brand-400 text-lg mb-3">Pick GrowthOS if…</h3>
            <p className="text-white/80 leading-relaxed">{data.pickUs}</p>
            <Link
              to="/signup"
              className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-gray-950 text-sm font-bold transition-colors"
            >
              Start a {TRIAL_DAYS}-day free trial →
            </Link>
          </div>
        </section>

        {/* ── Other comparisons ─────────────────────────────────────────── */}
        <section className="border-t border-gray-200 pt-10">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Other comparisons</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(COMPETITORS)
              .filter(([slug]) => slug !== competitor)
              .map(([slug, info]) => (
                <Link
                  key={slug}
                  to={`/vs/${slug}`}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-brand-400 hover:text-brand-600 transition-colors"
                >
                  GrowthOS vs {info.name}
                </Link>
              ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function Row({ label, growth, them, last }) {
  return (
    <div className={`grid grid-cols-3 text-sm ${last ? '' : 'border-b border-gray-100'}`}>
      <div className="p-4 font-medium text-gray-700">{label}</div>
      <div className="p-4 border-l border-gray-100 text-gray-700 bg-brand-50/30">{growth}</div>
      <div className="p-4 border-l border-gray-100 text-gray-700">{them}</div>
    </div>
  )
}

function ColumnCard({ tone, title, items }) {
  const tones = {
    green: 'border-green-200 bg-green-50',
    red:   'border-red-200 bg-red-50',
    amber: 'border-brand-200 bg-brand-50',
    gray:  'border-gray-200 bg-gray-50',
  }
  const dots = {
    green: 'bg-green-500',
    red:   'bg-red-400',
    amber: 'bg-brand-500',
    gray:  'bg-gray-400',
  }
  return (
    <div className={`border rounded-2xl p-6 ${tones[tone]}`}>
      <h3 className="font-black text-gray-900 mb-4">{title}</h3>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm text-gray-700">
            <span className={`w-1.5 h-1.5 rounded-full ${dots[tone]} mt-2 flex-shrink-0`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Export the slug list so seo.js / sitemap.xml can reference it without
// duplicating data. (Not strictly used yet, but if we ever generate the
// sitemap dynamically, this is where the source lives.)
export const COMPETITOR_SLUGS = Object.keys(COMPETITORS)
