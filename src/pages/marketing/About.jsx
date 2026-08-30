import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../../components/layout/PublicHeader'
import { buildPageMeta, organizationSchema, jsonLd, CONTACT_EMAIL } from '../../lib/seo'
import { TRIAL_DAYS } from '../../lib/pricing'

/**
 * /about — why Eliv8 OS exists.
 *
 * ⚠️ READ THIS BEFORE EDITING.
 *
 * The previous version of this page was draft copy written in Daniel's voice
 * but not by him, and it was LIVE. It claimed a shared history the reader had
 * no way to check: losing a $40k bid on disposal rates, sitting at the kitchen
 * table choosing between payroll and the equipment lease, competitors
 * outranking us on Google. Invented specifics, told in the first person, on a
 * page whose entire job is to make the reader trust us.
 *
 * It also leaned on Deconstructors as a credibility angle. That is a separate
 * company Daniel may be exiting, and this product is its own thing.
 *
 * What is here now is only what is true: who it is for, why it exists, and
 * what it refuses to do. It is deliberately shorter and quieter than a
 * conversion-optimised About page.
 *
 * ⭐ THE FOUNDER STORY IS DANIEL'S TO WRITE — in his own words, or not at all.
 * A page with no story beats a page with a fabricated one, on a product whose
 * central promise is that it will not tell you things that are not so. Do not
 * fill this gap with plausible-sounding narrative.
 */

const ABOUT_META = buildPageMeta({
  title:       'About Eliv8 OS — why it exists',
  description: 'Eliv8 OS is an AI business advisor for owners who care how the business is run. What it is for, who it is for, and what it will not do.',
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
          <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-4">About</p>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">
            An advisor for people who<br/>
            <span className="text-brand-600">want it run a certain way.</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Most business software assumes the only question worth asking is
            how to make the number bigger. Eliv8 OS is built for owners who
            have a second question underneath that one.
          </p>
        </section>

        {/* ── What it is ──────────────────────────────────────────────────────
            ⭐ ORDER CHANGED 29 Aug — Daniel, on the live page: "if someone
            clicks it they see this in their face and it seems random."

            He was right, and it was the same mistake the landing page had. "The
            short version" opened with the faith paragraph, so a reader who
            clicked About to find out WHAT THIS IS got a conviction before an
            answer. That is assertion, and this product's whole stated posture
            is the opposite: findable, never pushed.

            The conviction now has its own section, one scroll down, under a
            heading that tells the reader what they are stepping into. Someone
            looking for it finds it; someone who came to learn what the product
            does is not sorted at the door.

            ⚠️ This note used to say "nothing was removed and nothing was
            softened." That stopped being true LATER THE SAME DAY — see the note
            on that section, where Daniel cut the declarative paragraph back
            after the reorder alone proved insufficient. Findability now rests
            on the two refusals in "What this is not".

            ⚠️ Only ONE sentence moved between paragraphs ("That is a harder job
            than it sounds…"), because it referred back to the faith paragraph
            and would have dangled. The words are Daniel's; do not rewrite them. */}
        <section className="mb-16 prose prose-gray max-w-none">
          <h2 className="text-2xl font-black text-gray-900 mb-4">The short version</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Owners have plenty of people who need answers from them and almost
            nobody to ask. Eliv8 OS exists to be somewhere to ask — an advisor
            called Solomon who reads your real numbers, remembers what you
            decided and why, argues the hard calls both ways, and tells you
            plainly when he does not know.
          </p>
          <p className="text-gray-700 leading-relaxed">
            The first commitment is competence. If the advice is not as sharp
            as the best secular advisor you could hire, nothing else about this
            matters. What differs is the posture, not the arithmetic.
          </p>
        </section>

        {/* ── Where it comes from ─────────────────────────────────────────── */}
        <section className="mb-16 prose prose-gray max-w-none">
          <h2 className="text-2xl font-black text-gray-900 mb-4">Where this comes from</h2>
          {/* ⚠️ CUT BACK 29 Aug — Daniel, pointing at this exact paragraph:
              "this exact thing is too much." Moving it down the page (earlier
              the same day) was not enough; the problem was the paragraph
              itself.

              ⭐ WHAT WENT AND WHY. "Takes their faith seriously" and "called to
              be a minister" are declarative — they state the belief rather than
              let it be found, which is the one thing this product says it will
              not do. What is left is the same thesis carried by its specifics:
              price, pay, hire, and whether your word holds when keeping it
              costs. "Called" stays because it reads two ways — vocation to
              someone who thinks in those terms, plain conviction to everyone
              else. That is the Eliv8 mechanism itself: findable, never
              announced.

              ⚠️ THE EXPLICIT VERSION IS NOT GONE FROM THE SITE. It lives in the
              two refusals below — "will not help you press your faith on your
              staff" and "does not quote scripture at you" — which are the right
              place for it, because a refusal reads as integrity to any reader
              while still telling a curious one exactly whose standard this is.
              ⚠️ Do not remove those two as well; that would take findability to
              zero, and being findable is the whole point of the 22 Aug
              decision. */}
          <p className="text-gray-700 leading-relaxed">
            Some owners are called to build the thing a particular way &mdash; in
            how they price, how they pay, who they hire, and whether their word
            holds when keeping it costs something. That is harder than it sounds,
            and it is a lonely job.
          </p>
        </section>

        {/* ── What it will not do ─────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-gray-900 mb-6">What this is not</h2>
          <div className="space-y-5">
            <Pillar
              title="It is not a prosperity-gospel product"
              body="It will never suggest that faithfulness produces profit, that a downturn is a test of belief, or that a bigger number is self-evidently the right goal. If a target is unrealistic, Solomon says so instead of generating a plan that pretends."
            />
            <Pillar
              title="It will not help you press your faith on your staff"
              body="The power imbalance between an owner and someone who needs the job is real, and so is the legal exposure. Solomon will decline that and say why."
            />
            <Pillar
              title="It does not make things up"
              body="Questions about rules and obligations are answered from your own documents and the actual regulation, with the source shown. Where Solomon cannot see something, he names it rather than filling the gap."
            />
            <Pillar
              title="It does not quote scripture at you"
              body="Only where it genuinely bears on the question, and briefly. The default is a straight business answer."
            />
          </div>
        </section>

        {/* ── Who it's for ────────────────────────────────────────────────── */}
        <section className="mb-16 bg-gray-50 rounded-2xl p-8">
          <h2 className="text-2xl font-black text-gray-900 mb-4">Who Eliv8 OS is for</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Owner-operators doing somewhere between $500k and $15M a year, with
            3 to 50 people on the team, where the owner is still the bottleneck
            on the financial decisions. It is not sector-specific — the thing
            these owners have in common is a conviction about how the business
            should be run, not what it does. Trade and construction businesses
            are well represented, but the question it answers is not a trade
            question.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <span className="font-bold text-gray-900">It's probably not for you if:</span>{' '}
            you have a controller and a leadership team already — you have
            outgrown this. If you are pre-revenue, wait until there are real
            numbers to work with. And if what you want is software that
            promises returns, this is the wrong product and will be a
            frustrating one.
          </p>
        </section>

        {/* ── Contact / CTA ───────────────────────────────────────────────── */}
        <section className="text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-4">Want to talk?</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Daniel reads every email. If you are an owner thinking about it, or
            you want to introduce someone — write. No sales script.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-gray-950 font-bold transition-colors"
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
    <div className="border-l-2 border-brand-400 pl-5">
      <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-[15px]">{body}</p>
    </div>
  )
}
