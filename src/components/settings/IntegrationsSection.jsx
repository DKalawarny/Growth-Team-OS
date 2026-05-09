import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  startOAuthFlow,
  syncQuickBooks,
  fetchIntegration,
  fetchLatestSnapshots,
  disconnectQuickBooks,
  formatRelative,
} from '../../lib/quickbooks'

/**
 * IntegrationsSection — lives inside Settings, shows every third-party
 * connection (just QuickBooks for now) and the owner-facing controls to
 * connect / sync / disconnect.
 *
 * Behaviour:
 *   - On mount, reads the current `integrations` row + recent `financial_snapshots`
 *     to populate status + last-sync line.
 *   - Reads URL search params for ?qbo=connected|error&reason=... so the
 *     post-redirect state from the callback shows a friendly banner.
 *   - "Connect" kicks off the OAuth flow (browser navigates to Intuit).
 *   - "Sync now" calls qbo-sync, shows the period label + new synced_at.
 *   - "Disconnect" flips status locally; if the owner reconnects later the
 *     secrets are just overwritten.
 *
 * Role-gating happens in the Edge Function itself (owner/admin/cfo). Here we
 * also hide the entire section from other roles — no point offering a button
 * that'll 403. We pull `role` from useAuth.
 */

const QBO_ALLOWED_ROLES = ['owner', 'admin', 'cfo']

export default function IntegrationsSection() {
  const { profile, role } = useAuth()
  const companyId = profile?.company_id

  const [params, setParams] = useSearchParams()

  const [integration, setIntegration] = useState(null)
  const [snapshots, setSnapshots]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [syncing, setSyncing]         = useState(false)
  const [connecting, setConnecting]   = useState(false)
  const [disconnecting, setDisc]      = useState(false)

  // Derive the initial banner from URL params ONCE at mount. Using a lazy
  // initializer (vs. setState-in-useEffect) sidesteps the cascading-render
  // lint rule — the banner's initial value is a function of the URL, not
  // something we need to "react to".
  const [banner, setBanner] = useState(() => bannerFromParams(params))

  // Separately, clean the URL so a refresh doesn't re-show the banner. This
  // IS a side effect (writing to the URL, an external system) so useEffect
  // is the right tool. Runs once at mount.
  useEffect(() => {
    if (!params.get('qbo')) return
    const next = new URLSearchParams(params)
    next.delete('qbo')
    next.delete('reason')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Load state ----
  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [i, s] = await Promise.all([
          fetchIntegration(companyId, 'quickbooks'),
          fetchLatestSnapshots(companyId, { limit: 4 }),
        ])
        if (cancelled) return
        setIntegration(i)
        setSnapshots(s)
      } catch (err) {
        if (!cancelled) setBanner({ tone: 'err', text: err.message || 'Could not load integrations' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [companyId])

  // Silently hide from ineligible roles. We could show a "contact your owner"
  // message but that adds noise — cleaner to not advertise a tool you can't use.
  if (!QBO_ALLOWED_ROLES.includes(role)) return null

  const status = integration?.status ?? 'disconnected'
  const connected = status === 'connected'

  const handleConnect = async () => {
    setConnecting(true)
    setBanner(null)
    try {
      await startOAuthFlow()
      // Navigation happens — we don't return.
    } catch (err) {
      setBanner({ tone: 'err', text: err.message || 'Could not start connection' })
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setBanner(null)
    try {
      const res = await syncQuickBooks()
      const warn = res?.warnings?.length ? ` (with warnings)` : ''
      setBanner({
        tone: 'ok',
        text: `Synced ${res?.period_label ?? 'last month'}${warn}. ${res?.snapshots?.length ?? 0} reports updated.`,
      })
      // Refresh state so the card shows the new synced_at.
      const [i, s] = await Promise.all([
        fetchIntegration(companyId, 'quickbooks'),
        fetchLatestSnapshots(companyId, { limit: 4 }),
      ])
      setIntegration(i)
      setSnapshots(s)
    } catch (err) {
      setBanner({ tone: 'err', text: err.message || 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect QuickBooks? Your snapshots stay, but no more will be pulled until you reconnect.')) return
    setDisc(true)
    setBanner(null)
    try {
      await disconnectQuickBooks(companyId)
      setIntegration(prev => prev ? { ...prev, status: 'disconnected' } : prev)
      setBanner({ tone: 'ok', text: 'Disconnected. Reconnect anytime from this page.' })
    } catch (err) {
      setBanner({ tone: 'err', text: err.message || 'Disconnect failed' })
    } finally {
      setDisc(false)
    }
  }

  return (
    <section className="mt-10 bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Integrations</h2>
      <p className="text-sm text-gray-600 mb-4">
        Connect your books so the CFO Dashboard, Cash Flow, and Exit Readiness
        tools read real numbers instead of estimates.
      </p>

      {banner && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${
          banner.tone === 'ok'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {banner.text}
        </div>
      )}

      {/* QuickBooks card */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#2CA01C] flex items-center justify-center text-white font-bold text-lg flex-shrink-0" aria-hidden>
            qb
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">QuickBooks Online</h3>
              <StatusBadge status={loading ? 'loading' : status} />
            </div>
            <p className="text-sm text-gray-600 mt-0.5">
              Monthly P&amp;L and balance-sheet snapshots feed every financial tool.
            </p>

            {connected && (
              <div className="mt-3 text-xs text-gray-500">
                Connected {formatRelative(integration?.connected_at)}
                {integration?.last_synced_at
                  ? <> · last synced {formatRelative(integration.last_synced_at)}</>
                  : <> · not synced yet</>}
                {integration?.realm_id && (
                  <> · realm <code className="text-[11px]">{integration.realm_id}</code></>
                )}
              </div>
            )}

            {snapshots.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {snapshots.map(s => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full"
                    title={`Synced ${formatRelative(s.synced_at)}`}
                  >
                    <span className="text-gray-400">
                      {s.report_type === 'profit_and_loss' ? 'P&L' :
                       s.report_type === 'balance_sheet'  ? 'BS'  :
                       s.report_type === 'cash_flow'      ? 'CF'  : s.report_type}
                    </span>
                    <span>{s.period_label}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {!connected && (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting || loading}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2CA01C] hover:bg-[#228B19] disabled:bg-gray-300 text-white text-sm font-medium transition-colors"
                >
                  {connecting ? 'Opening QuickBooks…' : 'Connect QuickBooks'}
                </button>
              )}
              {connected && (
                <>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white text-sm font-medium transition-colors"
                  >
                    {syncing ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-sm text-gray-700 font-medium transition-colors"
                  >
                    {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </>
              )}
            </div>

            {integration?.last_sync_error && (
              <p className="mt-3 text-xs text-red-700">
                Last sync warning: {integration.last_sync_error}
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Tokens are stored encrypted-at-rest on Supabase and only accessible to
        our server functions — never to the browser.
      </p>
    </section>
  )
}

/**
 * Read the post-OAuth redirect params into an initial banner shape.
 * Pure function — safe to call inside useState's lazy initializer.
 */
function bannerFromParams(params) {
  const qbo = params.get('qbo')
  if (qbo === 'connected') {
    return { tone: 'ok', text: 'QuickBooks connected. Sync to pull your latest reports.' }
  }
  if (qbo === 'error') {
    const reason = params.get('reason') || 'unknown'
    return { tone: 'err', text: `QuickBooks connection failed: ${decodeURIComponent(reason)}` }
  }
  return null
}

function StatusBadge({ status }) {
  const map = {
    connected:    { cls: 'bg-green-50 text-green-800 border-green-200', label: 'Connected' },
    expired:      { cls: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Expired — reconnect' },
    disconnected: { cls: 'bg-gray-50 text-gray-700 border-gray-200',    label: 'Not connected' },
    loading:      { cls: 'bg-gray-50 text-gray-500 border-gray-200',    label: '…' },
  }
  const s = map[status] ?? map.disconnected
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  )
}
