import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Sidebar        from './components/layout/Sidebar'
import MobileNav      from './components/layout/MobileNav'
import AdvisorBanner  from './components/layout/AdvisorBanner'
import RequireActiveSubscription from './components/billing/RequireActiveSubscription'
import TrialBanner    from './components/billing/TrialBanner'

import Landing        from './pages/Landing'
import Pricing        from './pages/Pricing'
import Login          from './pages/Login'
import Signup         from './pages/Signup'
import Onboarding     from './pages/Onboarding'
import Dashboard      from './pages/Dashboard'
import Roadmap        from './pages/Roadmap'
import Advisor        from './pages/Advisor'
import Checkins       from './pages/Checkins'
import Documents      from './pages/Documents'
import Calendar       from './pages/Calendar'
import Settings       from './pages/Settings'
import Invite         from './pages/Invite'
import AdvisorPortal  from './pages/AdvisorPortal'
import Trajectories   from './pages/Trajectories'
import Board          from './pages/Board'
import AdminBackfill  from './pages/AdminBackfill'
import AdminReview    from './pages/AdminReview'
import Analytics      from './pages/Analytics'

import ToolsIndex    from './pages/tools/Index'
import GBP           from './pages/tools/GBP'
import ExitReadiness from './pages/tools/ExitReadiness'
import Hiring        from './pages/tools/Hiring'
import OfferBuilder  from './pages/tools/OfferBuilder'
import CashFlow      from './pages/tools/CashFlow'
import Safety        from './pages/tools/Safety'
import CFO           from './pages/tools/CFO'
import L10           from './pages/tools/L10'
import OrgChart      from './pages/tools/OrgChart'
import Rocks         from './pages/tools/Rocks'
import Newsletter    from './pages/tools/Newsletter'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppLayout() {
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
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function RequireAuth({ children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/onboarding" replace />
  return children
}

function RequireSession({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function RedirectIfAuthed({ children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session && profile) return <Navigate to="/dashboard" replace />
  return children
}

/**
 * Gate a subtree on profile.role. Use inside RequireAuth.
 *   <RequireRole allow={['owner', 'admin', 'cfo']}><CFO /></RequireRole>
 * Non-matching roles fall back to the dashboard rather than the login
 * screen — the user is authenticated, they just can't see this page.
 */
function RequireRole({ allow, children }) {
  const { role, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public marketing routes — accessible to everyone. Landing redirects
            authed users straight to /dashboard so owners don't see marketing
            chrome on their own domain. Pricing stays public always — an owner
            revisiting it to share with a partner is a feature. */}
        <Route path="/"        element={<RedirectIfAuthed><Landing /></RedirectIfAuthed>} />
        <Route path="/pricing" element={<Pricing />} />

        {/* Public auth routes */}
        <Route path="/login"  element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
        <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />

        {/* Advisor invite — public (auth is handled inline on the page) */}
        <Route path="/invite/:token" element={<Invite />} />

        {/* Advisor portal — requires session but NOT a company profile.
            Advisors who signed up via invite may not own a company. */}
        <Route path="/advisor-portal" element={<RequireSession><AdvisorPortal /></RequireSession>} />

        {/* Needs session but no profile check (new user) */}
        <Route path="/onboarding" element={<RequireSession><Onboarding /></RequireSession>} />

        {/* Protected app routes — sidebar layout.
            Non-tool routes (dashboard, settings, etc.) are always reachable
            so a user can manage billing + see their content even with no
            active sub. Tool routes are gated below. */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/roadmap"    element={<Roadmap />} />
          <Route path="/advisor"    element={<Advisor />} />
          <Route path="/checkins"   element={<Checkins />} />
          <Route path="/documents"  element={<Documents />} />
          <Route path="/calendar"      element={<Calendar />} />
          <Route path="/trajectories" element={<Trajectories />} />
          <Route path="/board"        element={<Board />} />
          <Route path="/settings"     element={<Settings />} />
          <Route path="/analytics"    element={<Analytics />} />

          {/* Paywalled subtree. The guard renders <Paywall /> inline (not
              a redirect) when !hasAccess, so the URL stays put and the
              user can see which tool they hit. RequireRole still composes
              for role-gated tools (CFO) — both guards run. */}
          <Route element={<RequireActiveSubscription />}>
            <Route path="/tools"                element={<ToolsIndex />} />
            <Route path="/tools/gbp"            element={<GBP />} />
            <Route path="/tools/exit-readiness" element={<ExitReadiness />} />
            <Route path="/tools/hiring"         element={<Hiring />} />
            <Route path="/tools/offer-builder"  element={<OfferBuilder />} />
            <Route path="/tools/cash-flow"      element={<CashFlow />} />
            <Route path="/tools/safety"         element={<Safety />} />
            <Route path="/tools/cfo"            element={<RequireRole allow={['owner', 'admin', 'cfo']}><CFO /></RequireRole>} />
            <Route path="/tools/l10"            element={<L10 />} />
            <Route path="/tools/org-chart"      element={<OrgChart />} />
            <Route path="/tools/rocks"          element={<Rocks />} />
            <Route path="/tools/newsletter"     element={<Newsletter />} />
          </Route>
        </Route>

        {/* Fallback */}
        {/* Admin utilities — require auth but bypass subscription/role checks.
            AdminReview self-gates on email match, so RequireSession (no profile
            check) is enough to keep it out of the normal user flow. */}
        <Route path="/admin/backfill" element={<RequireAuth><AdminBackfill /></RequireAuth>} />
        <Route path="/admin/review"   element={<RequireSession><AdminReview /></RequireSession>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
