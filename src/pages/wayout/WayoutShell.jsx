import { Helmet } from 'react-helmet-async'
import { WAYOUT_NAME, WAYOUT_NAME_TITLE, WAYOUT_TAGLINE, WAYOUT_SITE_URL } from '../../lib/wayout/brand'
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
        {/* ⭐⭐ THE LINK PREVIEW MUST NOT SAY ELIV8 OS. index.html carries a full
            set of Open Graph tags for the other product, and Helmet only
            manages what it DECLARES — so without these, texting somebody
            getunstuckmap.com previews as "Eliv8 OS — an advisor for owners who
            care how it's run", with Eliv8's description and Eliv8's image.
            That is the exact confusion a separate name exists to prevent, and
            it lands before anybody has clicked anything.
            ⚠️ og:url is the OWN domain, not the path this happens to be served
            from today. A preview that links back to eliv8os.com undoes the
            rest of it. */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={WAYOUT_NAME_TITLE} />
        <meta property="og:url" content={WAYOUT_SITE_URL} />
        <meta property="og:title" content={title ? `${title} — ${WAYOUT_NAME_TITLE}` : `${WAYOUT_NAME_TITLE} — ${WAYOUT_TAGLINE}`} />
        <meta property="og:description" content={WAYOUT_TAGLINE} />
        <meta property="og:image" content={`${WAYOUT_SITE_URL}/unstuckmap-og.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={WAYOUT_SITE_URL} />
        <meta name="twitter:title" content={title ? `${title} — ${WAYOUT_NAME_TITLE}` : `${WAYOUT_NAME_TITLE} — ${WAYOUT_TAGLINE}`} />
        <meta name="twitter:description" content={WAYOUT_TAGLINE} />
        <meta name="twitter:image" content={`${WAYOUT_SITE_URL}/unstuckmap-og.png`} />
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
