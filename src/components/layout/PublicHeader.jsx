import { Link } from 'react-router-dom'

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
        <Link to="/" className="text-xl font-bold text-brand-700">GrowthOS</Link>
        <nav className="flex items-center gap-4 text-sm">
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
