import { Component } from 'react'
import { reportError } from '../lib/monitoring'

/**
 * ErrorBoundary — catches uncaught render errors anywhere below it.
 *
 * Without this, a single throw in a child component (a `.map` on undefined,
 * a `JSON.parse` on bad data, a Claude response shape we didn't expect)
 * unmounts the entire React tree and leaves the user staring at a blank
 * white page.
 *
 * ⭐ CHUNK ERRORS AUTO-HEAL. The most common error a live visitor hits is not
 * a bug in our code at all: it is a code-split chunk that 404'd because we
 * deployed while they had the app open, so the hashed filename their page
 * references no longer exists and the SPA fallback hands back index.html
 * ("'text/html' is not a valid JavaScript MIME type", "Failed to fetch
 * dynamically imported module", ...). The fix is always the same, reload to
 * pick up the new index and the new chunk names. So on a chunk error we do
 * that automatically, once, instead of showing a stranger a scary screen.
 * A sessionStorage timestamp guards against a reload loop: if a fresh load
 * still throws a chunk error within the window, we stop auto-reloading and
 * show the fallback (the deploy is genuinely broken, not stale).
 *
 * For every OTHER error we show a calm fallback with Reload / Go to dashboard.
 *
 * Class component because React's error-boundary API still requires
 * componentDidCatch / getDerivedStateFromError (no hook equivalent in React 19).
 * Placement: wraps <Routes> in App.jsx, inside <BrowserRouter> so "Go home" works.
 */

// A dynamic-import / chunk-load failure, by any of the messages browsers use.
function isChunkError(error) {
  const msg = String(error?.message || error || '')
  return (
    msg.includes('valid JavaScript MIME type') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS') ||
    error?.name === 'ChunkLoadError'
  )
}

const RELOAD_KEY    = 'eliv8:chunkReloadAt'
const RELOAD_WINDOW = 30_000 // don't auto-reload more than once per 30s

function canAutoReload() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < RELOAD_WINDOW) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    return true
  } catch {
    // No sessionStorage (private mode): allow one reload, accept the small
    // loop risk over leaving the visitor stuck on a stale page.
    return true
  }
}

export default class ErrorBoundary extends Component {
  state = { error: null, reloading: false }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack })
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] uncaught render error:', error, info?.componentStack)

    // Stale chunk after a deploy: quietly reload to the new version, once.
    if (isChunkError(error) && canAutoReload()) {
      this.setState({ reloading: true })
      window.location.reload()
    }
  }

  handleReload = () => { window.location.reload() }
  handleGoHome = () => { window.location.assign('/dashboard') }

  render() {
    const { error, reloading } = this.state
    if (!error) return this.props.children

    // Auto-reloading after a stale-chunk error: show a calm updating state,
    // never the error text, since the page is about to refresh itself.
    if (reloading) {
      return (
        <div className="min-h-screen bg-ink-50 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-ink-600 text-sm">Updating to the latest version&hellip;</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white border border-ink-100 rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3" aria-hidden>⚠️</div>
          <h1 className="text-lg font-bold text-ink-900 mb-2">
            Something went wrong on this page.
          </h1>
          <p className="text-sm text-ink-500 leading-relaxed mb-6">
            We've logged what happened. Reloading usually clears it: if
            it keeps happening, head back to the dashboard and try
            from there.
          </p>

          {error?.message && (
            <pre className="text-[11px] text-ink-400 font-mono bg-ink-50 border border-ink-100 rounded-lg p-3 mb-6 text-left whitespace-pre-wrap break-all">
              {error.message}
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
