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
import { PRICE_MONTHLY_USD, PRICE_ANNUAL_USD, ANNUAL_MONTHLY_EQUIV, PRICE_MONTHLY_CAD_EST, PRICE_ANNUAL_CAD_EST, TRIAL_DAYS, SHOW_PUBLIC_PRICE, PILOT_PRICE_LINE, PILOT_PRICE_BLURB, ANNUAL_SAVINGS_USD } from '../lib/pricing'

/**
 * / — public marketing landing page.
 *
 * Structured to convert service-business owners:
 *   Hero → Problem → Solomon showcase → Tools → Integrations → How it works → Price anchor → CTA
 *
 * SEO posture (see src/lib/seo.js for the canonical config):
 *   - Per-page <Helmet> with rich meta + canonical + og/twitter
 *   - Two JSON-LD schemas: Organization (who we are) + SoftwareApplication
 *     (what category we're in + price). These power Google rich results
 *     and let AI assistants answer "what is Eliv8 OS?" / "how much does
 *     it cost?" without crawling the visible page.
 *   ⚠️ There used to be an sr-only div here listing ~55 trades for crawlers.
 *   It went with the reposition: the buyer is now defined by conviction, not
 *   sector, so that list ranked us for the wrong queries — and hidden text
 *   that exists only for crawlers is a liability on a site whose whole pitch
 *   is that it does not tell you things that are not so.
 */

const LANDING_META = buildPageMeta({
  title:       "Eliv8 OS — an advisor for owners who care how it's run",
  description: `An advisor that reads your actual numbers, remembers what you decided and why, and argues the hard calls both ways. Currently free while in private pilot.`,
  path:        '/',
})

// ── Tool showcase data ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'Work through a decision',
    outcome: 'He argues it more than one way, tells you where the arguments disagree, then says where he lands and what he cannot see.',
  },
  {
    name: 'Read your numbers',
    outcome: 'Connect QuickBooks and get the month in plain English — what changed, what it means, what to do about it.',
  },
  {
    name: 'Forecast your cash',
    outcome: 'The next thirteen weeks. Know before payroll week becomes a problem.',
  },
  {
    name: 'Think through a hire',
    outcome: 'Whether to, what the role really is, and what you are actually looking for in the person.',
  },
  {
    name: 'Price with integrity',
    outcome: 'What the work is genuinely worth. Neither gouging nor underselling yourself out of discomfort.',
  },
  {
    name: 'Write down a repeating job',
    outcome: 'Get what lives in your head onto paper, so the business can run a day without you in it.',
  },
  {
    name: 'Check an obligation',
    outcome: 'Answered from your own documents and the actual regulation, with the source shown. He will not guess at the law.',
  },
  {
    name: 'Plan what you leave behind',
    outcome: 'What would have to be true for someone else to run this, and how far off that is today.',
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
      <ConvictionSection />
      <SolomonSection />
      <ToolsSection />
      <IntegrationsSection />
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
        <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-3 text-center">
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
              title="Eliv8 OS demo"
            />
          </div>
        ) : (
          // Placeholder — keeps the slot in the page flow before a real video lands
          <div className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 aspect-video flex items-center justify-center">
            <div className="text-center px-6">
              <div className="text-5xl mb-3">▶︎</div>
              <p className="font-bold text-gray-700">Video demo coming soon</p>
              <p className="text-sm text-gray-500 mt-1">
                Want to see it before then? <Link to="/signup" className="text-brand-600 hover:underline">Start a free trial</Link>.
              </p>
            </div>
          </div>
        )}
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
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(20,166,123,0.14) 0%, transparent 60%)',
      }} />

      <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/10 text-brand-400 text-xs font-semibold px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            {TRIAL_DAYS}-day free trial — no credit card required
          </div>
        </div>

        {/* ⚠️ A second badge reading "For Christian business owners" used to sit
            beside the trial pill. It is gone, and NOT replaced — see below.

            ⭐ THE DECISION (22 Aug, Daniel): the marketing stays aimed at the
            Christian market, but the product must not push anyone out. A label
            at the top of the page is a door policy: a reader decides whether
            he is in the category before he has understood what the thing does.
            The behaviour is the better signal — "a Jesus mindset" rather than
            an identity noun. Don't exploit an asymmetry of power, tell the
            truth when it costs you, pay people properly. A non-Christian reads
            that as good character. A Christian knows whose it is. Same words,
            both audiences, nobody sorted at the door.

            Nothing replaced it because nothing was left to say. The sub-line
            below already carries the thesis — "believes the way you run this
            matters, not only what it earns" — and the five chips carry the
            capability. A third signal in the same eyeful is clutter.

            ⚠️ THE SEO LAYER IS DELIBERATELY UNCHANGED. Meta titles and
            descriptions still say "Christian business owners", because that is
            what the right person actually types into Google. Keep the search
            terms, change the on-page voice. About and the pilot agreement stay
            fully explicit too — that is where someone curious goes looking, and
            being findable is the point. This is attraction, not concealment. */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08] mb-6">
          You carry this business<br />
          <span className="text-brand-400">on your own.</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-6">
          An advisor who reads your actual numbers, remembers what you told him
          in March, and answers like someone who believes the way you run this
          matters — not only what it earns.
        </p>

        {/* What he does, in the owner's language rather than in feature names. */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-2xl mx-auto">
          {[
            'Reads your books',
            'Remembers your decisions',
            'Argues both sides',
            'Says when he doesn\u2019t know',
            'Never flatters you',
          ].map(f => (
            <span key={f} className="text-xs font-medium px-3 py-1 rounded-full bg-white/8 border border-white/10 text-white/50">
              {f}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-center mb-8">
          <Link
            to="/signup"
            className="px-10 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-gray-950 font-black text-base transition-colors shadow-lg"
          >
            Start free for {TRIAL_DAYS} days
          </Link>
        </div>

        <p className="text-white/30 text-sm">
          No credit card · Free while in private pilot · Cancel anytime
        </p>
      </div>
    </section>
  )
}

// ── Problem ───────────────────────────────────────────────────────────────────

function ProblemSection() {
  const pains = [
    'Making six-figure decisions alone, on last month\'s bank balance and a feeling',
    'Nobody to ask who understands both the numbers and why you run it this way',
    'Advice that treats profit as the only thing worth measuring',
    'Everyone around you needs an answer from you, and you need one from someone',
    'Wondering whether the business is still serving your family or consuming it',
  ]

  return (
    <section className="bg-gray-50 border-b border-gray-200 py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Deciding alone is the expensive part.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Most owners have plenty of people who need answers from them and almost
            nobody to ask. Scripture is not subtle about what that costs.
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

// ── What it's for ─────────────────────────────────────────────────────────────
//
// ⭐ THE ONE SECTION THAT SEPARATES THIS FROM THE NEXT BUSINESS TOOL.
//
// The page was flat, and the reason was specific: every differentiator on it
// was a claim about SOFTWARE — reads your books, remembers your decisions,
// argues both ways — and any AI tool with your books connected can claim four
// of the five. The thing that actually separates Eliv8 OS appeared three times
// and all three were hedged: a subordinate clause in the hero, a promise about
// what Solomon WON'T do, and a footer saying "run a certain way", which is a
// euphemism.
//
// So this section states it, and states it POSITIVELY. It is the product's own
// thesis (ADVISOR_SYSTEM_PROMPT, "WHAT THE BUSINESS IS FOR") in Daniel's words
// — the business is not a funding mechanism for the real thing, it IS the
// thing — pitched at the level of CONDUCT rather than creed.
//
// ⚠️ That last part is load-bearing and deliberate. The Creed principle: the
// marketing is aimed at the Christian market, but the product must never push
// anyone out, and attraction beats persuasion. Conduct is legible to everyone —
// "someone who shares none of your convictions" is the whole principle in one
// clause — so a non-Christian owner reads integrity and can follow it exactly
// as far as he wants, while a Christian owner knows precisely what it is.
// Where it comes from stays FINDABLE (the /about link) and is never asserted.
// Do not add religious vocabulary here. It would cost the truthfulness the
// brand runs on, and it would push out the reader this is written for.
//
// Typographically quiet on purpose: no icon list, no checkmarks, no third
// bulleted grid. The page has three of those already, which is part of why it
// read flat. This is the one place it slows down and says something.
function ConvictionSection() {
  return (
    <section className="bg-white py-24 border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
          What you&rsquo;re building is the thing.<br />
          <span className="text-gray-400">Not the money for the thing.</span>
        </h2>

        <div className="space-y-5 text-[17px] leading-[1.7] text-gray-600">
          <p>
            Most business advice treats the company as a machine for producing a
            number, and everything else &mdash; the wages, the estimates, whether
            the shop is a decent place to work &mdash; as overhead on the way there.
          </p>
          <p>
            Solomon will hold you to your margins as hard as any CFO would. He will
            also notice how the customer who is never going to check the invoice
            gets treated, and whether someone who shares none of your convictions
            still wants to work here in a year.
          </p>
          <p className="text-gray-900 font-medium">
            He won&rsquo;t tell you that running it this way makes it more profitable.
            Nobody can promise that. He&rsquo;ll tell you what it costs, and whether
            you can afford it.
          </p>
        </div>

        <Link
          to="/about"
          className="inline-block mt-8 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          Why it&rsquo;s built this way &rarr;
        </Link>
      </div>
    </section>
  )
}

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
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
              Meet Solomon
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
              Sharp about the business.<br />Clear about what it&rsquo;s for.
            </h2>
            <p className="text-white/60 leading-relaxed mb-6">
              He reads your books, your plan and your last six check-ins, and he
              remembers what you decided in March and why. On anything hard to
              reverse he argues it more than one way, tells you where the arguments
              genuinely disagree, then says where he lands &mdash; and what he can&rsquo;t
              see from where he sits.
            </p>
            {/* The anti-prosperity line used to sit here as a refusal. It now
                lives in ConvictionSection, stated as a promise — "he'll tell you
                what it costs, and whether you can afford it" — which is the same
                move the product's disclaimer rule makes everywhere else: state
                the limit, never apologise for the product. */}
            <ul className="space-y-3">
              {[
                'Reads your finances, roadmap, and team check-ins daily',
                'Proactively flags risks before they become problems',
                'Answers strategy, hiring, pricing, and operations questions',
                'Remembers every conversation — gets smarter over time',
              ].map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="text-brand-400 font-bold mt-0.5 flex-shrink-0">✓</span>
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
                        ? 'linear-gradient(135deg,#0b6b4e,#14a67b)'
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
            Everything he can do, without leaving the conversation.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Ask a few questions. Get a finished plan. Act on it today.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {TOOLS.map((tool, i) => (
            <div key={i} className="px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
              <p className="font-bold text-gray-900 text-sm mb-0.5">{tool.name}</p>
              <p className="text-xs text-gray-500 leading-snug">{tool.outcome}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Integrations ────────────────────────────────────────────────────────
function IntegrationsSection() {
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
              // ⚠️ "Import", not "sync". Drive and OneDrive are a one-time
              // picker: the owner chooses files, they are copied into the
              // Library, and nothing re-checks them afterwards. Settings has
              // always said this correctly; this row and the line below it
              // implied a standing connection. Same shape as /security
              // advertising a self-serve export that did not exist.
              { name: 'Google Drive', logo: '/logos/google-drive.svg', note: 'Import documents' },
              { name: 'OneDrive', logo: '/logos/onedrive.svg', note: 'Import files' },
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
            QuickBooks connects once and stays current. Files you bring from Drive
            or OneDrive are a copy he keeps &mdash; bring a fresh one when it changes.
            Either way every answer is specific to <em>your</em> business, not a
            generic template.
          </p>
        </div>
      </section>

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
          {SHOW_PUBLIC_PRICE
            ? `$${PRICE_MONTHLY_USD} a month. One tier, everything in it.`
            : 'Free while we are in private pilot.'}
        </h2>
        <p className="text-gray-500 mb-10 max-w-lg mx-auto">
          A coach or a mastermind runs $500 to $2,500 a month, and most of them
          will tell you what you want to hear.{' '}
          {SHOW_PUBLIC_PRICE
            ? 'This is a fraction of that, and it reads your actual numbers before it says anything.'
            : 'This reads your actual numbers before it says anything — and we are setting the price with the first owners using it, rather than guessing at one now.'}
        </p>

        {/* Toggle — only meaningful when a price is published */}
        {SHOW_PUBLIC_PRICE && (
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
            <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">2 months free</span>
          </button>
        </div>
        )}

        {/* Price card */}
        <div className="bg-gray-950 rounded-2xl p-10 text-white mb-6">
          {SHOW_PUBLIC_PRICE ? (
            <>
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-6xl font-black text-white">
                  {annual ? `$${ANNUAL_MONTHLY_EQUIV}` : `$${PRICE_MONTHLY_USD}`}
                </span>
                <div className="text-left">
                  <p className="text-white/40 text-lg leading-tight">USD / mo</p>
                  <p className="text-white/25 text-xs leading-tight">{annual ? `~$${Math.round(PRICE_ANNUAL_CAD_EST / 12)} CAD` : `~$${PRICE_MONTHLY_CAD_EST} CAD`}</p>
                </div>
              </div>
              {annual ? (
                <p className="text-brand-400 font-semibold mb-8">Billed as ${PRICE_ANNUAL_USD} USD/year — you save ${ANNUAL_SAVINGS_USD}</p>
              ) : (
                <p className="text-white/30 mb-8">Switch to annual and save ${ANNUAL_SAVINGS_USD}/year</p>
              )}
            </>
          ) : (
            <>
              <p className="text-4xl md:text-5xl font-black text-white mb-3">{PILOT_PRICE_LINE}</p>
              <p className="text-white/40 text-sm max-w-md mx-auto mb-8">{PILOT_PRICE_BLURB}</p>
            </>
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
                <span className="text-brand-400 font-bold flex-shrink-0">✓</span>
                {f}
              </div>
            ))}
          </div>

          <Link
            to="/signup"
            className="inline-block px-10 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-gray-950 font-black text-base transition-colors"
          >
            Start {TRIAL_DAYS}-day free trial
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
    <section className="bg-brand-500 py-16">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">
          You don&rsquo;t have to decide the next one alone.
        </h2>
        <p className="text-gray-950/70 mb-8 max-w-lg mx-auto">
          {TRIAL_DAYS} days free, no card. Connect your books, tell him what you&rsquo;re
          weighing, and see whether he tells you anything you didn&rsquo;t already know.
          If he doesn&rsquo;t, leave — and take your data with you.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-950 text-white font-black text-base hover:bg-gray-800 transition-colors"
          >
            Start free
          </Link>
          <a
            href="mailto:support@eliv8os.com"
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
          <span className="font-black text-white">Eliv8<span className="text-brand-400"> OS</span></span>
          {/* "run a certain way" was a euphemism doing the work a tagline
              should do. It said nothing, standing alone in a footer with
              nothing to explain it — unlike /about, where the same phrase is
              immediately unpacked and earns its place. */}
          <span>· An advisor for owners who care how it&rsquo;s run, not only what it returns</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/demo" className="hover:text-white/60 transition-colors">See it work</Link>
          <Link to="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
          <Link to="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
          <Link to="/security" className="hover:text-white/60 transition-colors">Security</Link>
          <a href="mailto:support@eliv8os.com" className="hover:text-white/60 transition-colors">Contact</a>
          <Link to="/login" className="hover:text-white/60 transition-colors">Log in</Link>
        </div>
      </div>
    </footer>
  )
}
