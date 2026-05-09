/**
 * QuickBooks Online API helpers.
 *
 * Two environments, picked via env var QBO_ENVIRONMENT:
 *   - 'sandbox'     for dev against Intuit's sandbox company
 *   - 'production'  for real accounts (requires Intuit app review)
 *
 * Both share the same OAuth2 flow against auth.platform.intuit.com; they
 * differ only in the API base for actual QBO calls.
 *
 * OAuth ref:   https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization
 * Reports API: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/report-entities/profitandloss
 *
 * We ONLY use the pre-aggregated Reports endpoints (ProfitAndLoss,
 * BalanceSheet). No transaction-level pulls. Keeps the payload small and
 * avoids dealing with GL hierarchies we don't need.
 */

// ---- URL constants ----
// OAuth endpoints are shared between sandbox and production.
const OAUTH_AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2'
const OAUTH_TOKEN_URL     = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

// Scope for accounting data. Add 'openid profile email' later if we want the
// authorising user's identity (we don't right now; we track our own user).
export const QBO_SCOPE = 'com.intuit.quickbooks.accounting'

function apiBase(): string {
  const env = (Deno.env.get('QBO_ENVIRONMENT') || 'sandbox').toLowerCase()
  return env === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'
}

function clientCreds(): { id: string; secret: string; redirect: string } {
  const id       = Deno.env.get('QBO_CLIENT_ID')     ?? ''
  const secret   = Deno.env.get('QBO_CLIENT_SECRET') ?? ''
  const redirect = Deno.env.get('QBO_REDIRECT_URI')  ?? ''
  if (!id || !secret || !redirect) {
    throw new Error('QBO env missing: need QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REDIRECT_URI')
  }
  return { id, secret, redirect }
}

// ---- OAuth ----

/**
 * Build the authorize URL the browser redirects to. Intuit handles the
 * consent UX; on completion they call back to QBO_REDIRECT_URI with `code`,
 * `state`, and `realmId`.
 */
export function buildAuthorizeUrl(state: string): string {
  const { id, redirect } = clientCreds()
  const params = new URLSearchParams({
    client_id:     id,
    response_type: 'code',
    scope:         QBO_SCOPE,
    redirect_uri:  redirect,
    state,
  })
  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`
}

interface TokenResponse {
  access_token:  string
  refresh_token: string
  expires_in:    number            // seconds until access_token expires (~3600)
  x_refresh_token_expires_in: number // seconds until refresh_token expires (~8.6M)
  token_type:    string
}

/**
 * Exchange an auth code for tokens. One-shot — the code is single-use.
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { id, secret, redirect } = clientCreds()
  const body = new URLSearchParams({
    grant_type:   'authorization_code',
    code,
    redirect_uri: redirect,
  })

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Accept':        'application/json',
      'Authorization': 'Basic ' + btoa(`${id}:${secret}`),
    },
    body,
  })

  if (!res.ok) {
    throw new Error(`qbo token exchange failed: ${res.status} ${await res.text()}`)
  }
  return await res.json() as TokenResponse
}

/**
 * Refresh an access token. Intuit rotates the refresh_token on EVERY call —
 * you MUST save the new refresh_token from the response, or the next refresh
 * will fail.
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { id, secret } = clientCreds()
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Accept':        'application/json',
      'Authorization': 'Basic ' + btoa(`${id}:${secret}`),
    },
    body,
  })

  if (!res.ok) {
    throw new Error(`qbo token refresh failed: ${res.status} ${await res.text()}`)
  }
  return await res.json() as TokenResponse
}

// ---- Reports ----

interface ReportOptions {
  start_date: string  // YYYY-MM-DD
  end_date:   string  // YYYY-MM-DD
}

/**
 * Fetch a named report. QBO returns a nested Rows/Columns structure —
 * we pass it through as-is and normalise in the caller.
 */
export async function fetchReport(
  realmId:    string,
  accessToken: string,
  reportName: 'ProfitAndLoss' | 'BalanceSheet' | 'CashFlow',
  opts:       ReportOptions,
): Promise<Record<string, unknown>> {
  const url = new URL(`${apiBase()}/v3/company/${realmId}/reports/${reportName}`)
  url.searchParams.set('start_date', opts.start_date)
  url.searchParams.set('end_date',   opts.end_date)
  url.searchParams.set('minorversion', '70')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept':        'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    throw new Error(`qbo ${reportName} fetch failed: ${res.status} ${await res.text()}`)
  }
  return await res.json() as Record<string, unknown>
}

// ---- Normalisation ----
//
// QBO report shape:
//   {
//     Header: { StartPeriod, EndPeriod, Currency, ... },
//     Columns: { Column: [{ColTitle, ...}, ...] },
//     Rows:    { Row:     [{Rows: {...}} | {ColData: [...], group, Summary}, ...] }
//   }
//
// We want a flat "line: amount" list for Claude. Walk the Rows tree and
// extract every leaf that has ColData with a numeric value in the last column
// (typically "Total"). Section headers (group rows) get retained as labels.
//
// Total-column detection: we take the LAST column of ColData as the amount.
// On a single-period report that's "Total"; on multi-period it's the last
// period. We always pull single-period reports so this is safe.

interface NormalisedLine {
  label:  string
  amount: number | null
  depth:  number
}

function extractRows(node: Record<string, unknown>, depth: number, out: NormalisedLine[]): void {
  const rows = (node?.Row ?? node?.Rows) as unknown
  const list = Array.isArray(rows) ? rows : (rows as { Row?: unknown[] })?.Row ?? []
  if (!Array.isArray(list)) return

  for (const rowU of list) {
    const row = rowU as Record<string, unknown>
    const colData = row.ColData as Array<{ value?: string }> | undefined
    const nested  = row.Rows    as Record<string, unknown> | undefined
    const summary = row.Summary as { ColData?: Array<{ value?: string }> } | undefined
    const group   = (row.group ?? row.type) as string | undefined

    // A leaf detail row: has ColData and no nested rows.
    if (colData && colData.length > 0 && (!nested || Object.keys(nested).length === 0)) {
      const label = colData[0]?.value ?? ''
      const amtStr = colData[colData.length - 1]?.value ?? ''
      const amount = parseAmount(amtStr)
      if (label) out.push({ label, amount, depth })
    }

    // A section (group) header: emit a label, then recurse into nested rows.
    if (nested && Object.keys(nested).length > 0) {
      const header = colData?.[0]?.value ?? group ?? ''
      if (header) out.push({ label: header, amount: null, depth })
      extractRows(nested, depth + 1, out)
      // Summary row for the section (e.g., "Total Income").
      if (summary?.ColData) {
        const label  = summary.ColData[0]?.value ?? ''
        const amount = parseAmount(summary.ColData[summary.ColData.length - 1]?.value ?? '')
        if (label) out.push({ label, amount, depth })
      }
    }
  }
}

function parseAmount(s: string): number | null {
  if (!s) return null
  const cleaned = s.replace(/[^\d.\-]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Turn a QBO report payload into a plain-text summary for Claude.
 *
 * Output format:
 *   === Profit and Loss · Jan 1 – Mar 31 2026 ===
 *   Income
 *     Services Revenue ............ $142,500
 *     Product Sales ............... $18,200
 *   Total Income .................. $160,700
 *   ...
 *
 * Claude handles this fine. We don't try to reconstruct a full P&L — just
 * give it every line with its value so it can cite numbers directly.
 */
export function normaliseReport(
  reportName: string,
  payload:    Record<string, unknown>,
): { lines: NormalisedLine[]; text: string; period: { start: string | null; end: string | null } } {
  const header    = (payload.Header ?? {}) as Record<string, unknown>
  const startDate = (header.StartPeriod as string) ?? null
  const endDate   = (header.EndPeriod   as string) ?? null

  const lines: NormalisedLine[] = []
  const rowsNode = payload.Rows as Record<string, unknown> | undefined
  if (rowsNode) extractRows(rowsNode, 0, lines)

  // Render the text summary. Dot-leader table — readable in monospace AND in
  // Claude's eyes; indentation conveys hierarchy.
  const title = `=== ${reportName} · ${startDate ?? '?'} – ${endDate ?? '?'} ===`
  const body  = lines.map(l => {
    const indent = '  '.repeat(l.depth)
    const amount = l.amount === null ? '' : formatAmount(l.amount)
    const labelWithAmount = amount
      ? `${l.label} ${'.'.repeat(Math.max(2, 44 - (indent.length + l.label.length)))}. ${amount}`
      : l.label
    return `${indent}${labelWithAmount}`
  }).join('\n')

  return {
    lines,
    text:   `${title}\n${body}`,
    period: { start: startDate, end: endDate },
  }
}

function formatAmount(n: number): string {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `($${abs})` : `$${abs}`
}
