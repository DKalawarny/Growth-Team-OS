import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

// Landing stays synchronous — it's the most common entry point and we want
// the fastest possible first paint. Every other page is lazy-loaded so a
// visitor hitting / doesn't pull down the dashboard, pdf.worker (~2 MB),
// xlsx, or the Anthropic SDK before they've even seen the hero. Each lazy
// chunk also caches independently, so a returning user navigating between
// marketing pages only pays the cost of routes they hadn't seen yet.
import Landing from './pages/Landing'

// ── Lazy: marketing pages ──────────────────────────────────────────────────
// Small individually, but pulling them out of the main chunk also pulls out
// every shared component they reference (PublicHeader, etc).
const Pricing       = lazy(() => import('./pages/Pricing'))
const CRMMarketing  = lazy(() => import('./pages/marketing/CRM'))
const About         = lazy(() => import('./pages/marketing/About'))
const Security      = lazy(() => import('./pages/marketing/Security'))
const Privacy       = lazy(() => import('./pages/marketing/Privacy'))
const Comparison    = lazy(() => import('./pages/marketing/Comparison'))
const TradePage     = lazy(() => import('./pages/marketing/TradePage'))
const FreeGbpAudit  = lazy(() => import('./pages/marketing/FreeGbpAudit'))
const Login         = lazy(() => import('./pages/Login'))
const Signup        = lazy(() => import('./pages/Signup'))

// ── Lazy: authed app shell + chrome ────────────────────────────────────────
// Sidebar, MobileNav, AdvisorBanner, TrialBanner all only matter inside the
// app — keeping them lazy means a logged-out visitor never downloads them.
const AppLayoutChrome = lazy(() => import('./components/layout/AppLayoutChrome'))

// ── Lazy: authed pages ─────────────────────────────────────────────────────
const Onboarding     = lazy(() => import('./pages/Onboarding'))
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const Roadmap        = lazy(() => import('./pages/Roadmap'))
const Advisor        = lazy(() => import('./pages/Advisor'))
const Checkins       = lazy(() => import('./pages/Checkins'))
const Documents      = lazy(() => import('./pages/Documents'))
const Calendar       = lazy(() => import('./pages/Calendar'))
const SettingsLayout       = lazy(() => import('./pages/settings/SettingsLayout'))
const BusinessSettings     = lazy(() => import('./pages/settings/BusinessSettings'))
const BillingSettings      = lazy(() => import('./pages/settings/BillingSettings'))
const TeamSettings         = lazy(() => import('./pages/settings/TeamSettings'))
const IntegrationsSettings = lazy(() => import('./pages/settings/IntegrationsSettings'))
const DangerSettings       = lazy(() => import('./pages/settings/DangerSettings'))
const Help                 = lazy(() => import('./pages/Help'))
const Invite         = lazy(() => import('./pages/Invite'))
const StaffPortal    = lazy(() => import('./pages/StaffPortal'))
const AdvisorPortal  = lazy(() => import('./pages/AdvisorPortal'))
const Trajectories   = lazy(() => import('./pages/Trajectories'))
const Board          = lazy(() => import('./pages/Board'))
const Playbooks      = lazy(() => import('./pages/Playbooks'))
const AdminBackfill  = lazy(() => import('./pages/AdminBackfill'))
const AdminReview    = lazy(() => import('./pages/AdminReview'))
const Analytics      = lazy(() => import('./pages/Analytics'))

// ── Lazy: tools (each is its own chunk — heavy by design) ──────────────────
const ToolsIndex         = lazy(() => import('./pages/tools/Index'))
const GBP                = lazy(() => import('./pages/tools/GBP'))
const ExitReadiness      = lazy(() => import('./pages/tools/ExitReadiness'))
const Hiring             = lazy(() => import('./pages/tools/Hiring'))
const OfferBuilder       = lazy(() => import('./pages/tools/OfferBuilder'))
const CashFlow           = lazy(() => import('./pages/tools/CashFlow'))
const Safety             = lazy(() => import('./pages/tools/Safety'))
const CFO                = lazy(() => import('./pages/tools/CFO'))
const L10                = lazy(() => import('./pages/tools/L10'))
const OrgChart           = lazy(() => import('./pages/tools/OrgChart'))
const Rocks              = lazy(() => import('./pages/tools/Rocks'))
const Newsletter         = lazy(() => import('./pages/tools/Newsletter'))
const PipelineToHire     = lazy(() => import('./pages/tools/PipelineToHire'))
const EstimatorScorecard = lazy(() => import('./pages/tools/EstimatorScorecard'))
const ForemanScorecard   = lazy(() => import('./pages/tools/ForemanScorecard'))
const JobAutopsy         = lazy(() => import('./pages/tools/JobAutopsy'))

// Eager imports that are tiny and used by every authed render — leaving these
// in the main chunk would only matter if logged-out users hit the app, which
// the route guards prevent.
import RequireActiveSubscription from './components/billing/RequireActiveSubscription'
import ErrorBoundary from './components/ErrorBoundary'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppLayoutChrome>
        <Outlet />
      </AppLayoutChrome>
    </Suspense>
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

/**
 * Suspense wrapper for any single lazy route. Keeps the spinner consistent.
 * Public marketing pages get their own boundary so a slow Pricing chunk
 * doesn't blank out a fast Landing on tab switch (Landing is sync anyway,
 * but the principle generalizes if we ever lazy-load it).
 */
function LazyRoute({ children }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      {/* ErrorBoundary lives INSIDE BrowserRouter so its "Go to dashboard"
          fallback can rely on the router being mounted. A render-time throw
          anywhere below this — in a page, a tool, a Suspense fallback —
          gets caught and replaced with the friendly fallback, instead of
          unmounting the entire tree and leaving a blank white page. */}
      <ErrorBoundary>
      <Routes>
        {/* Public marketing routes — accessible to everyone. Landing redirects
            authed users straight to /dashboard so owners don't see marketing
            chrome on their own domain. Pricing stays public always — an owner
            revisiting it to share with a partner is a feature. */}
        <Route path="/"         element={<RedirectIfAuthed><Landing /></RedirectIfAuthed>} />
        <Route path="/pricing"  element={<LazyRoute><Pricing /></LazyRoute>} />
        <Route path="/crm"      element={<LazyRoute><CRMMarketing /></LazyRoute>} />
        <Route path="/about"    element={<LazyRoute><About /></LazyRoute>} />
        <Route path="/security" element={<LazyRoute><Security /></LazyRoute>} />
        <Route path="/privacy"  element={<LazyRoute><Privacy /></LazyRoute>} />

        {/* Comparison pages — same component, slug-driven */}
        <Route path="/vs/:competitor" element={<LazyRoute><Comparison /></LazyRoute>} />

        {/* Trade-specific pages — same component, slug-driven */}
        <Route path="/for/:trade" element={<LazyRoute><TradePage /></LazyRoute>} />

        {/* Free-tool lead magnet */}
        <Route path="/free-gbp-audit" element={<LazyRoute><FreeGbpAudit /></LazyRoute>} />

        {/* Public auth routes */}
        <Route path="/login"  element={<LazyRoute><RedirectIfAuthed><Login /></RedirectIfAuthed></LazyRoute>} />
        <Route path="/signup" element={<LazyRoute><RedirectIfAuthed><Signup /></RedirectIfAuthed></LazyRoute>} />

        {/* Advisor invite — public (auth is handled inline on the page) */}
        <Route path="/invite/:token" element={<LazyRoute><Invite /></LazyRoute>} />

        {/* Staff magic-link portal — fully public. Auth is the HMAC-signed
            token in the URL, verified server-side by the staff-portal Edge
            Function. Field crew open this from an email on their phone, so
            no Supabase session exists or is required. */}
        <Route path="/staff/:token" element={<LazyRoute><StaffPortal /></LazyRoute>} />

        {/* Advisor portal — requires session but NOT a company profile.
            Advisors who signed up via invite may not own a company. */}
        <Route path="/advisor-portal" element={<LazyRoute><RequireSession><AdvisorPortal /></RequireSession></LazyRoute>} />

        {/* Needs session but no profile check (new user) */}
        <Route path="/onboarding" element={<LazyRoute><RequireSession><Onboarding /></RequireSession></LazyRoute>} />

        {/* Protected app routes — sidebar layout.
            Non-tool routes (dashboard, settings, etc.) are always reachable
            so a user can manage billing + see their content even with no
            active sub. Tool routes are gated below. */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/roadmap"      element={<Roadmap />} />
          <Route path="/advisor"      element={<Advisor />} />
          <Route path="/checkins"     element={<Checkins />} />
          <Route path="/documents"    element={<Documents />} />
          <Route path="/calendar"     element={<Calendar />} />
          <Route path="/trajectories" element={<Trajectories />} />
          <Route path="/board"        element={<Board />} />
          <Route path="/playbooks"    element={<Playbooks />} />
          <Route path="/help"         element={<Help />} />

          {/* Settings is a sub-route tree — the layout renders a left
              sub-nav and an <Outlet />. /settings redirects to the first
              real section so the URL is always specific. */}
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index                 element={<Navigate to="business" replace />} />
            <Route path="business"       element={<BusinessSettings />} />
            <Route path="billing"        element={<BillingSettings />} />
            <Route path="team"           element={<TeamSettings />} />
            <Route path="integrations"   element={<IntegrationsSettings />} />
            <Route path="danger"         element={<DangerSettings />} />
          </Route>

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
            <Route path="/tools/pipeline-to-hire"     element={<PipelineToHire />} />
            <Route path="/tools/estimator-scorecard"  element={<EstimatorScorecard />} />
            <Route path="/tools/foreman-scorecard"    element={<ForemanScorecard />} />
            <Route path="/tools/job-autopsy"          element={<JobAutopsy />} />
          </Route>
        </Route>

        {/* Admin utilities — require auth but bypass subscription/role checks.
            AdminReview self-gates on email match, so RequireSession (no profile
            check) is enough to keep it out of the normal user flow. */}
        <Route path="/admin/backfill" element={<LazyRoute><RequireAuth><AdminBackfill /></RequireAuth></LazyRoute>} />
        <Route path="/admin/review"   element={<LazyRoute><RequireSession><AdminReview /></RequireSession></LazyRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
