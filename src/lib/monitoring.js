/**
 * monitoring — crash reporting via Sentry.
 *
 * ⭐ WHY THIS EXISTS
 *
 * Until now a crash in production was invisible. The error boundary caught it,
 * showed the owner a fallback, and logged to a console nobody was reading. With
 * ten friends in a pilot you hear about breakage socially. Past that it is
 * silent churn: someone hits a wall, leaves, and nothing in the system records
 * that it happened.
 *
 * ⚠️ WHAT IS DELIBERATELY NOT SENT
 *
 * This product holds a business's financials, its people, and conversations an
 * owner would not want repeated. So:
 *
 *   - sendDefaultPii is OFF. No IP address, no cookies, no request bodies.
 *   - No email, no name. Users are identified by their UUID only — enough to
 *     ask "did this hit one person or everyone", which is the actual question,
 *     and useless to anyone reading the dashboard.
 *   - No session replay and no performance tracing. Replay records the screen,
 *     and this screen has their books on it.
 *   - beforeSend scrubs anything that looks like a key or a token out of the
 *     message, because error strings are a classic place for one to surface.
 *
 * The point is to learn that something broke and where, not to watch anyone.
 */

import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN

// Patterns that must never leave the browser inside an error string.
const SECRET_LIKE = [
  /\bsk-[A-Za-z0-9_-]{16,}/g,          // OpenAI / Anthropic style
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,  // JWTs
  /\bpa-[A-Za-z0-9_-]{20,}/g,          // Voyage
  /\b[A-Za-z0-9_-]{32,}@/g,            // anything key-shaped before an @
]

function scrub(value) {
  if (typeof value !== 'string') return value
  return SECRET_LIKE.reduce((s, re) => s.replace(re, '[redacted]'), value)
}

export function initMonitoring() {
  // No DSN in development, and no DSN configured means simply off. An
  // unconfigured Sentry must never break the app — that would be the
  // monitoring causing the outage.
  if (!DSN || import.meta.env.DEV) return

  try {
    Sentry.init({
      dsn: DSN,
      sendDefaultPii: false,

      // Free tier is 5,000 events/month. One broken render can loop and burn
      // that in minutes, so cap the rate and drop duplicates.
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      maxBreadcrumbs: 20,

      ignoreErrors: [
        // Browser extensions and network noise the owner cannot act on.
        'ResizeObserver loop',
        'Non-Error promise rejection captured',
        /^Failed to fetch$/,
        /^NetworkError/,
        /^Load failed$/,
      ],

      beforeSend(event) {
        if (event.message) event.message = scrub(event.message)
        for (const ex of event.exception?.values ?? []) {
          if (ex.value) ex.value = scrub(ex.value)
        }
        // Belt and braces — strip anything the SDK collected about the person.
        if (event.user) {
          event.user = { id: event.user.id }
        }
        return event
      },
    })
  } catch {
    // Monitoring must never be the reason the app fails to start.
  }
}

/**
 * Attach the signed-in user. ID only — see the note at the top.
 * Called from useAuth whenever the session changes.
 */
export function identify({ userId, companyId } = {}) {
  if (!DSN || import.meta.env.DEV) return
  try {
    Sentry.setUser(userId ? { id: userId } : null)
    // company_id is the single most useful tag here: it answers "is this one
    // customer's data doing something odd, or is it everybody".
    Sentry.setTag('company_id', companyId ?? 'none')
  } catch { /* never break the app for telemetry */ }
}

/**
 * Report a caught error that did not reach the error boundary — a failed
 * save, a rejected fetch the UI handled. Optional context is scrubbed.
 */
// Crashes are also written to our own database (migration 099), which emails
// Daniel. This is what makes "We've logged what happened" on the crash screen
// true whether or not the outside error service is configured. It can never
// throw, never blocks, and reports each distinct message once per page load.
const sentOnce = new Set()
function logToOwnDatabase(error, context) {
  try {
    const message = scrub(String(error?.message || error || 'Unknown error')).slice(0, 500)
    if (!message || sentOnce.has(message)) return
    // A page left open across a deploy asks for a file that was renamed. The
    // app reloads itself for that; it is not a crash anyone needs an email about.
    if (/MIME type|dynamically imported module|module script failed|preload CSS|ChunkLoadError/i.test(message)) return
    sentOnce.add(message)
    const stack = scrub(String(context?.componentStack || error?.stack || '')).slice(0, 4000) || null
    import('./supabase').then(async ({ supabase }) => {
      let user_id = null, company_id = null
      try {
        const { data } = await supabase.auth.getSession()
        user_id = data?.session?.user?.id ?? null
        if (user_id) {
          const { data: p } = await supabase.from('profiles').select('company_id').eq('id', user_id).maybeSingle()
          company_id = p?.company_id ?? null
        }
      } catch { /* not signed in: the crew page, or a public page */ }
      // A crew link carries a token in the path. Keep the page, drop the token.
      const page = window.location.pathname.replace(/^\/staff\/.+/, '/staff/(crew link)').slice(0, 300)
      await supabase.from('client_errors').insert({ message, stack, page, user_id, company_id })
    }).catch(() => {})
  } catch { /* reporting must never be the thing that breaks */ }
}

export function reportError(error, context = {}) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error('[monitoring]', error, context)
    return
  }
  logToOwnDatabase(error, context)
  if (!DSN) return
  try {
    Sentry.captureException(error, { extra: context })
  } catch { /* ignore */ }
}
