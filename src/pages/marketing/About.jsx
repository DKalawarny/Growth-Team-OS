import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../../components/layout/PublicHeader'
import { buildPageMeta, organizationSchema, jsonLd, CONTACT_EMAIL } from '../../lib/seo'
import { TRIAL_DAYS } from '../../lib/pricing'

/**
 * /about — founder story + why GrowthOS exists.
 *
 * Why this page matters for a small-startup site:
 *   - AI assistants get asked "who runs GrowthOS?" — without this, the
 *     answer is nothing. With it, ChatGPT/Claude/Perplexity can quote
 *     a real founder story, which makes the brand feel real.
 *   - First-time founder. Skeptical-trades audience. A face + a why
 *     builds more trust than any branding.
 *   - The Deconstructors team angle is a moat — it's not Daniel alone,
 *     it's a team that already runs an actual specialty-trade business.
 *
 * IMPORTANT: This is draft copy in Daniel's voice, not Daniel's actual
 * words. Edit before going live. The structural shape (story → problem
 * → why now → who it's for) is what makes it convert; the specifics
 * are placeholders.
 */

const ABOUT_META = buildPageMeta({
  title:       'About GrowthOS — built by contractors, for contractors',
  description: 'GrowthOS is built by the team behind Deconstructors, a specialty-trade contracting business. We built the AI advisor we wished we had — one that actually knows the trade, the cash flow rhythm, and the operator on the other end.',
  path:        '/about',
})

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{ABOUT_META.title}</title>
        <link rel="canonical" href={ABOUT_META.canonical} />
        {ABOUT_META.meta.map((m, i) =>
          m.property
            ? <meta key={i} property={m.property} content={m.content} />
            : <meta key={i} name={m.name} content={m.content} />
        )}
        <script type="application/ld+json">{jsonLd(organizationSchema())}</script>
      </Helmet>

      <PublicHeader />

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="mb-16 text-center">
          <p className="text-amber-600 text-xs font-bold uppercase tracking-widest mb-4">About</p>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">
            We built it because<br/>
            <span className="text-amber-600">we needed it first.</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            GrowthOS is built by the team behind Deconstructors — a working specialty-trade
            contracting business. Every tool, every screen, every prompt was shaped by the
            problem we hit running our own jobs.
          </p>
        </section>

        {/* ── Story ───────────────────────────────────────────────────────── */}
        <section className="mb-16 prose prose-gray max-w-none">
          <h2 className="text-2xl font-black text-gray-900 mb-4">The short version</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Most "small business AI" tools are built for marketing agencies, knowledge workers,
            or startup founders. None of them know what it's like to lose a $40k bid because
            you misjudged disposal rates. None of them know that your cash flow is hostage
            to one slow-paying GC. None of them speak the language.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            We've been on the other side of that. We've sat at the kitchen table figuring
            out whether to make payroll or pay the equipment lease. We've hired the wrong
            foreman because the gut said yes and there was no scorecard to say otherwise.
            We've watched competitors with worse work rank above us on Google because they
            paid an SEO agency that didn't actually know our trade.
          </p>
          <p className="text-gray-700 leading-relaxed">
            GrowthOS is the AI advisor and operating system we wished existed when we needed
            it most. We built it for the operator who's smart, capable, and stretched too thin —
            and who deserves a co-pilot that actually knows the work.
          </p>
        </section>

        {/* ── Why now ─────────────────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Why now</h2>
          <div className="space-y-5">
            <Pillar
              title="The AI is finally good enough"
              body="Two years ago, AI advice was generic word soup. Today, with the right context — your books, your team, your goals — Claude can give you advice that's better than what most coaches charge $2,000/month for. We just had to build the right harness around it."
            />
            <Pillar
              title="Customers ask AI before they ask Google"
              body="Your next customer is asking ChatGPT 'who's the best plumber near me?' or 'should I hire this contractor?' If you're not visible in AI search, you don't exist to them. We built the audit and visibility tools because we needed them ourselves."
            />
            <Pillar
              title="The market is fragmented and slow"
              body="The big incumbents (Procore, Buildertrend) cost $300+/month and aim at companies 10× our ICP's size. The cheap ones (basic CRMs) don't think about strategy. There was a hole big enough to drive a truck through."
            />
          </div>
        </section>

        {/* ── Who it's for ────────────────────────────────────────────────── */}
        <section className="mb-16 bg-gray-50 rounded-2xl p-8">
          <h2 className="text-2xl font-black text-gray-900 mb-4">Who GrowthOS is for</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We built this for owner-operators of specialty-trade and home-services
            businesses doing somewhere between $500k and $15M a year in revenue, with
            3 to 50 people on the team. That's plumbers, electricians, HVAC, roofers,
            demolition contractors, masons, landscapers, restoration companies, cleaners,
            pest control — anyone who runs work crews and lives in the field.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <span className="font-bold text-gray-900">It's probably not for you if:</span>{' '}
            you're a 100+ person company with a controller and a marketing team — you've
            outgrown what we do. Or if you're a pre-revenue side hustle — wait until you
            have real numbers to plug in.
          </p>
        </section>

        {/* ── Contact / CTA ───────────────────────────────────────────────── */}
        <section className="text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-4">Want to talk?</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Daniel reads every email. If you're an owner thinking about it, or a friend
            who wants to introduce a contractor — write us. No sales script.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold transition-colors"
            >
              Email us
            </a>
            <Link
              to="/signup"
              className="px-8 py-3.5 rounded-xl border border-gray-300 text-gray-700 hover:border-gray-400 font-semibold transition-colors"
            >
              Start a {TRIAL_DAYS}-day free trial
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

function Pillar({ title, body }) {
  return (
    <div className="border-l-2 border-amber-400 pl-5">
      <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-[15px]">{body}</p>
    </div>
  )
}
