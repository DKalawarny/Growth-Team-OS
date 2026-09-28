import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { WAYOUT_NAME, WAYOUT_NAME_TITLE, WAYOUT_TAGLINE, WAYOUT_BASE, WAYOUT_SITE_URL } from '../../lib/wayout/brand'
import { priceLine, WAYOUT_PRICE_FULL, WAYOUT_PAYMENTS_LIVE, walksWithYouLine } from '../../lib/wayout/pricing'
import { SITUATIONS } from '../../content/unstuckSituations'
import './wayout.css'

/**
 * The way out — the front door.
 *
 * ⭐⭐ THE PRODUCT IS THE HERO, not copy about the product. Daniel's reference
 * (omen.trade) puts a phone showing a real balance and a real chart at the
 * centre of the screen; every mockup I made before that had no product on it at
 * all, just type on a card, which is exactly why two "different directions"
 * read to him as no change. The plan itself is the most persuasive object this
 * product owns and it was nowhere near the front door.
 *
 * ⭐ MOTION LIVES BEHIND THE CONTENT AND NEVER ON IT. The light drifts on a
 * nineteen-second loop; the type does not move at all. That restraint is what
 * makes a page read as expensive rather than busy, and it is the half I had
 * been missing while arguing that restraint meant having no motion.
 *
 * ⚠️ WHAT IS DELIBERATELY NOT TAKEN FROM THE REFERENCE: near-black with a neon
 * accent and gradient text is the visual language of crypto and trading, and
 * this audience has been marketed at by exactly that. Same composition, our
 * materials. `--wo-dark` on the wrapper flips the ground if that judgement
 * turns out to be wrong — it is tokens, not a rebuild.
 *
 * 🔴 THE PLAN ON SCREEN IS MARCUS'S, AND IT HAS TO STAY A REAL ONE. The whole
 * trick is that it is an actual answer with actual arithmetic. A blurred or
 * invented plan here would be the page lying in precisely the way the product
 * refuses to — and it would be the first thing anyone saw.
 */
/**
 * ⭐⭐ TWO PEOPLE WHOSE PLANS SHARE NOTHING. That is the point of having two: the
 * claim on this page is that the plan is built from YOUR answers, and a single
 * example quietly argues the opposite.
 *
 * ⚠️ They are deliberately opposite in SHAPE, not just in detail. Marcus already
 * has the money and is short of permission; Dee is short of the money and needs
 * the order. One is told he can afford it today, the other is given a date. If
 * both cards said the same kind of thing, two would be worse than one.
 *
 * 🔴 EVERY FIGURE HERE IS ARITHMETIC ON THE FIGURES IN THE SAME CARD, and no
 * move claims what anybody will qualify for or what a named body provides. These
 * are illustrations of a real plan's shape, and the moment one of them says
 * something the actual product would refuse to say, the front door is lying
 * about what is behind it.
 */
const HERO_PLANS = [
  {
    who: 'Marcus, 52. Two kids at home.',
    headline: 'Four days a week by March.',
    mark: 'You can already afford it.',
    stats: [['What your life costs', '$4,100'], ['The day costs', '$1,580']],
    moves: [
      ['Work out what your life actually costs', 'One evening.', true],
      ['Show Jen the number first', 'Next week.', false],
      ['Ask for the four-day week', 'March.', false],
    ],
    cut: [
      ['A side business', 'not enough hours in your week.'],
      ['Selling the house', 'it does not clear enough to matter.'],
    ],
  },
  {
    who: 'Dee, 38. Renting, two kids.',
    headline: 'Out of the hole by June,',
    mark: 'without a second job.',
    stats: [['Left at the end of the month', '$240'], ['What you owe', '$3,100']],
    moves: [
      ['Put the two most expensive debts in order', 'This week.', true],
      ['Rent the garage, not your evenings', 'This month.', false],
      ['Ask what the night shift actually pays', 'April.', false],
    ],
    cut: [
      ['A second job', 'the hours are not there, and the childcare eats it.'],
      ['A consolidation loan', 'at your rate it costs more than it saves.'],
    ],
  },
]

export default function Landing() {
  return (
    <div className="wayout wayout--hero">
      <Helmet>
        <title>{`${WAYOUT_NAME_TITLE} — ${WAYOUT_TAGLINE}`}</title>
        <meta name="description" content={WAYOUT_TAGLINE} />
        {/* ⭐⭐ Indexable as of 26 Sep — see the note in Diagnostic.jsx. This is
            the page that should rank: it says what the product is. */}
        {/* Same inherited-canonical problem as WayoutShell — this page does not
            use it, so it needs its own or it claims to be the Eliv8 homepage. */}
        <link rel="canonical" href={`${WAYOUT_SITE_URL}/wayout/hello`} />
        {/* ⚠️ Same reason as WayoutShell — index.html's Open Graph tags are
            Eliv8 OS's, and Helmet only manages what it declares. This page does
            not use WayoutShell, so it needs its own set or it inherits them. */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={WAYOUT_NAME_TITLE} />
        <meta property="og:url" content={WAYOUT_SITE_URL} />
        <meta property="og:title" content={`${WAYOUT_NAME_TITLE} — ${WAYOUT_TAGLINE}`} />
        <meta property="og:description" content={WAYOUT_TAGLINE} />
        <meta property="og:image" content={`${WAYOUT_SITE_URL}/unstuckmap-og.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${WAYOUT_NAME_TITLE} — ${WAYOUT_TAGLINE}`} />
        <meta name="twitter:description" content={WAYOUT_TAGLINE} />
        <meta name="twitter:image" content={`${WAYOUT_SITE_URL}/unstuckmap-og.png`} />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Caveat:wght@700&display=swap"
        />
      </Helmet>

      {/* Behind everything. Two slow warm sources, drifting past each other. */}
      <div className="wayout__aura" aria-hidden="true" />
      <div className="wayout__grain" aria-hidden="true" />

      <div className="wayout__hero">
        <div className="wayout__herocopy">
          <div className="wayout__brand">
            <i />{WAYOUT_NAME}
            {/* 🔴 The only route back for somebody who already has an account.
                /wayout/enter existed all along and nothing public linked to it. */}
            <Link className="wayout__signin" to={`${WAYOUT_BASE}/enter`}>Already started? Sign in</Link>
          </div>

          <h1 className="wayout__heroline">
            Three<br />moves.<br /><span>In order.</span>
          </h1>

          {/* ⭐ The tagline carries the proposition now, so the lead does the
              job under it rather than repeating it: what it costs them, and
              what they get that nobody else gives. */}
          <p className="wayout__herolead">
            {WAYOUT_TAGLINE} Six honest questions, then which of your moves is
            first — and what to ignore.
          </p>

          <div className="wayout__herocta">
            <Link className="wayout__btn" to={`${WAYOUT_BASE}/start`}>Start with three minutes</Link>
            {/* 🔴 THIS CONTRADICTED ITSELF INSIDE ONE PARAGRAPH. It read "The
                FIRST three minutes are free and need no account" immediately
                before priceLine() says "Your plan is free. Nothing to pay, at the
                end or anywhere else." "First" implies a later part that is not
                free — in the hero, which is the most-read line on the site, and
                the exact sentence somebody braced for a bait-and-switch is
                scanning for.
                ⚠️ It also still sold the product as a three-minute thing. Both
                times are stated now, because the honest version is also the
                better funnel: a small first step with the real one named. */}
            <p className="wayout__fine">
              No account, no card. Three minutes to your direction, about fifteen more
              for the plan. {priceLine()}
            </p>
          </div>
        </div>

        {/* ⚠️ aria-hidden: these are an illustration of the deliverable, and a
            screen reader working through two sample plans before reaching the
            actual proposition would be worse than skipping them. The copy above
            carries the meaning.

            ⭐⭐ TWO, STAGGERED, AND THE BACK ONE COMES FORWARD ON HOVER. Daniel:
            "we could have two examples maybe one staggered over the other and
            when the cursor goes over it it brings the back one to the top."

            🔴 THE REASON IS STRONGER THAN THE EFFECT: ONE EXAMPLE MAKES THE
            PRODUCT LOOK LIKE IT DOES ONE THING. Marcus already has the money and
            needs permission; Dee is $3,100 in a hole and needs the order. Their
            headlines, their numbers and all six moves share nothing — which IS
            the claim this page is making, and a single card quietly argues the
            opposite. */}
        <div className="wayout__heroplans" aria-hidden="true">
          {HERO_PLANS.map((pl, i) => (
            <div className={`wayout__heroplan wayout__heroplan--${i === 0 ? 'front' : 'back'}`} key={pl.who} tabIndex={-1}>
              <div className="wayout__brand"><i />your plan</div>
              <p className="wayout__who">{pl.who}</p>
              {/* 🔴 NOT A HEADING. These were <h2>, which made "Four days a week
                  by March" and "Out of the hole by June" the FIRST TWO SECTION
                  HEADINGS on the page — an invented person's plan sitting above
                  every real section in the document outline. aria-hidden keeps
                  it from a screen reader; it does not keep it out of the outline
                  a crawler builds. It is a picture of the product, so it is a
                  div that happens to be big. */}
              <div className="wayout__heroplanline">
                {pl.headline} <mark>{pl.mark}</mark>
              </div>

              <div className="wayout__stats">
                {pl.stats.map(st => (
                  <div className="wayout__stat" key={st[0]}>
                    <span>{st[0]}</span><b>{st[1]}</b>
                  </div>
                ))}
              </div>

              <p className="wayout__label">Three moves. This order.</p>
              {pl.moves.map(([title, when, now]) => (
                <div className={`wayout__move${now ? ' wayout__move--now' : ''}`} key={title}>
                  <span className="wayout__chk">
                    <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3 3 7-7" />
                    </svg>
                  </span>
                  <span>
                    <p>{title}</p>
                    <small><b>{when}</b></small>
                  </span>
                </div>
              ))}

              {/* ⭐⭐ THE CUT LIST IS THE DIFFERENTIATOR AND IT BELONGS ON THE
                  FRONT DOOR. Everything else adds to somebody's list; this is
                  the one that takes things off it, with the reason. */}
              <p className="wayout__herocut">
                <b>Crossed off, with the reason</b>
                {pl.cut.map(([what, why]) => (
                  <span key={what}><s>{what}</s> — {why}</span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ⭐⭐ BELOW THE FOLD, AND UNTIL 26 Sep THERE WAS NOTHING HERE AT ALL —
          the wrapper carried `overflow: hidden`, so the page could only ever be
          one screen tall. Daniel: "there is nothing interesting or intriguing."

          🔴 THE ORDER IS THE ARGUMENT, and it is not the usual one. A landing
          page normally opens by naming a pain. This one cannot: somebody who is
          stuck already knows the pain in more detail than we ever will, and
          describing it back to them is the "vague" failure in a different
          costume. So the hero shows THE ANSWER — a real plan with real
          arithmetic — and everything below earns the right to it.
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="wayout__pitch">

        {/* ⭐ RECOGNITION BEFORE PERSUASION. Nobody types "I am stuck" — they
            type the specific thing. These are the pages written for exactly that,
            so this section doubles as the internal linking those pages need. */}
        <section>
          <h2 className="wayout__pitchh">It’s never just “stuck”.</h2>
          <p className="wayout__pitchlead">
            It’s a house with debt against it. A job that pays more than the next one
            would. A year of night shifts you can’t see the end of. Straight answers
            to the specific ones, free to read:
          </p>
          <div className="wayout__board wayout__board--situations">
            {SITUATIONS.slice(0, 6).map(x => (
              <Link
                key={x.slug}
                to={`${WAYOUT_BASE}/stuck/${x.slug}`}
                className="wayout__card wayout__situationcard"
              >
                <b>{x.intro}</b>
                <h3>{x.question}</h3>
              </Link>
            ))}
          </div>
          {/* ⚠️ .wayout__fine centres by default — correct under a centred CTA,
              wrong here, where it was the only centred thing in the section. */}
          <p className="wayout__fine" style={{ marginTop: 18, textAlign: 'left' }}>
            <Link to={`${WAYOUT_BASE}/stuck`}>All {SITUATIONS.length} situations →</Link>
          </p>
        </section>

        {/* ⭐⭐ THE DIFFERENCE, STATED AS THINGS IT REFUSES TO DO. Every one of
            these is a guard that actually exists in the code — the figure check,
            the cut list, the gates. Claims a competitor could copy into their
            copy but not into their product. */}
        <section>
          <h2 className="wayout__pitchh">Advice is cheap. Order is the hard part.</h2>
          <p className="wayout__pitchlead">
            You’ve already been told to budget, hustle and be patient. None of that
            tells you what to do on Saturday morning.
          </p>
          <div className="wayout__three">
            <div>
              <h3>Your numbers. Not averages.</h3>
              <p>
                Every figure in your plan is one you gave us, or worked out from them.
                Where something isn’t known it says so and tells you who would
                know — it won’t fill the gap with a guess.
              </p>
            </div>
            <div>
              <h3>It crosses things off.</h3>
              <p>
                It names what you should <b>not</b> do right now, and why. Everything
                else only ever adds to your list — which is how you ended up with
                three options and no first step.
              </p>
            </div>
            <div>
              <h3>One thing at a time.</h3>
              <p>
                Each move says what has to be true before the next one starts, so you
                always know whether you’re ready — instead of half-doing all
                three and finishing none.
              </p>
            </div>
          </div>
        </section>

        {/* ⚠️ THE OFFER, PLAINLY. It was a 30-word sentence in small grey type
            under the button, explaining a pricing model before anyone knew what
            the product was.

            🔴 AND IT MUST DERIVE FROM `WAYOUT_PAYMENTS_LIVE` LIKE EVERYTHING
            ELSE. My first version hardcoded the price, so the hero said "nothing
            to pay, at the end or anywhere else" and this block advertised $29 a
            month — two offers on one page, 900px apart. That is exactly the
            failure caught on Eliv8's /pricing, where a "14-day free trial" badge
            sat above "free while in private pilot" and a button read "Start
            14-day free trial — free". One flag, one offer. */}
        <section>
          <h2 className="wayout__pitchh">
            {WAYOUT_PAYMENTS_LIVE ? 'The plan is free. Keep it either way.' : 'All of it is free right now.'}
          </h2>

          <div className="wayout__deal">
            <div>
              <span className="wayout__dealtag">Free — no account</span>
              <h3>The questions, then your plan</h3>
              <p>
                Six taps name your direction in three minutes. The questions after
                that build the plan — three moves in the order they work, what each is
                worth in your own figures, and what to ignore. Yours to keep, and we
                don’t ask for a card to see any of it.
              </p>
            </div>
            <div>
              {/* ⚠️ SAID "FREE" THREE TIMES IN ONE CARD — the section heading, this
                  label, and again in the body. Once is the offer; three times
                  reads as protesting. The label now says what the thing IS. */}
              <span className={`wayout__dealtag${WAYOUT_PAYMENTS_LIVE ? ' wayout__dealtag--paid' : ''}`}>
                {WAYOUT_PAYMENTS_LIVE ? `${WAYOUT_PRICE_FULL} — only if you want it` : 'The paid half, later'}
              </span>
              <h3>The step-by-step guide</h3>
              <p>
                {walksWithYouLine()}{' '}
                {WAYOUT_PAYMENTS_LIVE
                  ? <><b>Stop any month.</b> Nothing is locked behind it that you were promised free.</>
                  /* ⚠️ DELIBERATELY NOT A GRANDFATHERING PROMISE. An earlier
                     draft said "not for anyone using it now", which commits
                     Daniel to free-for-life for every early user — his call to
                     make, not copy's. */
                  : <><b>You will know well before that changes.</b></>}
              </p>
            </div>
          </div>
          {/* ⚠️ MOVED. This was the section's LEAD, so the block about the offer
              opened on a legal disclaimer — which reads as though the disclaimer
              is the point. It is fine print, so it sits where fine print sits.
              🔴 And naming the thing accurately is all copy can do: the terms are
              unwritten and Eliv8 Inc. does not exist, so Sarlia is currently the
              only entity between Daniel and a user. docs/wayout-before-launch.md */}
          <p className="wayout__disclaimer" style={{ marginTop: 20 }}>
            Both are general information about how these decisions work — not
            financial, legal or tax advice, and not a substitute for someone who
            knows your full situation.
          </p>
        </section>

        <section className="wayout__close">
          <h2 className="wayout__pitchh">You know your situation.</h2>
          <p className="wayout__pitchlead">
            {/* 🔴 THIS PROMISED A PLAN IN THREE MINUTES AND THREE MINUTES DOES NOT
                BUY ONE. Six taps name which of four ways out is yours; the plan
                itself is the questions after that. Since the two halves became one
                flow, saying "six questions, three minutes" described the front
                door as though it were the whole house — and the first thing that
                happens to somebody who believes it is that they feel misled at
                minute four, which is the one thing this product cannot afford. */}
            Three minutes tells you which way. The plan itself takes about fifteen more —
            and every answer you have already given carries over.
          </p>
          <Link className="wayout__btn" to={`${WAYOUT_BASE}/start`}>Start with three minutes</Link>
          <p className="wayout__fine" style={{ marginTop: 14 }}>{priceLine()}</p>
        </section>
      </div>
    </div>
  )
}
