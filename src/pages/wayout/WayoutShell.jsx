import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { clearDraft } from '../../lib/wayout/draft'
import { WAYOUT_NAME, WAYOUT_NAME_TITLE, WAYOUT_TAGLINE, WAYOUT_SITE_URL, WAYOUT_BASE, WAYOUT_HOME, canonicalUrl } from '../../lib/wayout/brand'
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
export default function WayoutShell({
  children, count, title, noindex = true, wide = false, canonicalPath = '', signIn = false,
  home = false,
}) {
  /**
   * ⚠️ READ ONCE, NOT SUBSCRIBED. This is only deciding whether to draw a link,
   * so it does not need to follow every auth event — and `useAuth` is Eliv8's
   * context, which this product deliberately does not mount.
   */
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(Boolean(data?.session))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="wayout">
      <Helmet>
        <title>{title ? `${title} — ${WAYOUT_NAME_TITLE}` : `${WAYOUT_NAME_TITLE} — ${WAYOUT_TAGLINE}`}</title>
        <meta name="description" content={WAYOUT_TAGLINE} />
        {noindex && <meta name="robots" content="noindex, nofollow" />}
        {/* 🔴 THE INHERITED CANONICAL POINTED AT THE ELIV8 HOMEPAGE. index.html
            carries `<link rel="canonical" href="https://eliv8os.com/">`, so
            every Unstuck Map page was telling search engines it was a duplicate
            of a B2B contractor advisor's front page. Nothing was indexed yet —
            noindex was still on — so it cost nothing, but it would have sent
            every scrap of authority to the wrong product the moment it came
            off.
            ⚠️ And the SAME page serves from both eliv8os.com/wayout/* and
            getunstuckmap.com/wayout/*, which is the duplicate-content shape
            that cost leadeos.com. The canonical names ONE of them. */}
        <link rel="canonical" href={canonicalUrl(canonicalPath)} />
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
          {/* 🔴 THE WORDMARK WAS NOT A LINK ON ANY SCREEN IN THIS PRODUCT, so a
              public page had no route back to the front door at all. Daniel,
              on a /stuck page: "there is no back button on any of these to the
              homepage." Somebody arriving from an assistant — which is the only
              channel that has ever brought this product a stranger — reads the
              answer and then has nowhere to go but the back button.

              ⚠️ ONLY WHERE LEAVING IS A REASONABLE THING TO OFFER. On the
              intake, the plan or a play, a link out of the flow is an exit sign
              beside the work, which is the same reason `signIn` is not drawn
              there either. Those screens carry their own crumb to the plan.
              ⭐ WAYOUT_HOME, not a literal: it is `/` on this product's own
              domain and `/wayout/hello` under the Eliv8 prefix. */}
          <i />
          {/* ⚠️ The name comes from brand.js and nowhere else. */}
          {home
            ? <Link className="wayout__brandhome" to={WAYOUT_HOME}>{WAYOUT_NAME}</Link>
            : WAYOUT_NAME}
          {count && <span className="wayout__count">{count}</span>}
          {/* 🔴 THERE WAS NO WAY BACK IN. Daniel: "do we have a log in section yet
              for once people sign up?" /wayout/enter has existed the whole time —
              it is where RequireWayout sends anybody without a session — but NOT
              ONE PUBLIC PAGE LINKED TO IT. Somebody who made an account, closed
              the tab and came back to the domain had no route to their own plan
              except guessing a URL.
              ⚠️ Deliberately quiet, and never on the plan itself: on the pages
              where somebody is mid-flow it would be an exit sign beside the work,
              and anyone already signed in does not need it. */}
          {signIn && !signedIn && (
            <Link className="wayout__signin" to={`${WAYOUT_BASE}/enter?in=1`}>
              Already started? Sign in
            </Link>
          )}

          {/* 🔴🔴 THERE WAS NO WAY OUT OF THIS PRODUCT AT ALL. Daniel, about to
              hand it to people: "so if i ask someone tests this out they will see
              what i wrote down?"

              The database answer is no — `wayout_sessions` is RLS-scoped to
              `auth.uid() = user_id`, so another account cannot read a word of
              his. ⭐⭐ THE BROWSER ANSWER WAS YES, AND THAT IS THE ONE THAT
              MATTERS ON A SHARED LAPTOP: the session persists, the local draft
              (`wayout:draft`) is not user-scoped, and this product had NO sign
              out anywhere — the only ones in the codebase are Eliv8's sidebar,
              which nobody here ever sees. Handing somebody your laptop meant
              handing them your plan.

              ⚠️ It clears the DRAFT as well as the session. Signing out while
              leaving an anonymous draft in localStorage would leave the next
              person answering into your half-finished form. */}
          {signedIn && (
            <button
              type="button"
              className="wayout__signout"
              onClick={async () => {
                clearDraft()
                await supabase.auth.signOut()
                window.location.assign(WAYOUT_BASE || '/')
              }}
            >
              Sign out
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
