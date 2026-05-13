import Sidebar       from './Sidebar'
import MobileNav     from './MobileNav'
import AdvisorBanner from './AdvisorBanner'
import TrialBanner   from '../billing/TrialBanner'

/**
 * AppLayoutChrome — sidebar + mobile nav + banners + content slot.
 *
 * Extracted from App.jsx so it can be lazy-loaded along with the entire
 * authenticated app surface. A logged-out visitor on /, /pricing, or any
 * marketing page never downloads this (or the Sidebar/MobileNav data
 * dependencies, which transitively pull in zustand stores, Supabase
 * queries, etc.).
 *
 * Render contract:
 *   <AppLayoutChrome>{routeOutlet}</AppLayoutChrome>
 *
 * The route outlet is passed as children rather than rendered via
 * <Outlet />, because <Outlet /> only works when this component is used
 * as a Route element. App.jsx wraps it in a Suspense boundary and a
 * RequireAuth guard, so children = <Outlet /> at the call site.
 */
export default function AppLayoutChrome({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar + bottom tab bar + slide-in drawer */}
        <MobileNav />

        <main className="flex-1 overflow-y-auto bg-ink-50 flex flex-col">
          {/* AdvisorBanner shows a gold strip when an advisor is viewing a
              client workspace. Hidden for regular owners. */}
          <AdvisorBanner />
          {/* TrialBanner self-hides unless the user is in the last 3 days
              of their trial with no paid sub. */}
          <TrialBanner />
          <div className="flex-1 pb-16 lg:pb-0">
            {/* pb-16 reserves space for the mobile bottom tab bar */}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
