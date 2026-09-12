import { Helmet } from 'react-helmet-async'
import { WAYOUT_NAME, WAYOUT_NAME_TITLE, WAYOUT_TAGLINE } from '../../lib/wayout/brand'
import './wayout.css'

/**
 * The frame every way-out screen sits in.
 *
 * ⭐ THE FONTS LOAD HERE, NOT IN index.html.
 * Figtree and Caveat belong to this product alone. Putting them in the global
 * <head> would add two font families to the first paint of every Eliv8 OS
 * marketing page — the pages the entire findability strategy depends on — for
 * visitors who will never see this product. Loading them from the route means
 * the cost lands only on the people looking at it.
 *
 * ⚠️ `display=swap` is deliberate: text renders immediately in the fallback and
 * reflows when Figtree arrives. The alternative is a blank screen on a slow
 * connection, and the first thing this product says is "you're not stuck" —
 * showing that late is worse than showing it in the wrong typeface.
 *
 * ⚠️ `noindex` while the name is unsettled. These URLs use the internal slug
 * and the product has no name; letting Google index /wayout now means the
 * rename later orphans whatever it learned, and a half-built paid product in
 * search results is worse than none. Remove the tag deliberately at launch —
 * and add the routes to scripts/sitemap.mjs in the same commit, or they will
 * be orphaned the way the answer pages were.
 */
export default function WayoutShell({ children, count, title, noindex = true, wide = false }) {
  return (
    <div className="wayout">
      <Helmet>
        <title>{title ? `${title} — ${WAYOUT_NAME_TITLE}` : `${WAYOUT_NAME_TITLE} — ${WAYOUT_TAGLINE}`}</title>
        <meta name="description" content={WAYOUT_TAGLINE} />
        {noindex && <meta name="robots" content="noindex, nofollow" />}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;700;800&family=Caveat:wght@700&display=swap"
        />
      </Helmet>

      {/* `wide` is for the MAP only. An intake screen asks one question and the
          narrow column is the point — widening it would put a second question
          in the corner of someone's eye while they answer the first. The map
          is a deliverable, not a question, so it earns the width. */}
      <div className={`wayout__frame${wide ? ' wayout__frame--wide' : ''}`}>
        <div className="wayout__brand">
          <i />
          {/* ⚠️ The name comes from brand.js and nowhere else. */}
          {WAYOUT_NAME}
          {count && <span className="wayout__count">{count}</span>}
        </div>
        {children}
      </div>
    </div>
  )
}
