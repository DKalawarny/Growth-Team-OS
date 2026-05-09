/**
 * qbo-sync
 *
 * Pulls fresh financial reports from QBO and materialises them into
 * `financial_snapshots`. Called by the browser (CFO Dashboard "Sync now"
 * button, and Settings → Integrations "Sync now").
 *
 * Flow:
 *   1. Verify caller JWT → company_id
 *   2. Look up integration + secret rows
 *   3. If access_token expired → refresh (and SAVE the new refresh_token —
 *      Intuit rotates it every call)
 *   4. POST to Intuit Reports endpoints for P&L and Balance Sheet for the
 *      requested period
 *   5. Normalise to plain text, save to financial_snapshots
 *   6. Return { success, synced_at, snapshots: [...] }
 *
 * Body (JSON, optional):
 *   period_start  YYYY-MM-DD — default: first day of last calendar month
 *   period_end    YYYY-MM-DD — default: last day of last calendar month
 *   period_label  display string — default: derived month name + year
 *
 * Why single-period reports: we pull one period at a time so the normaliser
 * can assume the last ColData cell is the amount. Multi-period reports have
 * multiple amount columns and blow that assumption up.
 */

import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser, serviceClient } from '../_shared/supabase.ts'
import {
  fetchReport,
  normaliseReport,
  refreshAccessToken,
} from '../_shared/qbo.ts'

interface SyncRequestBody {
  period_start?: string
  period_end?:   string
  period_label?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const user = await authedUser(req)

    // Role gate — matches the CFO tool's RequireRole. We don't want a rogue
    // "safety" or other-role user syncing the books.
    const allowedRoles = ['owner', 'admin', 'cfo']
    if (!allowedRoles.includes(user.role ?? '')) {
      return json({ error: 'Forbidden: owner/admin/cfo role required' }, 403)
    }

    const body = (await req.json().catch(() => ({}))) as SyncRequestBody
    const { period_start, period_end, period_label } = resolvePeriod(body)

    const admin = serviceClient()

    // --- 1. Load integration + secret -----------------------------------
    const { data: integration, error: intErr } = await admin
      .from('integrations')
      .select('id, realm_id, status')
      .eq('company_id', user.companyId)
      .eq('provider',   'quickbooks')
      .maybeSingle()
    if (intErr) throw new Error(`integration lookup: ${intErr.message}`)
    if (!integration) {
      return json({ error: 'QuickBooks not connected. Connect in Settings first.' }, 404)
    }
    if (integration.status !== 'connected') {
      return json({ error: `QuickBooks status is ${integration.status}. Reconnect.` }, 409)
    }

    const { data: secret, error: secErr } = await admin
      .from('integration_secrets')
      .select('access_token, refresh_token, expires_at')
      .eq('integration_id', integration.id)
      .maybeSingle()
    if (secErr) throw new Error(`secret lookup: ${secErr.message}`)
    if (!secret) throw new Error('Missing tokens for integration — reconnect QuickBooks')

    // --- 2. Refresh access token if expired (or within 60s of expiring) -
    let accessToken = secret.access_token
    const expiresAt = new Date(secret.expires_at).getTime()
    const now = Date.now()
    if (now >= expiresAt - 60 * 1000) {
      try {
        const refreshed = await refreshAccessToken(secret.refresh_token)
        accessToken = refreshed.access_token
        await admin
          .from('integration_secrets')
          .update({
            access_token:  refreshed.access_token,
            refresh_token: refreshed.refresh_token,  // rotated — save the new one
            expires_at:    new Date(Date.now() + (refreshed.expires_in * 1000)).toISOString(),
            updated_at:    new Date().toISOString(),
          })
          .eq('integration_id', integration.id)
      } catch (e) {
        // Refresh failed — flip integration status so the UI prompts a
        // reconnect. Don't just error out silently.
        await admin
          .from('integrations')
          .update({ status: 'expired', last_sync_error: 'refresh_token_invalid' })
          .eq('id', integration.id)
        throw new Error(`Token refresh failed — reconnect QuickBooks. (${(e as Error).message})`)
      }
    }

    // --- 3. Fetch reports (P&L + BS) ------------------------------------
    // Fetch in parallel; partial failures handled per-report below.
    const [plRes, bsRes] = await Promise.allSettled([
      fetchReport(integration.realm_id!, accessToken, 'ProfitAndLoss', {
        start_date: period_start,
        end_date:   period_end,
      }),
      fetchReport(integration.realm_id!, accessToken, 'BalanceSheet', {
        start_date: period_start,
        end_date:   period_end,
      }),
    ])

    const syncedAt = new Date().toISOString()
    const snapshots: Array<{ report_type: string; synced_at: string }> = []
    const errors:   string[] = []

    // --- 4. Materialise each successful report --------------------------
    if (plRes.status === 'fulfilled') {
      const n = normaliseReport('Profit and Loss', plRes.value)
      const { error } = await admin.from('financial_snapshots').insert({
        company_id:      user.companyId,
        source:          'quickbooks',
        report_type:     'profit_and_loss',
        period_label,
        period_start:    n.period.start,
        period_end:      n.period.end,
        raw_json:        plRes.value,
        normalized_text: n.text,
        synced_at:       syncedAt,
      })
      if (error) errors.push(`P&L insert: ${error.message}`)
      else snapshots.push({ report_type: 'profit_and_loss', synced_at: syncedAt })
    } else {
      errors.push(`P&L fetch: ${plRes.reason?.message ?? plRes.reason}`)
    }

    if (bsRes.status === 'fulfilled') {
      const n = normaliseReport('Balance Sheet', bsRes.value)
      const { error } = await admin.from('financial_snapshots').insert({
        company_id:      user.companyId,
        source:          'quickbooks',
        report_type:     'balance_sheet',
        period_label,
        period_start:    n.period.start,
        period_end:      n.period.end,
        raw_json:        bsRes.value,
        normalized_text: n.text,
        synced_at:       syncedAt,
      })
      if (error) errors.push(`BS insert: ${error.message}`)
      else snapshots.push({ report_type: 'balance_sheet', synced_at: syncedAt })
    } else {
      errors.push(`BS fetch: ${bsRes.reason?.message ?? bsRes.reason}`)
    }

    // --- 5. Update the integration's last_synced_at + error -------------
    await admin
      .from('integrations')
      .update({
        last_synced_at:  syncedAt,
        last_sync_error: errors.length ? errors.join(' | ') : null,
      })
      .eq('id', integration.id)

    if (snapshots.length === 0) {
      return json({ error: 'All report fetches failed', details: errors }, 502)
    }

    return json({
      success:      true,
      synced_at:    syncedAt,
      period_label,
      snapshots,
      warnings:     errors.length ? errors : undefined,
    })
  } catch (err) {
    console.error('[qbo-sync]', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401 : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})

// ----------------------------------------------------------------------------
/**
 * Default the period to "last calendar month" — most realistic "what's the
 * shape of my books RIGHT NOW" read. If caller provides partial or full
 * explicit dates we honour them.
 */
function resolvePeriod(body: SyncRequestBody): { period_start: string; period_end: string; period_label: string } {
  if (body.period_start && body.period_end && body.period_label) {
    return {
      period_start: body.period_start,
      period_end:   body.period_end,
      period_label: body.period_label,
    }
  }
  const now   = new Date()
  const year  = now.getUTCFullYear()
  const month = now.getUTCMonth()           // 0..11, current month
  // First + last day of LAST month (current month - 1).
  const firstOfLast = new Date(Date.UTC(year, month - 1, 1))
  const lastOfLast  = new Date(Date.UTC(year, month, 0))   // day 0 = last day of previous month
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const monthName = firstOfLast.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
  return {
    period_start: body.period_start ?? fmt(firstOfLast),
    period_end:   body.period_end   ?? fmt(lastOfLast),
    period_label: body.period_label ?? `${monthName} ${firstOfLast.getUTCFullYear()}`,
  }
}
