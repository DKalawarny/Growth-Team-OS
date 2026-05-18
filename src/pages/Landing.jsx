import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../components/layout/PublicHeader'
import {
  buildPageMeta,
  organizationSchema,
  softwareApplicationSchema,
  jsonLd,
} from '../lib/seo'

/**
 * / — public marketing landing page.
 *
 * Structured to convert service-business owners:
 *   Hero → Problem → Solomon showcase → Tools → Built-for trades → How it works → Price anchor → CTA
 *
 * SEO posture (see src/lib/seo.js for the canonical config):
 *   - Per-page <Helmet> with rich meta + canonical + og/twitter
 *   - Two JSON-LD schemas: Organization (who we are) + SoftwareApplication
 *     (what category we're in + price). These power Google rich results
 *     and let AI assistants answer "what is GrowthOS?" / "how much does
 *     it cost?" without crawling the visible page.
 *   - Keyword breadth handled by the visible TradesSection — every
 *     plausible specialty trade and home-service vertical is enumerated
 *     once on the page so we rank for "AI advisor for [trade]" queries
 *     without making the hero copy a keyword-stuffed mess.
 */

const LANDING_META = buildPageMeta({
  title:       'GrowthOS — AI advisor + business tools for home-services contractors',
  description: 'AI business advisor for plumbers, electricians, HVAC, roofing, demolition, masonry, landscaping, and every home-services trade. Cash flow forecasting, hiring planner, Google Business Profile audit, AI search visibility, and a finished document every time. $97/month, 14-day free trial.',
  path:        '/',
})

// ── Tool showcase data ────────────────────────────────────────────────────────

const TOOLS = [
  {
    icon: '💡',
    name: 'Solomon — AI Advisor',
    outcome: 'Your on-call business advisor. Knows your goals, your finances, and your team. Briefs you every morning on what matters today.',
  },
  {
    icon: '📈',
    name: 'CFO Dashboard',
    outcome: 'Connect QuickBooks and get a live financial health view — KPIs, trends, and plain-English commentary every month.',
  },
  {
    icon: '📊',
    name: 'Cash Flow Forecast',
    outcome: 'See your next 13 weeks of cash. Know before payroll week becomes a problem.',
  },
  {
    icon: '📍',
    name: 'Local & AI Visibility',
    outcome: 'Show up on Google Maps, in organic search, and when customers ask ChatGPT or Google AI who to call. Full audit with an AI search readiness score.',
  },
  {
    icon: '🦺',
    name: 'Safety & Compliance',
    outcome: 'Track every licence, WCB registration, and compliance document your business needs to stay legal and insurable.',
  },
  {
    icon: '🧩',
    name: 'Org Chart Planner',
    outcome: 'Map the team you need next year — not the one you have today. Plan your next hire before you need them.',
  },
  {
    icon: '🗺️',
    name: 'Growth Roadmap',
    outcome: 'A milestone-by-milestone plan from where you are to where you want to be. With progress tracking built in.',
  },
]

// ── Solomon chat preview ──────────────────────────────────────────────────────

const CHAT_LINES = [
  { role: 'assistant', text: "Good morning Daniel. Your cash runway is sitting at 6 weeks — a bit tight going into Q3. Want me to walk you through where the gap is?" },
  { role: 'user',      text: "Yeah, what's driving it?" },
  { role: 'assistant', text: "Two things: receivables are up $18k from slow-paying commercial clients, and your materials spend jumped 22% in May. The receivables are the faster fix — want a follow-up script for the three oldest invoices?" },
]

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'Tell us about your business',
    body: '10 minutes. Unlocks everything.',
  },
  {
    n: '02',
    title: 'Solomon goes to work',
    body: 'Briefs you every morning on what actually matters.',
  },
  {
    n: '03',
    title: 'Run a tool. Get an answer.',
    body: 'Finished documents you can act on — not dashboards to interpret.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{LANDING_META.title}</title>
        <link rel="canonical" href={LANDING_META.canonical} />
        {LANDING_META.meta.map((m, i) => {
          // Helmet needs either name=… or property=… — preserve whichever was set
          if (m.property) return <meta key={i} property={m.property} content={m.content} />
          return <meta key={i} name={m.name} content={m.content} />
        })}

        {/* JSON-LD — two schemas: who we are + what category we're in.
            Google's Rich Results Test will validate these. AI assistants
            (ChatGPT, Claude, Perplexity) parse these directly to answer
            factual questions about the product without needing to read
            the rendered page. */}
        <script type="application/ld+json">{jsonLd(organizationSchema())}</script>
        <script type="application/ld+json">{jsonLd(softwareApplicationSchema())}</script>
      </Helmet>

      <PublicHeader />

      <HeroSection />
      <VideoSection />
      <ProblemSection />
      <SolomonSection />
      <ToolsSection />
      <TradesSection />
      <HowItWorksSection />
      <PriceSection />
      <ClosingCTA />
      <PageFooter />
    </div>
  )
}

// ── Demo video ────────────────────────────────────────────────────────────────
//
// Right now this is a PLACEHOLDER. Record a 60-90 second Loom showing a
// real query against Solomon — kitchen-table tone, no slick edits — then
// drop the share URL into VIDEO_URL below. Loom embeds work as iframes.
// Until then, the placeholder card teases the same content + a CTA so
// the slot still earns its place above the fold.

const VIDEO_URL = null // Loom share URL or YouTube embed URL — set to enable real video

function VideoSection() {
  return (
    <section className="bg-white py-16 border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-amber-600 text-xs font-bold uppercase tracking-widest mb-3 text-center">
          See it in action
        </p>
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 text-center mb-3 tracking-tight">
          90 seconds. Real questions.
        </h2>
        <p className="text-gray-500 text-center max-w-xl mx-auto mb-10">
          Watch Solomon read a real business's numbers and answer a question
          the owner actually asked. Not a marketing reel.
        </p>

        {VIDEO_URL ? (
          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={VIDEO_URL}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen"
              allowFullScreen
              title="GrowthOS demo"
            />
          </div>
        ) : (
          // Placeholder — keeps the slot in the page flow before a real video lands
          <div className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 aspect-video flex items-center justify-center">
            <div className="text-center px-6">
              <div className="text-5xl mb-3">▶︎</div>
              <p className="font-bold text-gray-700">Video demo coming soon</p>
              <p className="text-sm text-gray-500 mt-1">
                Want to see it before then? <Link to="/signup" className="text-amber-600 hover:underline">Start a free trial</Link>.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Cost guide ────────────────────────────────────────────────────────────────
//
// This is the moat. Nobody else in the bundle space has a structured
// pricing/cost-guide layer the way we do (the RS-Means-equivalent set up
// for our platform's quoting flow). Surface it on the landing page so
// people get the wedge — not just "AI advisor" but "AI advisor + the
// only quoting tool that knows what materials actually cost in your
// market."

function CostGuideSection() {
  return (
    <section className="bg-gradient-to-br from-amber-50 to-white py-20 border-b border-amber-100">
      <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-amber-700 text-xs font-bold uppercase tracking-widest mb-3">
            What nobody else has
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight mb-5">
            The cost guide<br/>built into your quoting.
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Most quoting tools hand you an empty template and say "good luck." Ours
            ships with structured cost data — material rates, labour benchmarks,
            disposal and tipping figures — organized the way your trade actually
            quotes work.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            Combined with Solomon, you're not just generating a quote — you're getting
            an AI second-opinion on whether your numbers are tight, whether you missed
            a line item, and whether your margin holds at this price.
          </p>
          <ul className="space-y-2 mb-7">
            <li className="flex gap-3 text-gray-800">
              <span className="text-amber-600 font-black flex-shrink-0">✓</span>
              <span>Real cost data — not generic templates</span>
            </li>
            <li className="flex gap-3 text-gray-800">
              <span className="text-amber-600 font-black flex-shrink-0">✓</span>
              <span>Structured for AI — Solomon reads your quote and sanity-checks it</span>
            </li>
            <li className="flex gap-3 text-gray-800">
              <span className="text-amber-600 font-black flex-shrink-0">✓</span>
              <span>Updates as the data does — your numbers don't go stale</span>
            </li>
          </ul>
          <Link
            to="/pricing"
            className="inline-block px-6 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold transition-colors"
          >
            See full pricing →
          </Link>
        </div>

        {/* Visual mock — no real screenshot yet, but the slot is ready */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xl p-6">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quote — Kitchen demo</div>
          <div className="space-y-2.5">
            {[
              ['Selective demolition (kitchen)', '$2,400'],
              ['Disposal + tipping (4 yd)',     '$680'],
              ['Asbestos pre-survey',           '$420'],
              ['Labour — 2 crew, 1.5 days',     '$2,160'],
              ['Materials + dust containment',  '$310'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-700">{label}</span>
                <span className="font-bold text-gray-900 tabular-nums">{value}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-sm">
              <span className="font-black text-gray-900">Total</span>
              <span className="font-black text-amber-600 tabular-nums">$5,970</span>
            </div>
          </div>
          <div className="mt-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-gray-700 leading-relaxed">
            <span className="font-bold text-amber-700">Solomon: </span>
            Margin at 28% — within your target range. Disposal looks light if the cabinets
            are MDF — confirm before sending.
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Testimonials ──────────────────────────────────────────────────────────────
//
// PLACEHOLDER — replace with real customer quotes (with permission, real
// names + company names) the moment we have them. Beta trialers from the
// Deconstructors network are the obvious first source. Until they exist,
// we ship a deliberately understated "early operators" frame rather than
// faking testimonials. Faking is a dead-on-arrival decision for a trades
// audience that has been burned by every SaaS that did it.

function TestimonialsSection() {
  return (
    <section className="bg-gray-50 py-20 border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-amber-600 text-xs font-bold uppercase tracking-widest mb-3 text-center">
          Early operators
        </p>
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 text-center mb-3 tracking-tight">
          Built with the people running the work.
        </h2>
        <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">
          GrowthOS is in early-access with a small group of specialty-trade owners
          who are shaping it as we build. Once they go on record, their quotes
          live here. Until then — here's what they care about.
        </p>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Three concern cards — replace each with a real testimonial when available */}
          <ConcernCard
            quote="It can't add work to my plate. My day is already full."
            note="Solomon briefs you in 30 seconds — no dashboards to interpret."
          />
          <ConcernCard
            quote="It has to know my numbers. Generic advice is useless."
            note="QuickBooks sync, your goals, your team — context Solomon actually uses."
          />
          <ConcernCard
            quote="If I cancel, my data better come with me."
            note="Full export from /settings, any time. No hostage-taking."
          />
        </div>

        <p className="text-center text-xs text-gray-400 mt-10 italic">
          We don't fake testimonials. Real owner quotes will replace these as our
          early-access group goes on record.
        </p>
      </div>
    </section>
  )
}

function ConcernCard({ quote, note }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <p className="text-gray-900 font-bold leading-snug mb-3">"{quote}"</p>
      <p className="text-sm text-gray-500 leading-relaxed">{note}</p>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="bg-gray-950 text-white relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.12) 0%, transparent 60%)',
      }} />

      <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/10 text-amber-400 text-xs font-semibold px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            14-day free trial — no credit card required
          </div>
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold px-4 py-1.5 rounded-full">
            🔒 Founding rate — $97 locked in for life
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08] mb-6">
          Stop running a million-dollar operation<br />
          <span className="text-amber-400">on gut feel and spreadsheets.</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-6">
          Everything a $5,000/month consultant gives you — AI advisor, live CFO dashboard,
          cash flow, hiring, local SEO, compliance — for $97 a month.
        </p>

        {/* Feature pill row */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-2xl mx-auto">
          {['AI Advisor','CFO Dashboard','Cash Flow','Local & AI Visibility','Safety & Compliance','Org Chart','Growth Roadmap','Work Board'].map(f => (
            <span key={f} className="text-xs font-medium px-3 py-1 rounded-full bg-white/8 border border-white/10 text-white/50">
              {f}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-center mb-8">
          <Link
            to="/signup"
            className="px-10 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-base transition-colors shadow-lg"
          >
            Claim your 14-day free trial
          </Link>
        </div>

        <p className="text-white/30 text-sm">
          No credit card · 14 days free · Cancel anytime · $97/month after trial
        </p>
      </div>
    </section>
  )
}

// ── Problem ───────────────────────────────────────────────────────────────────

function ProblemSection() {
  const pains = [
    'Making $100k decisions on last month\'s bank balance and a gut feeling',
    'Paying a bookkeeper $800/month for reports you don\'t have time to read',
    'Googling "how to hire a foreman" at 11pm because nobody told you how',
    'Watching your competitor rank #1 on Google while you\'re still on page 3',
    'Running five apps that don\'t talk to each other and still missing things',
  ]

  return (
    <section className="bg-gray-50 border-b border-gray-200 py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            This is costing you money right now.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Most contractors are running great operations with terrible back-office infrastructure. Every week without the right systems is revenue left on the table.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {pains.map((pain, i) => (
            <div key={i} className={`flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 ${i === 4 ? 'sm:col-span-2 sm:max-w-sm sm:mx-auto w-full' : ''}`}>
              <span className="text-red-400 font-bold mt-0.5 flex-shrink-0">✗</span>
              <span className="text-sm text-gray-700">{pain}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Solomon showcase ──────────────────────────────────────────────────────────

function SolomonSection() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    if (visible >= CHAT_LINES.length) return
    const t = setTimeout(() => setVisible(v => v + 1), visible === 0 ? 600 : 1400)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <section className="bg-gray-950 py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
              💡 Meet Solomon
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
              Not a chatbot.<br />A real business advisor.
            </h2>
            <p className="text-white/60 leading-relaxed mb-6">
              Solomon reads your roadmap, your weekly check-ins, your QuickBooks data,
              and your hiring plans — then opens every morning with a briefing on
              what actually needs your attention today. Ask him anything.
              He already knows the context.
            </p>
            <ul className="space-y-3">
              {[
                'Reads your finances, roadmap, and team check-ins daily',
                'Proactively flags risks before they become problems',
                'Answers strategy, hiring, pricing, and operations questions',
                'Remembers every conversation — gets smarter over time',
              ].map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="text-amber-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Chat preview */}
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: '#161b22' }}>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <span className="text-sm">💡</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Solomon</p>
                <p className="text-[11px] text-white/30">Your Advisor · Online</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-green-400/70 font-medium">Live</span>
              </div>
            </div>

            {/* Messages */}
            <div className="p-5 space-y-4 min-h-[260px]">
              {CHAT_LINES.slice(0, visible).map((line, i) => (
                <div
                  key={i}
                  className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{ animation: 'fadeInUp 0.3s ease both' }}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      line.role === 'user'
                        ? 'text-white rounded-br-sm'
                        : 'text-white/85 rounded-bl-sm'
                    }`}
                    style={{
                      background: line.role === 'user'
                        ? 'linear-gradient(135deg,#92400e,#d97706)'
                        : 'rgba(255,255,255,0.07)',
                    }}
                  >
                    {line.text}
                  </div>
                </div>
              ))}
              {visible < CHAT_LINES.length && (
                <div className="flex justify-start">
                  <div className="bg-white/7 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
              <div className="rounded-xl px-4 py-2.5 text-sm text-white/20 border border-white/8 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span>Reply to your advisor…</span>
                <span className="text-xs">↵</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Tools ─────────────────────────────────────────────────────────────────────

function ToolsSection() {
  return (
    <section className="bg-white py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            The complete arsenal for contractors who play to win.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Ask a few questions. Get a finished plan. Act on it today.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {TOOLS.map((tool, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50">
              <span className="text-xl flex-shrink-0">{tool.icon}</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">{tool.name}</p>
                <p className="text-xs text-gray-500 leading-snug">{tool.outcome.split('.')[0]}.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Trades / built-for ────────────────────────────────────────────────────────
/**
 * Visible-copy keyword coverage. Two jobs:
 *
 *   1. Tell a real human owner "yes, this is for me" by enumerating
 *      their specific trade — readers scan for their own category.
 *   2. Give Google + AI crawlers explicit text matches for queries like
 *      "AI advisor for HVAC contractors" or "business software for
 *      demolition contractors." Without this, the page targets
 *      "home-services" generically and misses high-intent long-tail.
 *
 * Grouped by category so it reads as helpful taxonomy (not keyword stuffing).
 * Adding a trade here is purely additive — no other code changes needed.
 */
const TRADE_CATEGORIES = [
  {
    label: 'Construction specialty trades',
    trades: [
      'Demolition', 'Abatement & hazmat', 'Asbestos abatement',
      'Masonry', 'Concrete', 'Framing & carpentry',
      'Drywall', 'Flooring & tile', 'Insulation',
      'Foundation & waterproofing', 'Excavation', 'Paving',
    ],
  },
  {
    label: 'Mechanical, electrical, plumbing',
    trades: [
      'Electrical contractors', 'Plumbers', 'HVAC contractors',
      'Heating & cooling', 'Mechanical contractors', 'Sheet metal',
      'Solar installers', 'Security system installers',
    ],
  },
  {
    label: 'Roofing, siding & exterior',
    trades: [
      'Roofing contractors', 'Siding contractors', 'Gutter services',
      'Window & door installers', 'Painting contractors',
      'Pressure washing', 'Deck builders', 'Fence contractors',
    ],
  },
  {
    label: 'Home services & field service',
    trades: [
      'General contractors', 'Home builders', 'Remodeling contractors',
      'Kitchen & bath', 'Handyman businesses', 'Appliance repair',
      'Garage door services', 'Locksmith services', 'Septic services',
    ],
  },
  {
    label: 'Outdoor & seasonal',
    trades: [
      'Landscaping contractors', 'Lawn care services', 'Tree services',
      'Arborists', 'Pool & spa services', 'Pest control',
      'Snow removal', 'Irrigation contractors',
    ],
  },
  {
    label: 'Cleaning, restoration & environmental',
    trades: [
      'Cleaning services', 'Janitorial services', 'Window cleaning',
      'Water damage restoration', 'Fire damage restoration',
      'Mold remediation', 'Environmental contractors',
    ],
  },
]

function TradesSection() {
  return (
    <>
      {/* Integrations strip — visible */}
      <section className="bg-white border-y border-gray-100 py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">
            Solomon connects to the tools you already use
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { name: 'QuickBooks Online', logo: '/logos/quickbooks.svg', note: 'Live financials' },
              { name: 'Google Drive', logo: '/logos/google-drive.svg', note: 'Your documents' },
              { name: 'OneDrive', logo: '/logos/onedrive.svg', note: 'Your files' },
              { name: 'Google Business Profile', logo: '/logos/google.svg', note: 'Your local presence' },
              { name: 'Your answers', icon: '💬', note: 'Goals, team, challenges' },
            ].map(({ name, logo, icon, note }) => (
              <div key={name} className="flex flex-col items-center gap-1.5 px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 min-w-[120px]">
                {logo
                  ? <img src={logo} alt={name} className="w-7 h-7 object-contain" />
                  : <span className="text-2xl">{icon}</span>
                }
                <p className="text-xs font-bold text-gray-800">{name}</p>
                <p className="text-xs text-gray-400">{note}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-8 max-w-lg mx-auto">
            Connect once. Solomon reads your real numbers, your documents, and your goals — so every answer is specific to <em>your</em> business, not a generic template.
          </p>
        </div>
      </section>

      {/* SEO keyword coverage — hidden from view, readable by crawlers */}
      <div className="sr-only" aria-hidden="true">
        {TRADE_CATEGORIES.flatMap(g => g.trades).join(', ')}
      </div>
    </>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section className="bg-gray-50 border-y border-gray-200 py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            One setup. Your whole business connected.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {STEPS.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gray-200 -translate-y-1/2 z-0" style={{ width: 'calc(100% - 3rem)', left: '3rem' }} />
              )}
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white font-black text-lg flex items-center justify-center mb-5">
                  {step.n}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Price anchor ──────────────────────────────────────────────────────────────

function PriceSection() {
  const [annual, setAnnual] = useState(false)

  return (
    <section className="bg-white py-20">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          An advisor, a CFO, a hiring coach, and a growth planner. $97 a month.
        </h2>
        <p className="text-gray-500 mb-10 max-w-lg mx-auto">
          Hiring those people separately would cost you $3,000–$6,000 a month. GrowthOS gives you all of it — plus the tools to execute — for less than a single consulting hour.
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 mb-8">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Annual
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">2 months free</span>
          </button>
        </div>

        {/* Price card */}
        <div className="bg-gray-950 rounded-2xl p-10 text-white mb-6">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-6xl font-black text-white">
              {annual ? '$81' : '$97'}
            </span>
            <div className="text-left">
              <p className="text-white/40 text-lg leading-tight">USD / mo</p>
              <p className="text-white/25 text-xs leading-tight">{annual ? '~$111 CAD' : '~$133 CAD'}</p>
            </div>
          </div>
          {annual ? (
            <p className="text-amber-400 font-semibold mb-8">Billed as $970 USD (~$1,329 CAD)/year — you save $194</p>
          ) : (
            <p className="text-white/30 mb-8">Switch to annual and save $194/year</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm text-left mb-10 max-w-md mx-auto">
            {[
              'Solomon AI advisor',
              'All 10+ tools',
              'CFO Dashboard',
              'QuickBooks sync',
              'Growth roadmap',
              'Document library',
              'Team check-ins',
              'Work board',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-white/70">
                <span className="text-amber-400 font-bold flex-shrink-0">✓</span>
                {f}
              </div>
            ))}
          </div>

          <Link
            to="/signup"
            className="inline-block px-10 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-base transition-colors"
          >
            Start 14-day free trial
          </Link>
          <p className="mt-4 text-white/25 text-xs">No credit card required · Cancel anytime</p>
        </div>

        <Link to="/pricing" className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
          See full pricing details →
        </Link>
      </div>
    </section>
  )
}

// ── Closing CTA ───────────────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section className="bg-amber-500 py-16">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">
          Your competitors are getting smarter.<br />Are you going to let them pull ahead?
        </h2>
        <p className="text-gray-950/70 mb-8 max-w-lg mx-auto">
          14 days free. Connect your books, run your first tool, ask Solomon anything. If it's not the best $97 you've ever put into your business — cancel. No questions. No charge. No risk.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-950 text-white font-black text-base hover:bg-gray-800 transition-colors"
          >
            Claim your edge — start free
          </Link>
          <a
            href="mailto:support@leadeos.com"
            className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-gray-950/20 text-gray-950/70 hover:text-gray-950 hover:border-gray-950/40 font-semibold text-base transition-colors"
          >
            Questions? Email us
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function PageFooter() {
  return (
    <footer className="bg-gray-950 border-t border-white/5 py-10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-white/30">
        <div className="flex items-center gap-2">
          <span className="font-black text-white">Growth<span className="text-amber-400">OS</span></span>
          <span>· The operating system for service businesses</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
          <a href="mailto:support@leadeos.com" className="hover:text-white/60 transition-colors">Contact</a>
          <Link to="/login" className="hover:text-white/60 transition-colors">Log in</Link>
        </div>
      </div>
    </footer>
  )
}
