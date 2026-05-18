/**
 * ManualFinancialsModal — guided form for owners who prefer to type their
 * numbers rather than upload a report or connect accounting software.
 *
 * On submit: formats the data into a clean text document and uploads it via
 * uploadKnowledgeFile (kind='financial'). Claude then reads it like any other
 * uploaded file — no new tables or migrations needed.
 *
 * Why this approach (vs a separate "financials" DB table):
 *   - Feeds directly into the existing knowledge context pipeline
 *   - Shows up in the Library so the owner can see what Claude sees
 *   - Naturally versioned — submit again next month, both exist in the library
 *   - Owners can annotate with context ("this is lower than usual because X")
 *     that raw numbers in a DB field would never capture
 */

import { useEffect, useState } from 'react'
import { uploadKnowledgeFile } from '../../lib/knowledgeFiles'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMoney(str) {
  // Strip $, commas, spaces — return number or NaN
  return parseFloat((str || '').replace(/[$,\s]/g, ''))
}

function formatMoney(n) {
  if (!Number.isFinite(n) || n === 0) return ''
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function calcMargin(revenue, profit) {
  if (!revenue || !profit || revenue === 0) return null
  return Math.round((profit / revenue) * 100)
}

function currentPeriodLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ── Build the text document that gets uploaded ────────────────────────────────

function buildDocumentText({ period, revenue, expenses, profit, cash, overdraftLimit, overdraftUsed, ccLimit, ccBalance, streams, topExpenses, notes }) {
  const rev     = parseMoney(revenue)
  const exp     = parseMoney(expenses)
  const pft     = parseMoney(profit) || (rev - exp)
  const margin  = calcMargin(rev, pft)
  const cashAmt = parseMoney(cash)
  const odLimit = parseMoney(overdraftLimit)
  const odUsed  = parseMoney(overdraftUsed)
  const ccLim   = parseMoney(ccLimit)
  const ccBal   = parseMoney(ccBalance)

  // Working capital: cash + unused overdraft + unused credit card
  const unusedOd = (Number.isFinite(odLimit) && Number.isFinite(odUsed)) ? odLimit - odUsed : null
  const unusedCc = (Number.isFinite(ccLim)   && Number.isFinite(ccBal))  ? ccLim - ccBal   : null
  const totalUnusedCredit = (unusedOd ?? 0) + (unusedCc ?? 0)
  const workingCap = Number.isFinite(cashAmt)
    ? cashAmt + (unusedOd ?? 0) + (unusedCc ?? 0)
    : null

  const lines = [
    `FINANCIAL SNAPSHOT — Manual Entry`,
    `Period: ${period}`,
    ``,
    `HEADLINE NUMBERS`,
    rev     ? `Monthly Revenue:   ${formatMoney(rev)}` : null,
    exp     ? `Monthly Expenses:  ${formatMoney(exp)}` : null,
    pft     ? `Net Profit:        ${formatMoney(pft)}${margin !== null ? `  (${margin}% margin)` : ''}` : null,
    cashAmt ? `Cash on Hand:      ${formatMoney(cashAmt)}` : null,
  ].filter(l => l !== null)

  if (Number.isFinite(odLimit) || Number.isFinite(odUsed)) {
    lines.push(``, `OVERDRAFT / CREDIT FACILITY`)
    if (Number.isFinite(odLimit)) lines.push(`Facility Limit:    ${formatMoney(odLimit)}`)
    if (Number.isFinite(odUsed))  lines.push(`Currently Drawn:   ${formatMoney(odUsed)}`)
    if (unusedOd !== null)        lines.push(`Available:         ${formatMoney(unusedOd)}`)
  }

  if (Number.isFinite(ccLim) || Number.isFinite(ccBal)) {
    lines.push(``, `CREDIT CARDS`)
    if (Number.isFinite(ccLim)) lines.push(`Total Credit Limit:    ${formatMoney(ccLim)}`)
    if (Number.isFinite(ccBal)) lines.push(`Current Balance:       ${formatMoney(ccBal)}`)
    if (unusedCc !== null)      lines.push(`Available to Spend:    ${formatMoney(unusedCc)}`)
  }

  if (workingCap !== null) {
    lines.push(``, `WORKING CAPITAL POSITION`)
    lines.push(`Cash on hand:          ${formatMoney(cashAmt)}`)
    if (unusedOd) lines.push(`+ Unused overdraft:    ${formatMoney(unusedOd)}`)
    if (unusedCc) lines.push(`+ Unused credit cards: ${formatMoney(unusedCc)}`)
    lines.push(`= Net Working Capital: ${formatMoney(workingCap)}`)
    if (Number.isFinite(exp) && exp > 0) {
      const runwayMonths = Math.floor(workingCap / exp)
      lines.push(`Estimated Runway:      ~${runwayMonths} month${runwayMonths === 1 ? '' : 's'} of expenses`)
    }
  }

  const activeStreams = streams.filter(s => s.name.trim())
  if (activeStreams.length > 0) {
    lines.push('', 'REVENUE BREAKDOWN')
    activeStreams.forEach(s => {
      const amt = parseMoney(s.amount)
      lines.push(`• ${s.name.trim()}${amt ? `   ~${formatMoney(amt)}/month` : ''}`)
    })
  }

  const activeExpenses = topExpenses.filter(e => e.name.trim())
  if (activeExpenses.length > 0) {
    lines.push('', 'TOP EXPENSES')
    activeExpenses.forEach(e => {
      const amt = parseMoney(e.amount)
      lines.push(`• ${e.name.trim()}${amt ? `   ~${formatMoney(amt)}/month` : ''}`)
    })
  }

  if (notes.trim()) {
    lines.push('', 'NOTES / CONTEXT')
    lines.push(notes.trim())
  }

  return lines.join('\n')
}

// ── Component ─────────────────────────────────────────────────────────────────

const EMPTY_STREAM  = { name: '', amount: '' }

export default function ManualFinancialsModal({ companyId, userId, onClose, onUploaded }) {
  const [period,          setPeriod]          = useState(currentPeriodLabel())
  const [revenue,         setRevenue]         = useState('')
  const [expenses,        setExpenses]        = useState('')
  const [profit,          setProfit]          = useState('')
  const [cash,            setCash]            = useState('')
  const [overdraftLimit,  setOverdraftLimit]  = useState('')
  const [overdraftUsed,   setOverdraftUsed]   = useState('')
  const [ccLimit,         setCcLimit]         = useState('')
  const [ccBalance,       setCcBalance]       = useState('')
  const [streams,         setStreams]         = useState([{ ...EMPTY_STREAM }, { ...EMPTY_STREAM }, { ...EMPTY_STREAM }])
  const [topExpenses,     setTopExpenses]     = useState([{ ...EMPTY_STREAM }, { ...EMPTY_STREAM }, { ...EMPTY_STREAM }])
  const [notes,           setNotes]           = useState('')
  const [busy,            setBusy]            = useState(false)
  const [progress,        setProgress]        = useState(0)
  const [error,           setError]           = useState(null)

  // Auto-compute net profit when revenue or expenses change
  useEffect(() => {
    const rev = parseMoney(revenue)
    const exp = parseMoney(expenses)
    if (Number.isFinite(rev) && Number.isFinite(exp) && rev > 0) {
      setProfit(String(rev - exp))
    }
  }, [revenue, expenses])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [busy, onClose])

  const updateStream = (i, field, val) => {
    setStreams(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }
  const updateExpense = (i, field, val) => {
    setTopExpenses(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  }

  const handleSubmit = async () => {
    if (!revenue.trim()) { setError('Monthly revenue is required.'); return }
    setBusy(true); setError(null); setProgress(5)

    try {
      const docText = buildDocumentText({
        period, revenue, expenses, profit, cash,
        overdraftLimit, overdraftUsed,
        ccLimit, ccBalance,
        streams, topExpenses, notes,
      })

      const title = `Financial Snapshot — ${period} (manual entry)`

      // Create a File object from the text so it feeds through the standard upload pipeline
      const blob = new Blob([docText], { type: 'text/plain' })
      const file = new File([blob], `financial-snapshot-${period.toLowerCase().replace(/\s+/g, '-')}.txt`, {
        type: 'text/plain',
      })

      const row = await uploadKnowledgeFile(file, {
        companyId,
        userId,
        title,
        kind:       'financial',
        notes:      'Entered manually by the business owner.',
        onProgress: setProgress,
      })

      onUploaded(row)
      onClose()
    } catch (err) {
      setError(err.message ?? 'Something went wrong — please try again.')
      setBusy(false)
    }
  }

  const canSubmit = revenue.trim() && !busy

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-ink-100 overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
        role="dialog" aria-modal="true"
      >
        {/* Header */}
        <div className="bg-ink-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-brand-400 font-semibold mb-0.5">
              Knowledge Library
            </div>
            <h2 className="text-base font-bold text-white">Enter your financial numbers</h2>
          </div>
          <button
            type="button" onClick={onClose} disabled={busy}
            aria-label="Close"
            className="text-ink-400 hover:text-white text-2xl leading-none disabled:opacity-50 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Subheader */}
        <div className="px-5 py-3 bg-ink-50 border-b border-ink-100 flex-shrink-0">
          <p className="text-xs text-ink-500 leading-relaxed">
            No files or accounting software needed. Fill in what you know — even rough numbers help Solomon give much more specific advice. Your entries are saved to your private library.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Period */}
          <Field label="What period do these numbers cover?">
            <input
              type="text"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              disabled={busy}
              placeholder="e.g. April 2025 or Q1 2025 average"
            />
          </Field>

          {/* Headline numbers */}
          <div>
            <SectionTitle>Monthly headline numbers</SectionTitle>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Monthly Revenue" hint="Total money coming in">
                <MoneyInput value={revenue} onChange={setRevenue} disabled={busy} placeholder="e.g. 45,000" />
              </Field>
              <Field label="Monthly Expenses" hint="Total going out (payroll, rent, supplies…)">
                <MoneyInput value={expenses} onChange={setExpenses} disabled={busy} placeholder="e.g. 28,000" />
              </Field>
              <Field label="Net Profit / Month" hint="Auto-calculated, or override if different">
                <MoneyInput value={profit} onChange={setProfit} disabled={busy} placeholder="Auto" />
              </Field>
              <Field label="Cash on Hand" hint="Current business bank balance (approximate)">
                <MoneyInput value={cash} onChange={setCash} disabled={busy} placeholder="e.g. 62,000" />
              </Field>
            </div>

            {/* Live margin preview */}
            {parseMoney(revenue) > 0 && parseMoney(profit) !== 0 && (
              <div className="mt-3 rounded-lg bg-green-50 border border-green-100 px-4 py-2.5 flex items-center gap-2">
                <span className="text-sm font-bold text-green-700">
                  {calcMargin(parseMoney(revenue), parseMoney(profit))}% net margin
                </span>
                <span className="text-xs text-green-600">
                  · {formatMoney(parseMoney(profit))} profit on {formatMoney(parseMoney(revenue))} revenue
                </span>
              </div>
            )}
          </div>

          {/* Overdraft / credit facility */}
          <div>
            <SectionTitle optional>Overdraft / credit facility (optional)</SectionTitle>
            <p className="text-xs text-ink-400 mb-3">
              If you have a business overdraft or line of credit, enter the details. Solomon uses this to calculate your true working capital.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Facility limit" hint="Total overdraft or credit line approved">
                <MoneyInput value={overdraftLimit} onChange={setOverdraftLimit} disabled={busy} placeholder="e.g. 50,000" />
              </Field>
              <Field label="Currently drawn" hint="Amount currently used / outstanding">
                <MoneyInput value={overdraftUsed} onChange={setOverdraftUsed} disabled={busy} placeholder="e.g. 12,000" />
              </Field>
            </div>
          </div>

          {/* Credit cards */}
          <div>
            <SectionTitle optional>Business credit cards (optional)</SectionTitle>
            <p className="text-xs text-ink-400 mb-3">
              Combined across all business cards. Helps Solomon see your full available credit when assessing cash position.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Total credit card limit" hint="Sum of all business card limits">
                <MoneyInput value={ccLimit} onChange={setCcLimit} disabled={busy} placeholder="e.g. 25,000" />
              </Field>
              <Field label="Current balance owing" hint="Total currently charged across all cards">
                <MoneyInput value={ccBalance} onChange={setCcBalance} disabled={busy} placeholder="e.g. 8,000" />
              </Field>
            </div>
          </div>

          {/* Live working capital preview — shown when enough data */}
          {(() => {
            const cashAmt = parseMoney(cash)
            const odLimit = parseMoney(overdraftLimit)
            const odUsed  = parseMoney(overdraftUsed)
            const ccLim   = parseMoney(ccLimit)
            const ccBal   = parseMoney(ccBalance)
            const hasCredit = Number.isFinite(odLimit) || Number.isFinite(odUsed) || Number.isFinite(ccLim) || Number.isFinite(ccBal)
            if (!hasCredit && !Number.isFinite(cashAmt)) return null

            const unusedOd  = (Number.isFinite(odLimit) && Number.isFinite(odUsed)) ? odLimit - odUsed : null
            const unusedCc  = (Number.isFinite(ccLim)   && Number.isFinite(ccBal))  ? ccLim - ccBal   : null
            const workingCap = Number.isFinite(cashAmt) ? cashAmt + (unusedOd ?? 0) + (unusedCc ?? 0) : null
            const exp        = parseMoney(expenses)
            const runway     = (workingCap !== null && Number.isFinite(exp) && exp > 0) ? Math.floor(workingCap / exp) : null

            return (
              <div className="rounded-xl bg-ink-50 border border-ink-200 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-ink-400 mb-3">Working capital summary</p>
                <div className="grid sm:grid-cols-4 gap-3">
                  {Number.isFinite(cashAmt) && <WcStat label="Cash" value={formatMoney(cashAmt)} />}
                  {unusedOd !== null && <WcStat label="Unused overdraft" value={formatMoney(unusedOd)} muted={unusedOd < 0} />}
                  {unusedCc !== null && <WcStat label="Unused credit cards" value={formatMoney(unusedCc)} muted={unusedCc < 0} />}
                  {workingCap !== null && <WcStat label="Net working capital" value={formatMoney(workingCap)} highlight muted={workingCap < 0} />}
                </div>
                {runway !== null && (
                  <p className="text-xs text-ink-500 mt-3">
                    At current expenses, that's roughly{' '}
                    <span className={`font-semibold ${runway < 3 ? 'text-red-600' : runway < 6 ? 'text-amber-600' : 'text-green-700'}`}>
                      {runway} month{runway === 1 ? '' : 's'} of runway
                    </span>.
                  </p>
                )}
              </div>
            )
          })()}

          {/* Revenue streams */}
          <div>
            <SectionTitle optional>Revenue breakdown (optional)</SectionTitle>
            <p className="text-xs text-ink-400 mb-3">
              Where does your revenue come from? Solomon uses this to spot which streams are worth growing.
            </p>
            <div className="space-y-2">
              {streams.map((s, i) => (
                <StreamRow
                  key={i}
                  index={i}
                  namePlaceholder={['e.g. Landscaping services', 'e.g. Equipment rental', 'e.g. Design consulting'][i]}
                  value={s}
                  onChange={(field, val) => updateStream(i, field, val)}
                  disabled={busy}
                />
              ))}
            </div>
          </div>

          {/* Top expenses */}
          <div>
            <SectionTitle optional>Top expense categories (optional)</SectionTitle>
            <p className="text-xs text-ink-400 mb-3">
              Where does most of the money go? Helps Solomon give specific cost and efficiency advice.
            </p>
            <div className="space-y-2">
              {topExpenses.map((e, i) => (
                <StreamRow
                  key={i}
                  index={i}
                  namePlaceholder={['e.g. Labour / wages', 'e.g. Rent / facilities', 'e.g. Supplies / materials'][i]}
                  value={e}
                  onChange={(field, val) => updateExpense(i, field, val)}
                  disabled={busy}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <SectionTitle optional>Context or notes (optional)</SectionTitle>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={busy}
              rows={3}
              placeholder="e.g. Revenue is lower than usual — we lost a major contract in March. Expect recovery by June."
              className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:border-brand-400 focus:bg-white outline-none resize-none transition-colors"
            />
            <p className="text-xs text-ink-400 mt-1">
              This is where the real value is — context a spreadsheet can't capture.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {busy && (
            <div>
              <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                <span>{progress < 70 ? 'Saving your numbers…' : 'Adding to your library…'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-gradient transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ink-100 bg-ink-50/40 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-ink-400 leading-relaxed max-w-xs">
            Saved to your private library — only you and your team can see these numbers.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button" onClick={onClose} disabled={busy}
              className="px-4 py-2 rounded-lg border border-ink-200 bg-white hover:bg-ink-50 text-sm text-ink-700 font-medium disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-lg bg-gold-gradient text-white text-sm font-bold tracking-wide glow-gold-sm hover:glow-gold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              {busy ? 'Saving…' : 'Save to library →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children, optional }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-bold uppercase tracking-widest text-ink-700">{children}</span>
      {optional && (
        <span className="text-[10px] text-ink-400 font-normal normal-case tracking-normal">optional</span>
      )}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-ink-800 mb-1">{label}</div>
      {children}
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </label>
  )
}

function MoneyInput({ value, onChange, disabled, placeholder }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm font-medium">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full pl-7"
      />
    </div>
  )
}

function WcStat({ label, value, highlight, muted }) {
  return (
    <div className={`rounded-md px-3 py-2 ${highlight ? 'bg-white border border-ink-200' : ''}`}>
      <div className="text-[10px] text-ink-400 font-semibold uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${muted ? 'text-red-600' : highlight ? 'text-ink-900' : 'text-ink-700'}`}>
        {value}
      </div>
    </div>
  )
}

function StreamRow({ namePlaceholder, value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value.name}
        onChange={e => onChange('name', e.target.value)}
        disabled={disabled}
        placeholder={namePlaceholder}
        className="flex-1 text-sm"
      />
      <div className="relative w-32 flex-shrink-0">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={value.amount}
          onChange={e => onChange('amount', e.target.value)}
          disabled={disabled}
          placeholder="/month"
          className="w-full pl-7 text-sm"
        />
      </div>
    </div>
  )
}
