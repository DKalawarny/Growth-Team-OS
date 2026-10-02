import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { WAYOUT_BASE, WAYOUT_HOME } from '../../lib/wayout/brand'

/**
 * ⭐ A PAGE THAT SAYS IT IS NOT HERE.
 * 🔴 1 Oct audit: every unknown address on getunstuckmap.com quietly became the
 * home page, and an unknown situation became the index — so a mistyped shared
 * link changed page with no explanation, and search engines saw soft 404s.
 * ⚠️ noindex: a missing page is never something to rank.
 */
export default function WayoutNotFound({ what = 'page' }) {
  return (
    <WayoutShell title="Not found" home>
      <p className="wayout__q">That {what} is not here.</p>
      <p className="wayout__lead">
        The link may be old or mistyped. Everything else is where it was.
      </p>
      <Link className="wayout__btn" to={WAYOUT_HOME}>Go to the start</Link>
      <p className="wayout__fine" style={{ marginTop: 14 }}>
        Or read <Link to={`${WAYOUT_BASE}/stuck`}>the situations people get stuck in</Link>.
      </p>
    </WayoutShell>
  )
}
