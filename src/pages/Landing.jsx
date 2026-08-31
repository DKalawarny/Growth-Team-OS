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
import Wordmark from '../components/brand/Wordmark'

/**
 * / — public marketing landing page.
 *
 * Structured to convert service-business owners:
 *   Hero → Solomon showcase → What he knows → Conviction → Price → CTA
 *   ⭐ Conviction sits AFTER Solomon on purpose — see the note at <HeroSection/>.
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
    outcome: 'Argues it more than one way, shows you where the arguments disagree, then says which way it leans \u2014 and what it cannot see.',
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
    outcome: 'Answered from your own documents and the actual regulation, with the source shown. Never guesses at the law.',
  },
  {
    name: 'Plan what you leave behind',
    outcome: 'What would have to be true for someone else to run this, and how far off that is today.',
  },
]

// ── Solomon chat preview ──────────────────────────────────────────────────────

/**
 * ⭐ REWRITTEN 29 Aug. The old preview was written before two things changed,
 * and Daniel spotted that it no longer showed what the product does:
 *
 *   1. 24 Aug — Solomon RUNS THE TOOLS HIMSELF. He used to only be able to
 *      seed one. Now he produces the real artifact mid-conversation and it
 *      lands in the Library. The old script had him offering to write a script.
 *   2. 26 Aug — his VOICE was rewritten. Prose, not bulleted findings. Direct
 *      about the situation, never directive about the person. Says what he
 *      cannot see instead of filling the gap.
 *
 * ⚠️ Each line here is doing a specific job, so do not trim it for length:
 *   - real figures from connected books, not vibes
 *   - HE REMEMBERS WHAT THE OWNER SAID MONTHS AGO. This is the single hardest
 *     thing to copy and the clearest proof of the positioning — the standard
 *     being applied is the owner's own, not one imposed on him.
 *   - names the input he does NOT have, rather than inventing it
 *   - produces a document, which is the 24 Aug capability made visible
 *
 * ⚠️ The memory line is also how the conviction shows up WITHOUT preaching:
 * "you still knew everyone's name" is about how the business is run, and it is
 * quoted back as the owner's own words. Never put a value in Solomon's mouth
 * that the owner did not say first.
 */
const CHAT_LINES = [
  { role: 'user',      text: "Can I afford a second crew lead?" },
  { role: 'assistant', text: "On the numbers, probably. Margin has held near 11% for three months and there is about $47k of cushion. Worth weighing against something you told me in March \u2014 that you did not want to grow past the point where you still knew everyone's name. A second lead means a second crew, so eleven people becomes closer to twenty. That is your line, not one I would pick for you." },
  { role: 'user',      text: "Show me what it costs." },
  { role: 'assistant', text: "Thirteen weeks, with the hire starting week three. Week nine is the tight one at $6,200 \u2014 it holds unless the Coleman invoice slips again. Your June payroll is not in yet, so that cushion is a May figure.",
    artifact: 'Cash flow forecast \u00b7 saved to your Library' },
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

      {/* ⭐ ORDER IS AN ARGUMENT (29 Aug). It used to run Hero → Video →
          Problem → Conviction → Solomon → Tools → Integrations → HowItWorks →
          Price. Three things were wrong with that:

          1. 🔴 <VideoSection /> rendered "Video demo coming soon" — a
             placeholder occupying the most valuable slot on the page, directly
             under the hero, where proof belongs. An empty shelf reads worse
             than no shelf. Deleted, not hidden; put it back when a video
             actually exists.
          2. ⭐ CONVICTION CAME BEFORE SOLOMON, i.e. the page asked a stranger to
             care how Daniel believes a business should be run before it had
             shown the thing doing anything useful. That is persuasion, and it
             is the opposite of this product's own stated principle —
             attraction, findable, never asserted. Competence first; let the
             conviction be discovered by someone who already wants it.
          3. Tools + Integrations + HowItWorks are three sections answering one
             question ("what does it actually do"), which is why the page felt
             long without saying more.

          ⚠️ ProblemSection is deliberately gone too: the hero states the
          problem, and restating it for 67 lines is the page not trusting its
          own headline. */}
      <HeroSection />
      <SolomonSection />
      <WhatHeKnowsSection />
      <ConvictionSection />
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
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(20,166,123,0.14) 0%, transparent 60%)',
      }} />

      <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/10 text-brand-400 text-xs font-semibold px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            {/* ⚠️ ONE OFFER AT A TIME. This badge said "14-day free trial" while
                the line under the CTA said "Free while in private pilot" — two
                different offers, 60px apart. A trial only means something once
                there is a price to trial against, and SHOW_PUBLIC_PRICE is
                false, so during the pilot the honest word is simply "free".
                Both now derive from the same flag; do not hardcode either. */}
            {SHOW_PUBLIC_PRICE
              ? `${TRIAL_DAYS}-day free trial — no credit card required`
              : `${PILOT_PRICE_LINE} — no credit card required`}
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
        {/* ⏸️ PLACEHOLDER HEADLINE — Daniel has not signed off on this (29 Aug).
            He rejected three rounds of options and asked for something in place
            so the rest of the page could move. Treat it as a slot, not a
            decision.

            ⭐ WHY THE OLD ONE WENT. "You carry this business on your own" is a
            feeling, not a claim — and empathy hooks only work while a category
            is still new. "AI business advisor" is not new, so the page spent its
            best real estate on something the reader had seen, and left the
            differentiation buried in a 40-word sub-line.

            ⭐ THE POSITIONING, IN DANIEL'S OWN WORDS (29 Aug): for the owner who
            is "after more than just money" — who wants "a great atmosphere where
            people want to work, where there is integrity", to be "financially
            successful but with moral dignity", "bringing staff and clients
            through it", on "well executed decisions with real numbers to back
            it… but not just numbers", and who "doesn't want to be a slave to
            their business".

            ⭐ THE GAP THAT POSITIONING SITS IN: hard tools (dashboards, CFO
            software, ChatGPT) give arithmetic with nothing behind it; coaching
            gives meaning with no arithmetic. This is the only one claiming both
            — and it is not a straddle, it is the architecture: QuickBooks and
            real documents on one side, the owner's own why-statement in
            solomon_memory read on EVERY turn on the other.

            ⚠️ WHAT KEEPS FAILING: anything written in advertising register —
            punchy fragments, parallel structure, a comma doing dramatic work.
            Nine attempts in that voice were all rejected. The line that lands
            will sound like Daniel, not like a campaign. His words are above;
            start there, and let him choose. Same reason /about is still empty. */}
        {/* ⭐ 29 Aug — Daniel's own line: "the os that operates with integrity in
            mind", asked to be smoothed. "Runs on" earns its place by doing two
            jobs at once: what powers it, and how it behaves. Nearby versions he
            can swap in without touching anything else:
              "An operating system that runs with integrity"  (softer)
              "Built to run with integrity in mind"           (closest to his) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08] mb-6">
          The OS that runs<br />
          <span className="text-brand-400">on integrity.</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-6">
          An advisor who reads your actual numbers and remembers why you started
          — so you can build somewhere people want to work, and bring your staff
          and your clients through it with you.
        </p>

        {/* What he does, in the owner's language rather than in feature names. */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-2xl mx-auto">
          {[
            'Reads your books',
            'Remembers your decisions',
            'Argues both sides',
            'Names what it cannot see',
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
            {SHOW_PUBLIC_PRICE ? `Start free for ${TRIAL_DAYS} days` : 'Start free'}
          </Link>
        </div>

        <p className="text-white/30 text-sm">
          {SHOW_PUBLIC_PRICE
            ? `No credit card · ${TRIAL_DAYS} days free · Cancel anytime`
            : `No credit card · ${PILOT_PRICE_LINE} · Cancel anytime`}
        </p>
      </div>
    </section>
  )
}

/* ⚠️ 30 Aug — the headline was "What you're building is the thing. / Not the
 * money for the thing." Daniel: "this could be better, the wording is weird and
 * doesn't sell what it does." He was right about the cause — neither half of
 * that headline contained the product, so the whole section read as a mood
 * piece and the one real capability was buried in paragraph two.
 *
 * "Holds you to your margins" is a product claim, which is what earns the
 * second line the right to be a conviction. Keep that order. A replacement
 * where BOTH halves are philosophy puts us back where we started.
 */
function ConvictionSection() {
  return (
    <section className="bg-white py-24 border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
          Holds you to your margins.<br />
          <span className="text-gray-400">And to the things a margin can&rsquo;t show.</span>
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
            {/* ⚠️ TWO NOTES FROM DANIEL, 29 Aug: "too wordy" and "you say HE too
                much, it's not a he really."

                The old version ran 55 words and used "he" FIVE times in one
                paragraph. That is not warmth, it is insistence — the copy
                pushing personhood harder than the product should claim. Solomon
                keeps his name and the advisor framing; what goes is the pronoun
                drumbeat. Verb-first sentences carry the same meaning and read
                faster.

                ⚠️ 30 Aug — DANIEL OVERRODE THE SECOND HALF OF THIS, KNOWINGLY.
                The verb-first fix over-corrected: with no subject at all the
                paragraph read like a telegram ("Reads your books. Remembers
                what you decided.") and he called the wording weird. He was
                shown a subject-anchored version that keeps zero pronouns and
                chose the one that uses "it" three times instead, having been
                told that was the tradeoff. So the live copy names Solomon once
                up front and uses "it" after. DO NOT strip those back out.

                What still holds from 29 Aug: no "he", and no five-pronoun
                paragraph. The rule is now "one subject, then it" — not "no
                subject at all". */}
            <p className="text-white/60 leading-relaxed mb-6">
              Solomon reads your books, your plan and your last six check-ins
              before it answers anything &mdash; so the advice starts from your
              numbers, not a template. It remembers what you decided in March and
              why. On the calls that are hard to undo, it makes the case both
              ways, tells you where it comes down, and tells you what it could
              not see.
            </p>
            {/* The anti-prosperity line used to sit here as a refusal. It now
                lives in ConvictionSection, stated as a promise — "he'll tell you
                what it costs, and whether you can afford it" — which is the same
                move the product's disclaimer rule makes everywhere else: state
                the limit, never apologise for the product. */}
            <ul className="space-y-3">
              {[
                // Tightened 29 Aug — same four claims, half the words. ⚠️ "gets
                // smarter over time" was cut on purpose: it is AI-vendor
                // boilerplate, it promises something we do not measure, and it
                // is exactly the kind of sentence this product refuses to write.
                'Reads your books, roadmap and check-ins daily',
                'Flags the cash squeeze while you can still do something about it',
                'Answers hiring, pricing, cash and strategy',
                'Remembers every decision, and why you made it',
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
                    {/* The artifact chip is the 24 Aug capability made visible:
                        he does not describe a cash forecast, he produces one.
                        Rendered inside the bubble so it reads as something the
                        answer came with, not a separate advert. */}
                    {line.artifact && (
                      <div className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-brand-400/30 bg-brand-400/10 px-2.5 py-1.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-brand-400">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span className="text-xs font-semibold text-brand-300">{line.artifact}</span>
                      </div>
                    )}
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

// ── What he actually knows ────────────────────────────────────────────────────

/**
 * ⭐ ONE SECTION, NOT THREE (29 Aug). This replaces ToolsSection,
 * IntegrationsSection and HowItWorksSection, which each answered the same
 * question — "what does it actually do" — in a different shape. Three answers
 * to one question is why the page read long without saying more.
 *
 * The order inside is deliberate: what he reads, then what he produces. A
 * capability list means nothing until the reader knows what it is fed on, and
 * "reads your real numbers" is the claim the whole positioning rests on.
 */
function WhatHeKnowsSection() {
  return (
    <section className="bg-white py-20 border-y border-gray-100">
      <div className="max-w-4xl mx-auto px-6">

        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            He answers from your business, not a template.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Connect your books and bring what matters. Every answer after that is
            about <em>your</em> numbers, your people and your decisions.
          </p>
        </div>

        {/* What he reads */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          {[
            { name: 'QuickBooks Online', logo: '/logos/quickbooks.svg', note: 'Connects once, stays current' },
            // ⚠️ "Import", not "sync" — Drive and OneDrive are a one-time
            // picker. Settings always said this correctly; the landing page
            // used to imply a standing connection. Same shape as /security
            // advertising an export that did not exist.
            { name: 'Google Drive',      logo: '/logos/google-drive.svg', note: 'Bring the files that matter' },
            { name: 'OneDrive',          logo: '/logos/onedrive.svg',     note: 'Bring the files that matter' },
            { name: 'Your answers',      icon: '\ud83d\udcac',              note: 'Why you run it, and for whom' },
          ].map(({ name, logo, icon, note }) => (
            <div key={name} className="flex flex-col items-center gap-1.5 px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 min-w-[130px]">
              {logo
                ? <img src={logo} alt={name} className="w-7 h-7 object-contain" />
                : <span className="text-2xl">{icon}</span>}
              <p className="text-xs font-bold text-gray-800">{name}</p>
              <p className="text-xs text-gray-400 text-center">{note}</p>
            </div>
          ))}
        </div>

        {/* What he produces */}
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 text-center">
          And what it builds for you, without leaving the conversation
        </p>
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
            : 'Solomon reads your actual numbers before it says anything. It is free while we are in private pilot — the owners using it now are the ones setting the price.'}
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

          {/* ⚠️ 30 Aug — this used to read "All 10+ tools", which Daniel queried:
              he could not tell what the ten were. Two problems with that line.
              It named nothing, so it was the only cell on the card carrying no
              information. And it was not true — src/lib/tools.js has 12 entries,
              but `exit-readiness` and `rocks-tracker` are hidden:true (they do
              not fit the home-services wedge) and `solomon` is a virtual entry
              for the document library, so a new owner finds NINE tools in
              /tools. Advertising "10+" overstated the product to the exact
              degree this product refuses to.

              What is listed below is every tool actually discoverable in the
              app, plus the surfaces that are not tools. If you un-hide the two
              tools in tools.js, add them here — and not before.

              ⚠️ CORRECTION, same day: `hidden: true` does NOT mean unreachable.
              exit-readiness is hidden from the /tools GRID but is a top-level
              sidebar item labelled "Succession" (Sidebar.jsx:167, MobileNav.jsx:87)
              and /pricing sells it, so owners do find it and it is listed here.
              rocks-tracker is the genuinely retired one — the sidebar comment
              records that Roadmap absorbed quarterly priorities. So: check the
              NAV before concluding a hidden tool is unreachable, not just the
              grid. */}
          <div className="grid grid-cols-2 gap-3 text-sm text-left mb-10 max-w-md mx-auto">
            {[
              'Solomon AI advisor',
              'QuickBooks sync',
              'CFO dashboard',
              '13-week cash flow',
              'Offer & pricing builder',
              'Hiring planner',
              'Org chart',
              'Team newsletter',
              'Safety & compliance',
              'Local & AI visibility',
              'Work through a decision',
              'Succession planning',
              'Growth roadmap',
              'Weekly check-ins',
              'Playbooks',
              'Work board',
              'Cited regulatory answers',
              'Document library',
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
            {SHOW_PUBLIC_PRICE ? `Start ${TRIAL_DAYS}-day free trial` : 'Start free'}
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
          {SHOW_PUBLIC_PRICE ? `${TRIAL_DAYS} days free, no card.` : `${PILOT_PRICE_LINE}, no card.`}{' '}
          Connect your books, say what you&rsquo;re weighing, and see whether
          Solomon tells you anything you did not already know. If not, leave
          &mdash; and take your data with you.
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
          <Wordmark tone="dark" size={15} />
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
