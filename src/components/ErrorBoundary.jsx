import { Component } from 'react'
import { reportError } from '../lib/monitoring'

/**
 * ErrorBoundary — catches uncaught render errors anywhere below it.
 *
 * Without this, a single throw in a child component (a `.map` on undefined,
 * a `JSON.parse` on bad data, a Claude response shape we didn't expect)
 * unmounts the entire React tree and leaves the user staring at a blank
 * white page. That's worse than any error message — they don't know if
 * the app is broken, their internet died, or they should try again.
 *
 * The boundary catches the throw, logs it (we read this from the Supabase
 * function logs / browser console while the user is still alive), and shows
 * a calm fallback that tells the user (a) what happened, (b) that we
 * captured it, (c) what to do next. The two CTAs are deliberate:
 *
 *   "Reload"  — most useful for transient state corruption (a Suspense
 *               chunk that 404'd, a localStorage value gone weird). Cheap
 *               first move and works for 90% of cases.
 *   "Go home" — when reload doesn't fix it, get them off the broken route.
 *               They can still navigate to Settings, Documents, etc. from
 *               the dashboard.
 *
 * We don't try to be too clever — no "submit a bug report" form, no
 * automatic Sentry call (we don't ship Sentry yet). The console.error +
 * the page itself is enough until someone emails support with a
 * screenshot.
 *
 * Placement: in App.jsx, wrap <Routes> so every page benefits. Wrapping
 * outside <BrowserRouter> would lose the router context and break the
 * "Go home" button.
 *
 * Class component (not hooks) because React's error-boundary API still
 * requires `componentDidCatch` / `getDerivedStateFromError`. There's no
 * hook equivalent as of React 19.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    // Run on the render phase the moment a descendant throws.
    // Return a state patch — anything non-null in `error` flips the UI
    // to the fallback on the next render.
    return { error }
  }

  componentDidCatch(error, info) {
    // Runs after the fallback has rendered. This is the telemetry point the
    // file has been pointing at since it was written — now wired.
    //
    // The console.error stays. It costs nothing when nothing is wrong, and on
    // a screen-share it is the fastest way to read a stack.
    reportError(error, { componentStack: info?.componentStack })
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] uncaught render error:', error, info?.componentStack)
  }

  handleReload = () => {
    // Hard reload — clears suspense caches, re-fetches chunks, drops any
    // corrupted in-memory state. Cheaper than a router push for the
    // "something snapped, try a fresh page" case.
    window.location.reload()
  }

  handleGoHome = () => {
    // Use a hard nav instead of router.push because (a) we're outside
    // any router hooks here, (b) we want to discard the bad render tree
    // anyway, and (c) /dashboard's RequireAuth will bounce them to
    // /login if their session expired in the meantime.
    window.location.assign('/dashboard')
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white border border-ink-100 rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3" aria-hidden>⚠️</div>
          <h1 className="text-lg font-bold text-ink-900 mb-2">
            Something went wrong on this page.
          </h1>
          <p className="text-sm text-ink-500 leading-relaxed mb-6">
            We've logged what happened. Reloading usually clears it — if
            it keeps happening, head back to the dashboard and try
            from there.
          </p>

          {/* Error message — kept small + monospace. Useful when a user
              screenshots it for support, but not so prominent it scares
              them. We deliberately don't render the stack trace; the
              first line of error.message is enough signal. */}
          {this.state.error?.message && (
            <pre className="text-[11px] text-ink-400 font-mono bg-ink-50 border border-ink-100 rounded-lg p-3 mb-6 text-left whitespace-pre-wrap break-all">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleGoHome}
              className="flex-1 py-2.5 rounded-xl border border-ink-200 text-sm font-semibold text-ink-700 hover:bg-ink-50 transition-colors"
            >
              Go to dashboard
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    )
  }
}
