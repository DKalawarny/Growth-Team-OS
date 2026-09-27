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
          <div className="wayout__brand"><i />{WAYOUT_NAME}</div>

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
            <p className="wayout__fine">The first three minutes are free and need no account. {priceLine()}</p>
          </div>
        </div>

        {/* ⚠️ aria-hidden: it is an illustration of the deliverable, and a screen
            reader working through a sample plan before reaching the actual
            proposition would be worse than skipping it. The copy above carries
            the meaning. */}
        <div className="wayout__heroplan" aria-hidden="true">
          <div className="wayout__brand"><i />your plan</div>
          <p className="wayout__who">Marcus, 52. Two kids at home.</p>
          <h2>
            Four days a week by March. <mark>You can already afford it.</mark>
          </h2>

          <div className="wayout__stats">
            <div className="wayout__stat">
              <span>What your life costs</span><b>$4,100</b>
            </div>
            <div className="wayout__stat">
              <span>The day costs</span><b>$1,580</b>
            </div>
          </div>

          <h3 className="wayout__label">Three moves. This order.</h3>
          {[
            ['Work out what your life actually costs', 'One evening.', true],
            ['Show Jen the number first', 'Next week.', false],
            ['Ask for the four-day week', 'March.', false],
          ].map(([title, when, now]) => (
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

          {/* ⭐⭐ THE CUT LIST IS THE DIFFERENTIATOR AND IT BELONGS ON THE FRONT
              DOOR. Every other source of advice only ever adds to somebody's
              list; this is the one that takes things off it, with the reason. */}
          <p className="wayout__herocut">
            <b>Crossed off, with the reason</b>
            {/* ⚠️ The OPTION is struck, the REASON is not — striking both made
                the reason unreadable, and the reason is the useful half. Same
                split as the real plan's cut list: `label` then `why`. */}
            <span><s>A side business</s> — not enough hours in your week.</span>
            <span><s>Selling the house</s> — it does not clear enough to matter.</span>
          </p>
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
          <h2 className="wayout__pitchh">It is never just “stuck”.</h2>
          <p className="wayout__pitchlead">
            It is a house with debt against it. A job that pays more than the next
            one would. A year of night shifts you cannot see the end of. Straight
            answers to the specific ones, free to read:
          </p>
          <div className="wayout__board">
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
          <p className="wayout__fine" style={{ marginTop: 18 }}>
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
            You have already been told to budget, hustle and be patient. None of
            that says which thing to do on Saturday.
          </p>
          <div className="wayout__three">
            <div>
              <h3>Your numbers. Not averages.</h3>
              <p>
                Every figure in your plan is one you gave us, or one worked out
                from them. Where something is unknown it says so and tells you who
                would know — it does not fill the gap with a guess.
              </p>
            </div>
            <div>
              <h3>It crosses things off.</h3>
              <p>
                The plan names what you should <b>not</b> do right now, and why.
                Most advice only ever adds to your list, which is how you ended up
                with three options and no first step.
              </p>
            </div>
            <div>
              <h3>One thing at a time.</h3>
              <p>
                Each move says what has to be true before the next one starts. So
                you always know whether you are ready, instead of guessing and
                stalling on all three at once.
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
              <h3>Six questions, then your plan</h3>
              <p>
                Three moves in the order they work, what each one is worth in your
                own figures, and what to ignore. Yours to keep, and we do not ask
                for a card to see it.
              </p>
            </div>
            <div>
              <span className={`wayout__dealtag${WAYOUT_PAYMENTS_LIVE ? ' wayout__dealtag--paid' : ''}`}>
                {WAYOUT_PAYMENTS_LIVE ? `${WAYOUT_PRICE_FULL} — only if you want it` : 'Also free while we are new'}
              </span>
              <h3>Having it walked with you</h3>
              <p>
                {walksWithYouLine()}{' '}
                {WAYOUT_PAYMENTS_LIVE
                  ? <><b>Stop any month.</b> Nothing is locked behind it that you were promised free.</>
                  /* ⚠️ DELIBERATELY NOT A GRANDFATHERING PROMISE. An earlier
                     draft said "not for anyone using it now", which commits
                     Daniel to free-for-life for every early user — his call to
                     make, not copy's. This says what is true today and that
                     nobody will be surprised. */
                  : <>Free while we are this new. <b>You will know well before that changes.</b></>}
              </p>
            </div>
          </div>
        </section>

        <section className="wayout__close">
          <h2 className="wayout__pitchh">You know your situation.</h2>
          <p className="wayout__pitchlead">
            Three minutes, six questions, and something you can act on this week.
          </p>
          <Link className="wayout__btn" to={`${WAYOUT_BASE}/start`}>Start with three minutes</Link>
          <p className="wayout__fine" style={{ marginTop: 14 }}>{priceLine()}</p>
        </section>
      </div>
    </div>
  )
}
