import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { WAYOUT_NAME, WAYOUT_NAME_TITLE, WAYOUT_TAGLINE, WAYOUT_BASE } from '../../lib/wayout/brand'
import { priceLine } from '../../lib/wayout/pricing'
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
        <meta name="robots" content="noindex, nofollow" />
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

          <p className="wayout__herolead">
            Six honest questions, and the one thing nobody tells you: which of
            them is first, and what to ignore.
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

          <p className="wayout__herocut">
            <s>A side business.</s> <s>Selling the house.</s> — crossed off, with the reason.
          </p>
        </div>
      </div>
    </div>
  )
}
