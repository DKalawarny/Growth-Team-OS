import HeroAsk from '../components/marketing/HeroAsk'
import { useState } from 'react'
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
 *   Hero (with Solomon answering) → Conviction → Use cases → Meet Solomon +
 *   demo → What he knows → Follows up → Price → CTA
 *   ⭐ 12 Oct: Conviction moved to SECOND. See the note at <HeroSection/>.
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

// 12 Oct: four of these (cash forecast, hire, pricing, succession) said again
// what the "decisions you'd rather not make alone" cards say higher up. Out.
// These are the four that appear nowhere else on the page.
const TOOLS = [
  {
    name: 'Work through a decision',
    outcome: 'Solomon argues both sides, shows you where they disagree, and tells you which way it leans and what it cannot see.',
  },
  {
    name: 'Read your numbers',
    outcome: 'Connect QuickBooks and Solomon explains your month in plain English: what changed, what it means and what to do.',
  },
  {
    name: 'Write down a repeating job',
    outcome: 'Solomon writes down the jobs that only you know how to do, so the business can run a day without you.',
  },
  {
    name: 'Check an obligation',
    outcome: 'Solomon answers from your own documents and the actual regulation, and shows you the source. It never guesses at the law.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

// ── What you'd use it for ───────────────────────────────────────
// Concrete owner moments, high on the page, so a visitor sees their own
// situation before any claim about the product. Added 9 Oct (Daniel: the
// landing needed more of a use case). Each line maps to a real capability
// (hiring, cash flow, succession, pricing) — no feature named, just the moment.

function UseCasesSection() {
  const cases = [
    { when: 'You’re weighing whether you can afford to hire.',
      does: 'Solomon reads your real numbers and says what the hire costs, and whether the work is there to carry it.' },
    { when: 'A tight cash week is coming.',
      does: 'Solomon looks thirteen weeks ahead, so a tight payroll week never surprises you.' },
    { when: 'You want to know it could run without you.',
      does: 'Solomon tells you what has to be in place before someone else can run it, and how far off you are.' },
    { when: 'You’re pricing a job and not sure where to land.',
      does: 'Solomon helps you find a fair price, one that does not overcharge the customer or shortchange you.' },
  ]
  return (
    <section className="bg-gray-50 py-20 border-y border-gray-100">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">What you’d use it for</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">The decisions you’d rather not make alone.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cases.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 text-left">
              <p className="font-bold text-gray-900 mb-1.5 leading-snug">{c.when}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{c.does}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

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
      {/* ⭐ 12 Oct, Daniel: "we aren't really hitting on the difference this
          app is over others, the integrity, the people", and of "Holds you to
          your margins": "this is a good one but it's at the bottom." So it is
          second now. The 29 Aug objection above (conviction before the product
          has shown anything) no longer applies: the hero now ends with Solomon
          answering three real questions, so competence is on screen first. */}
      <HeroSection />
      <ConvictionSection />
      <UseCasesSection />
      <SolomonSection />
      <DemoBand />
      <WhatHeKnowsSection />
      <FollowsUpSection />
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

      {/* ⭐ 12 Oct: spacing here is deliberately tight so the top of the
          Solomon panel shows at the bottom of the screen on arrival and tells
          a visitor there is more to scroll to. Daniel rejected putting the
          panel beside the headline ("super busy"): one centred column. */}
      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        {/* 12 Oct: the "free while in private pilot, no credit card" pill sat
            here. Daniel moved it to a small flag in the top bar (PublicHeader). */}

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
        {/* ✅ SETTLED FOR NOW — Daniel, 31 Aug: "sure for now". This is a
            decision, not a slot. The earlier PLACEHOLDER note is gone; do not
            reopen this line unsolicited, and do not write a tenth option.

            ⭐ WHY IT SURVIVED where nine others did not: it is a smoothed
            version of a sentence he actually said, and that is the ONLY
            property separating a line he kept from a line he rejected.

            ⭐ WHY THE H1 DOES NOT NEED TO DESCRIBE THE PRODUCT: the sub-line
            and the five chips below already tell a cold reader exactly what
            this does, inside one eyeful. That frees the headline to be
            memorable rather than descriptive. ⚠️ So if anyone ever weakens the
            chips, the headline stops being able to afford its abstraction —
            they are load-bearing for it.

            ⚠️ THE KNOWN RESERVATION, recorded so it is not rediscovered as
            though it were new: "integrity" is a self-claim, in the largest type
            on the site, and the 29 Aug principle was to SHOW conviction rather
            than state it. The chip "Never flatters you" is integrity
            demonstrated; the headline is integrity asserted. Daniel knows and
            accepted it for now. If it is ever revisited, that is the reason —
            not that the line is unclear.

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

            ⚠️ WHAT KEEPS FAILING, if it is ever reopened: anything written in
            advertising register — punchy fragments, parallel structure, a comma
            doing dramatic work. Nine attempts in that voice were all rejected.
            The line that lands will sound like Daniel, not like a campaign. His
            words are above; start there, and let him choose. The strongest
            unused raw material is his own "real numbers to back it… but not
            just numbers", which names the gap the product sits in. Same reason
            /about is still empty. */}
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

        {/* ⭐ 31 Aug — this sentence came off /about, where Daniel spotted it:
            "this is a clean sell, it should almost be the first thing people
            see." He was right, and it exposed a real gap. The landing page had
            NO problem statement — the H1 is a conviction, the old sub-line was
            capability plus outcome, and the five chips below are capability
            again. A cold reader learned what it is, what it does and what we
            believe, and never learned what hurts. The 29 Aug note deleting
            ProblemSection said "the hero states the problem"; it does not, it
            states a value, and nothing picked the job up.

            ⚠️ DELIBERATELY SHORT — 23 words against the old 40. Everything the
            old version said after the dash ("reads your actual numbers,
            remembers...") is restated by the chips two inches below. The
            sentence is strong enough that adding to it dilutes it. Do not
            re-attach a capability clause here.

            🔴 WHAT THIS DROPPED, and it is Daniel's own language: "so you can
            build somewhere people want to work, and bring your staff and your
            clients through it with you." He chose this version knowing that.
            It is currently on NO public surface — the natural home is the
            conviction section, beside "Holds you to your margins", but that is
            approved copy and his call, not a silent edit. */}
        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-8">
          Owners have plenty of people who need answers from them and almost
          nobody to ask. Eliv8 OS exists to be somewhere to ask.
        </p>

        {/* 12 Oct, Daniel: the five tags that sat here ("Reads your books",
            "Never flatters you"...) "can go, it kind of says below". The
            Solomon panel under the buttons now shows all five happening. Older
            notes above call them load-bearing for the headline: the panel has
            that job now. */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
          {/* ⚠️ 10 Oct, Daniel: "the demo button gets kinda lost, it should be one
              of the big sells." It was a ghost button labelled "See it in action"
              beside the sign-up. The demo is the strongest thing on this page
              (the real app, loaded, nothing to sign up for), so it leads, solid
              white on the dark hero, and says what it is. */}
          <Link
            to="/demo"
            className="px-10 py-4 rounded-xl bg-white hover:bg-gray-100 text-gray-950 font-black text-base transition-colors shadow-lg inline-flex items-center gap-2.5"
          >
            <span aria-hidden className="inline-block w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-brand-600" />
            Try the live demo
          </Link>
          <Link
            to="/signup"
            className="px-10 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-gray-950 font-black text-base transition-colors shadow-lg"
          >
            {SHOW_PUBLIC_PRICE ? `Start free for ${TRIAL_DAYS} days` : 'Start free'}
          </Link>
        </div>

        <p className="text-white/60 text-sm">
          The demo is the real app, loaded with a sample company. You do not need an account to open it.
        </p>
        {/* 12 Oct: a second "no credit card, free in pilot" line sat here. The
            pill above the headline already says it. Once per eyeful. */}

        {/* The moving part: Solomon answering, with questions a visitor can tap.
            Scripted and labelled as an example. See HeroAsk. */}
        <div className="mt-9">
          <HeroAsk />
        </div>
      </div>
    </section>
  )
}

/* ⭐ 3 Sep — THE SELL. Daniel, after seeing monday.com: "how can we really
 * separate ourselves, should we do more or gear towards something." Gearing
 * toward, and this is the thing.
 *
 * Everything else on this page is a claim a competitor could also make. This
 * one they structurally cannot:
 *   - a bookkeeper reports what already happened
 *   - monday.com reports what is late on a board somebody has to maintain
 *   - a general chatbot gives good advice and forgets it on close
 *   - EOS software (Ninety, Bloom) really does track commitments — as Rocks
 *     typed into a form each quarter by a leadership team running a
 *     methodology, usually with a paid implementer. Our reader IS the
 *     leadership team, and he is in a truck.
 * Here it falls out of a conversation he was already having. Nobody enters
 * anything. Same argument as the foreman daily log.
 *
 * ⚠️ THE RESTRAINT IS THE SELL, NOT A CAVEAT. Every reader's mental model of
 * "software that holds you accountable" is nagging, and the standing criticism
 * of AI coaches is that they either agree with everything or turn into a
 * report card. So the third paragraph — asks once, changed your mind is a real
 * answer, never keeps score — is doing more selling than the second one. Do
 * not cut it for length.
 *
 * Placed before WhatHeKnows deliberately: this claim stands on memory, not on
 * the books being connected, so it does not need the numbers section first.
 * Section order argument is at the top of this file. */
function FollowsUpSection() {
  return (
    <section className="bg-white py-20 border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
          It remembers what you said you&rsquo;d do.<br />
          <span className="text-gray-400">Nobody else is going to ask.</span>
        </h2>

        {/* 12 Oct, Daniel: "this needs better wording or a bit of a change or
            do we even need it." Kept, because it is the one thing a competitor
            cannot say, but cut from 185 words to about 70. Same three beats:
            you said it, Solomon asks once, no score. */}
        <div className="space-y-5 text-[17px] leading-[1.7] text-gray-700">
          <p>
            In June you said you would stop quoting anything under eight grand.
            Nobody wrote it down, and nobody on your payroll is going to ask you
            about it.
          </p>
          <p>
            Solomon wrote it down. When it comes due, it asks you once whether
            that held. If you changed your mind, that is a full answer. It does
            not keep score, and it does not bring it up again.
          </p>
        </div>
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

        <div className="space-y-5 text-[17px] leading-[1.7] text-gray-700">
          <p>
            {/* 12 Oct, Daniel on the old wording of these two paragraphs:
                "wording can be more normal", it read like Yoda. One idea per
                sentence, subject first. */}
            Most business advice only cares about the number at the bottom.
            Fair wages, honest quotes and whether your shop is a decent place
            to work get treated as costs.
          </p>
          {/* ⚠️ 31 Aug — this used to read "notice how the customer who is never
              going to check the invoice gets treated". Daniel: "a weird thing to
              say". He was right twice over. It quietly implies the reader might
              be padding invoices for people who do not check — a suspicion aimed
              at a prospect who has not signed up yet. And it named something
              Solomon cannot actually see.

              A job gone back to and fixed for free is visible in the books, and
              it is the better example anyway: it COSTS the owner something. That
              is what earns the paragraph below it, which was previously arriving
              unprepared — the section now counts a real cost, then says plainly
              that it will keep counting them. */}
          <p>
            Solomon watches your margins as closely as any CFO would. It also
            tells you what it cost to go back and fix that job for free, and
            whether your people will still want to work for you a year from now.
          </p>
          {/* ⚠️ "He/He'll" three times here until 31 Aug. The 29 Aug pronoun pass
              only ever touched the Solomon section; Daniel: "yes he is said lots
              fix that". Same rule as there — ONE named subject, then "it". */}
          <p className="text-gray-900 font-medium">
            It won&rsquo;t tell you that running the business this way makes it more
            profitable. Nobody can promise that. It will tell you what that costs,
            and whether you can afford it.
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

/**
 * ⚠️ 12 Oct 2026: WORDS ONLY, ONE COLUMN. This section used to carry its own
 * scripted chat on the right. Once the hero got a Solomon panel a visitor can
 * tap (HeroAsk), Daniel saw it made this one redundant: two fake chats in a
 * row, and the old one said "Live" and "Online" while being scripted. Its
 * exchange ("Can I afford a second crew lead?") moved into HeroAsk. Do not put
 * a second chat picture back here.
 */
function SolomonSection() {
  return (
    <section className="bg-gray-950 pt-20 pb-10">
      <div className="max-w-2xl mx-auto px-6 text-center">
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
        <p className="text-white/70 text-[17px] leading-relaxed">
          Solomon reads your books, your plan and your last six check-ins
          before it answers anything, so the advice starts from your
          numbers, not a template. It remembers what you decided in March and
          why. On the decisions that are hard to undo, it argues both sides, tells you which way it leans, and tells you what it could not see.
        </p>
        {/* 12 Oct: four ticks sat here. Each one repeated something said
            in full elsewhere on the page (reads your books, cash squeeze,
            hiring and pricing, remembers decisions). Daniel: "still some
            redundancies". */}
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
    <section className="bg-gray-50 py-20 border-y border-gray-100">
      <div className="max-w-4xl mx-auto px-6">

        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            He answers from your business, not a template.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Connect your books and add the files that matter. After that, every answer is about <em>your</em> numbers, your people and your decisions.
          </p>
        </div>

        {/* What he reads */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-12">
          {[
            { name: 'QuickBooks Online', logo: '/logos/quickbooks.svg', note: 'Connect it once and it stays current' },
            // ⚠️ "Import", not "sync" — Drive and OneDrive are a one-time
            // picker. Settings always said this correctly; the landing page
            // used to imply a standing connection. Same shape as /security
            // advertising an export that did not exist.
            { name: 'Google Drive',      logo: '/logos/google-drive.svg', note: 'Add the files that matter' },
            { name: 'OneDrive',          logo: '/logos/onedrive.svg',     note: 'Add the files that matter' },
            { name: 'Your answers',      icon: '\ud83d\udcac',              note: 'Why you run the business, and who for' },
          ].map(({ name, logo, icon, note }) => (
            <div key={name} className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-2xl border border-gray-200 bg-white text-center">
              {logo
                ? <img src={logo} alt={name} className="w-7 h-7 object-contain" />
                : <span className="text-2xl">{icon}</span>}
              <p className="text-sm font-bold text-gray-900">{name}</p>
              <p className="text-[13px] text-gray-600 text-center">{note}</p>
            </div>
          ))}
        </div>

        {/* What he produces */}
        <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-6 text-center">
          What Solomon builds for you while you talk
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {TOOLS.map((tool, i) => (
            <div key={i} className="px-4 py-3.5 rounded-xl border border-gray-200 bg-white">
              <p className="font-bold text-gray-900 text-sm mb-0.5">{tool.name}</p>
              <p className="text-[13px] text-gray-600 leading-snug">{tool.outcome}</p>
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
    <section className="bg-gray-50 py-20">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {SHOW_PUBLIC_PRICE
            ? `$${PRICE_MONTHLY_USD} a month. One tier, everything in it.`
            : 'Free while we are in private pilot.'}
        </h2>
        <p className="text-gray-500 mb-10 max-w-lg mx-auto">
          A coach or a mastermind group costs $500 to $2,500 a month, and most of them will tell you what you want to hear.{' '}
          {SHOW_PUBLIC_PRICE
            ? 'This is a fraction of that, and it reads your actual numbers before it says anything.'
            : 'Solomon reads your real numbers before it says anything. The owners using it now are helping to set the price.'}
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
                <p className="text-brand-400 font-semibold mb-8">Billed as ${PRICE_ANNUAL_USD} USD/year. You save ${ANNUAL_SAVINGS_USD}</p>
              ) : (
                <p className="text-white/30 mb-8">Switch to annual and save ${ANNUAL_SAVINGS_USD}/year</p>
              )}
            </>
          ) : (
            <>
              {/* 12 Oct: the big PILOT_PRICE_LINE sat here, directly under a
                  heading saying the same thing. The heading says it once. */}
              <p className="text-white/75 text-base max-w-md mx-auto mb-8">{PILOT_PRICE_BLURB}</p>
            </>
          )}

          {/* ⚠️ Restored 9 Oct. This list was cut by mistake: Daniel's "the
              count at the bottom seems useless" was about the dashboard, not
              this card. Names match the app as it is now (Tasks, Daily logs);
              the retired visibility tool is left out. Keep it to what an
              owner can actually find in the nav. */}
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
              'Work through a decision',
              'Succession planning',
              'Growth roadmap',
              'Weekly check-ins',
              'SOPs',
              'Tasks',
              'Daily logs',
              'Cited regulatory answers',
              'Document library',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-white/85">
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
          <p className="mt-4 text-white/55 text-sm">No credit card required · Cancel anytime</p>
        </div>

        <Link to="/pricing" className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
          See full pricing details →
        </Link>
      </div>
    </section>
  )
}

// ── The demo, mid-page ────────────────────────────────────────────────────────
// A second, larger invitation for the reader who scrolled past the hero. By
// here they have read what Solomon does; this is where they can go and see it.
function DemoBand() {
  // 12 Oct: centred, one column, so it reads as the end of "Meet Solomon"
  // above it (same dark block) and not as a second, differently laid out one.
  return (
    <section className="bg-gray-950 pt-10 pb-20">
      <div className="max-w-2xl mx-auto px-6 text-center border-t border-white/10 pt-14">
        <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
          Don&rsquo;t take our word for it. Open it.
        </h2>
        <p className="text-white/70 text-[17px] leading-relaxed mb-8">
          The demo is the full app with a sample landscaping company in it. You get your own private copy, so you can click and change anything. You do not need an account or a card.
          Solomon&rsquo;s answers in the demo are saved examples. In your own account he answers from your business.
        </p>
        <Link
          to="/demo"
          className="px-10 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-gray-950 font-black text-base transition-colors shadow-lg inline-flex items-center gap-3"
        >
          <span aria-hidden className="inline-block w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-gray-950" />
          Open the live demo
        </Link>
      </div>
    </section>
  )
}


function ClosingCTA() {
  return (
    <section className="bg-brand-500 py-16">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">
          You don&rsquo;t have to decide the next one alone.
        </h2>
        <p className="text-gray-950/70 mb-8 max-w-lg mx-auto">
          {SHOW_PUBLIC_PRICE ? `${TRIAL_DAYS} days free, no card.` : `${PILOT_PRICE_LINE}, and you do not need a card.`}{' '}
          Connect your books, tell Solomon what you are weighing, and see if it tells you something you did not already know. If it does not, you can leave and take your data with you.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-950 text-white font-black text-base hover:bg-gray-800 transition-colors"
          >
            Start free
          </Link>
<Link
            to="/demo"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-gray-950 font-black text-base hover:bg-gray-100 transition-colors"
          >
            Try the live demo first
          </Link>
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
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link to="/answers" className="hover:text-white/60 transition-colors">Answers</Link>
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
