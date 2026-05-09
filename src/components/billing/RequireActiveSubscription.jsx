import { Outlet } from 'react-router-dom'
import { useSubscription } from '../../hooks/useSubscription'
import Paywall from './Paywall'

/**
 * RequireActiveSubscription — layout route guard for tool pages.
 *
 * Put this inside App.jsx as a wrapping layout route:
 *   <Route element={<RequireActiveSubscription />}>
 *     <Route path="/tools/*" element={<...>} />
 *   </Route>
 *
 * When access is granted (paid plan OR unexpired trial), renders <Outlet />
 * so the nested tool route takes over. When denied, renders <Paywall /> in
 * place of the tool body — the URL stays at /tools/hiring (or wherever)
 * rather than redirecting, so bookmarks survive and the user immediately
 * understands which tool they were trying to reach.
 *
 * Loading state: renders a lightweight skeleton rather than a full-page
 * spinner. By the time this mounts, RequireAuth upstream has already
 * finished loading, so we're only waiting on the subscription fetch —
 * usually a few hundred ms. A spinner here would feel heavier than the
 * actual wait.
 *
 * Composition order in App.jsx:
 *   RequireAuth (session + profile)
 *     └─ AppLayout (sidebar + outlet)
 *         └─ RequireActiveSubscription (this)
 *             └─ Tool route
 *
 * This is deliberately a sibling to role-gating (RequireRole). A user can
 * have an active sub AND be locked out of /tools/cfo because of their role —
 * both gates run, both must pass.
 */
export default function RequireActiveSubscription() {
  const { loading, hasAccess } = useSubscription()

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="h-32 w-full bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!hasAccess) return <Paywall />
  return <Outlet />
}
