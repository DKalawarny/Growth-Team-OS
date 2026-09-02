import { Link } from 'react-router-dom'
import Wordmark from '../brand/Wordmark'

/**
 * Shared header for public (logged-out) pages: Landing, Pricing.
 *
 * Design notes:
 *   - Deliberately small CTA set — Log in + Start free. Anything else
 *     (features, docs) becomes a distraction on a conversion-focused page.
 *   - Wordmark links to `/` so visitors can always get home.
 *   - Not wired to auth state — logged-in visitors see the same header.
 *     That's fine: an owner sharing the pricing page with a partner
 *     shouldn't suddenly see their own app chrome bleed through.
 */
export default function PublicHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* 🔴 THIS WAS HAND-ROLLED TEXT until 29 Aug — `text-xl font-bold
            text-brand-700`, i.e. the whole wordmark in green, wrong weight, no
            tracking, and the 8 not picked out at all. Daniel spotted it on the
            live site: "not on brand".

            ⚠️ It is the SEVENTH copy of the wordmark this codebase has grown.
            The Wordmark component exists precisely because six hand-made copies
            are why the logo still said "GrowthOS" for days after the rename —
            and this one slipped through the same way. Never restate the mark in
            markup; if it needs a new size or tone, add a prop. */}
        <Link to="/" aria-label="Eliv8 OS — home">
          <Wordmark tone="light" size={19} />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {/* ⚠️ 2 Sep — /answers was ORPHANED. Nineteen prerendered pages existed
              in the sitemap and NOTHING on the site linked to them: not the
              homepage, not the footer, not one trade page. Orphaned content
              ranks badly however good it is — a crawler reaching a page only
              via the sitemap treats it as unimportant, and an assistant
              following links off the homepage never reaches it at all. This is
              the link that makes the rest of the work count. */}
          <Link to="/answers" className="text-gray-700 hover:text-gray-900 font-medium">Answers</Link>
          <Link to="/pricing" className="text-gray-700 hover:text-gray-900 font-medium">Pricing</Link>
          <Link to="/login" className="text-gray-600 hover:text-gray-900">Log in</Link>
          <Link
            to="/signup"
            className="bg-brand-600 text-white rounded-lg px-3 py-1.5 hover:bg-brand-700 transition-colors"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  )
}
