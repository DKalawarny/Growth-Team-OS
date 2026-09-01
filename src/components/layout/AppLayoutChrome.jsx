import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
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
  // ⚠️ 1 Sep — navigating between app pages left you wherever you had scrolled
  // to on the PREVIOUS page. Open a long tool, scroll to the bottom, click
  // Roadmap, and you land halfway down it. Daniel hit it on /tools/exit-
  // readiness and asked for every page to be checked.
  //
  // ⚠️ window.scrollTo() does NOT fix this and would have looked like it did
  // nothing: the app does not scroll the window at all. <main> below is
  // `overflow-y-auto` inside a `h-screen overflow-hidden` shell, so the
  // scrollable element is that container and it is the thing that has to be
  // reset. (Public marketing pages DO scroll the window — they are handled
  // separately in App.jsx, since they never render this component.)
  //
  // Keyed on pathname only, deliberately. Search params drive tabs and filters
  // on several pages; yanking someone to the top when they switch a filter is
  // its own bug.
  const scrollRef = useRef(null)
  const { pathname } = useLocation()
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar + bottom tab bar + slide-in drawer */}
        <MobileNav />

        <main ref={scrollRef} className="flex-1 overflow-y-auto bg-ink-50 flex flex-col">
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
