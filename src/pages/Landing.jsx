import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PublicHeader from '../components/layout/PublicHeader'

/**
 * / — public marketing landing page.
 *
 * Structured to convert service-business owners:
 *   Hero → Problem → Solomon showcase → Tools → How it works → Price anchor → CTA
 */

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
    icon: '💰',
    name: 'Offer Builder',
    outcome: 'Scope your services and price them properly. Stop leaving money on the table with vague quotes.',
  },
  {
    icon: '🎯',
    name: 'Hiring Planner',
    outcome: 'Tell us the role. Get a scorecard, interview questions, and a 30-day ramp plan. Stop hiring on gut feel.',
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
    title: 'Answer a few questions',
    body: 'Tell us about your business once. Your goals, your team, your numbers. Takes 10 minutes and unlocks everything.',
  },
  {
    n: '02',
    title: 'Your advisor gets to work',
    body: 'Solomon reads your context every day. Opens each morning with what actually matters — not a generic check-in.',
  },
  {
    n: '03',
    title: 'Run the tools, get the documents',
    body: 'Pick a tool, answer a few questions, get a finished document you can act on. No templates. No dashboards to interpret.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      <HeroSection />
      <ProblemSection />
      <SolomonSection />
      <ToolsSection />
      <HowItWorksSection />
      <PriceSection />
      <ClosingCTA />
      <PageFooter />
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
        <div className="inline-flex items-center gap-2 bg-white/8 border border-white/10 text-amber-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          7-day free trial — no credit card required
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08] mb-6">
          Your whole business.<br />
          <span className="text-amber-400">Finally in one place.</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-6">
          Solomon, your AI advisor, knows your goals, your numbers, and your team.
          Backed by tools for your finances, local SEO, cash flow, hiring, compliance,
          team management, and growth planning — all connected, all AI-powered.
        </p>

        {/* Feature pill row */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-2xl mx-auto">
          {['AI Advisor','CFO Dashboard','Cash Flow','Local & AI Visibility','Hiring Planner','Safety & Compliance','Offer Builder','Org Chart','Growth Roadmap','Work Board'].map(f => (
            <span key={f} className="text-xs font-medium px-3 py-1 rounded-full bg-white/8 border border-white/10 text-white/50">
              {f}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-base transition-colors shadow-lg"
          >
            Start your free trial
          </Link>
          <Link
            to="/pricing"
            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-semibold text-base transition-colors"
          >
            See pricing →
          </Link>
        </div>

        <p className="text-white/30 text-sm">
          No credit card · 7 days free · Cancel anytime · $97/month after trial
        </p>
      </div>
    </section>
  )
}

// ── Problem ───────────────────────────────────────────────────────────────────

function ProblemSection() {
  const pains = [
    'Making big decisions based on gut feel and last month\'s bank balance',
    'Paying a bookkeeper for reports you barely have time to read',
    'Googling "how to hire a foreman" at 11pm on a Tuesday',
    'Knowing you need to grow your Google reviews — but never doing it',
    'Running your business from five apps that don\'t talk to each other',
  ]

  return (
    <section className="bg-gray-50 border-b border-gray-200 py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Sound familiar?
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Most service-business owners are running great operations with terrible back-office infrastructure. That's the gap GrowthOS closes.
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
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Every area of your business. Covered.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            From your Google ranking to your next hire to your 13-week cash runway —
            each tool asks a few questions and gives you a finished plan you can act on today.
            No templates. No dashboards to stare at.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((tool, i) => (
            <div
              key={i}
              className="group border border-gray-200 rounded-2xl p-5 hover:border-amber-200 hover:bg-amber-50/30 transition-all"
            >
              <div className="text-2xl mb-3">{tool.icon}</div>
              <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-amber-800 transition-colors">
                {tool.name}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{tool.outcome}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
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
            <span className="text-white/40 text-lg">/ month</span>
          </div>
          {annual ? (
            <p className="text-amber-400 font-semibold mb-8">Billed as $970/year — you save $194</p>
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
            Start 7-day free trial
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
          Strategy. Financials. Hiring. Marketing. Operations.<br />One platform. $97 a month.
        </h2>
        <p className="text-gray-950/70 mb-8 max-w-lg mx-auto">
          Try GrowthOS free for 7 days. Connect your books, run your first tool, and ask Solomon anything. If it's not the best $97 you've spent on your business, cancel — no questions, no charge.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-950 text-white font-black text-base hover:bg-gray-800 transition-colors"
          >
            Start free — no credit card
          </Link>
          <a
            href="mailto:dkalawarny@hotmail.com"
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
          <a href="mailto:dkalawarny@hotmail.com" className="hover:text-white/60 transition-colors">Contact</a>
          <Link to="/login" className="hover:text-white/60 transition-colors">Log in</Link>
        </div>
      </div>
    </footer>
  )
}
