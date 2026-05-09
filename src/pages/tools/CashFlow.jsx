import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { runToolCall, HAIKU } from '../../lib/anthropic'
import { isCapExceeded } from '../../lib/usage'
import { CASH_FLOW_PROMPT, CASH_FLOW_REFINE_PROMPT } from '../../lib/prompts'
import { buildAdvisorContext } from '../../lib/advisorContext'
import { summarizeContext } from '../../lib/toolContextSummary'
import { listKnowledgeFiles } from '../../lib/knowledgeFiles'
import {
  fetchIntegration,
  fetchLatestSnapshots,
  formatRelative,
} from '../../lib/quickbooks'
import CashFlowPlan from '../../components/tools/CashFlowPlan'
import CapExceededNotice from '../../components/tools/CapExceededNotice'
import RefineChat from '../../components/tools/RefineChat'
import ContextUsedLine from '../../components/tools/ContextUsedLine'

/**
 * Cash Flow — /tools/cash-flow
 *
 * Two entry modes:
 *   SMART MODE  — QuickBooks is connected & has recent data. Claude already
 *                 has the numbers via buildAdvisorContext (P&L + balance sheet).
 *                 Owner just adds any concerns and hits Generate.
 *   MANUAL MODE — No QBO, or owner prefers to enter their own numbers.
 *                 Same detailed form as before.
 *
 * Both modes produce the same 13-week projection and result/refine view.
 */

const INITIAL_FORM = {
  starting_balance:        '',
  comfort_threshold:       '',
  typical_monthly_revenue: '',
  typical_monthly_expenses:'',
  payroll_rhythm:          '',
  known_inflows:           '',
  known_outflows:          '',
  concerns:                '',
}

export default function CashFlow() {
  const { profile }   = useAuth()
  const navigate      = useNavigate()

  // QBO state
  const [qboIntegration, setQboIntegration] = useState(null)
  const [qboSnapshots,   setQboSnapshots]   = useState([])

  // Uploaded financial docs
  const [financialDocs,  setFinancialDocs]  = useState([])

  const [qboLoaded, setQboLoaded] = useState(false)

  // Form / result state
  // mode: 'qbo' | 'docs' | 'manual'
  const [mode,      setMode]      = useState('qbo')
  const [stage,     setStage]     = useState('form')
  const [form,      setForm]      = useState(INITIAL_FORM)
  const [concerns,  setConcerns]  = useState('')       // smart-mode quick field
  const [result,    setResult]    = useState(null)
  const [messages,  setMsgs]      = useState([])
  const [refining,  setRefining]  = useState(false)
  const [error,     setError]     = useState(null)
  const [capError,  setCapError]  = useState(null)
  const [contextSummary, setContextSummary] = useState(null)

  const updateField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const canSubmitManual = form.starting_balance.trim() && form.typical_monthly_revenue.trim()

  // ── Load QBO + uploaded docs on mount ────────────────────────────────────
  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false
    ;(async () => {
      try {
        const [integration, snapshots, allFiles] = await Promise.all([
          fetchIntegration(profile.company_id, 'quickbooks').catch(() => null),
          fetchLatestSnapshots(profile.company_id, { limit: 4 }).catch(() => []),
          listKnowledgeFiles(profile.company_id).catch(() => []),
        ])
        if (cancelled) return

        const qboOk = integration?.status === 'connected' && snapshots.length > 0
        // Financial docs: kind='financial', OR titles that look financial
        const finDocs = allFiles.filter(f =>
          f.kind === 'financial' ||
          /p(&|and|&amp;)l|profit.{0,6}loss|balance.?sheet|income.?state|bank.?state|cash.?flow/i.test(f.title)
        )

        setQboIntegration(integration)
        setQboSnapshots(snapshots)
        setFinancialDocs(finDocs)

        // Pick the best default mode
        if (qboOk)           setMode('qbo')
        else if (finDocs.length) setMode('docs')
        else                 setMode('manual')
      } catch { /* silently degrade */ } finally {
        if (!cancelled) setQboLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [profile?.company_id])

  const qboConnected   = qboIntegration?.status === 'connected' && qboSnapshots.length > 0
  const latestSnapshot = qboSnapshots[0] ?? null
  const hasDocs        = financialDocs.length > 0

  // ── Generate (shared by both modes) ──────────────────────────────────────
  const handleGenerate = async (e) => {
    e?.preventDefault()
    if (!profile?.company_id) return

    setStage('loading')
    setError(null)
    setCapError(null)

    try {
      const context = await buildAdvisorContext(profile.company_id)
      setContextSummary(summarizeContext(context))
      const systemPrompt = `${CASH_FLOW_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      // QBO mode: signal live data, Claude reads from financial_snapshots in context.
      // Docs mode: signal uploaded docs, Claude reads from knowledge_files in context.
      // Manual mode: pass all the filled-in numbers.
      const userMessage = mode === 'qbo'
        ? JSON.stringify({
            data_source:  'quickbooks_live',
            period_label: latestSnapshot?.period_label ?? null,
            synced_at:    latestSnapshot?.synced_at    ?? null,
            concerns:     concerns.trim() || null,
            instructions: 'Use the financial_snapshots in BUSINESS_CONTEXT for all numeric inputs — balance, revenue, expenses. Extract starting_balance from the balance sheet Cash row, monthly revenue and expenses from the P&L. State your assumptions clearly.',
          })
        : mode === 'docs'
        ? JSON.stringify({
            data_source:  'uploaded_documents',
            doc_titles:   financialDocs.map(f => f.title),
            concerns:     concerns.trim() || null,
            instructions: 'Use the knowledge_files in BUSINESS_CONTEXT for all numeric inputs. Look for P&L figures, bank balances, revenue and expense totals in the uploaded financial documents. State clearly which document each number came from and flag any assumptions.',
          })
        : JSON.stringify({
            starting_balance:         parseNumber(form.starting_balance),
            comfort_threshold:        parseNumber(form.comfort_threshold),
            typical_monthly_revenue:  parseNumber(form.typical_monthly_revenue),
            typical_monthly_expenses: parseNumber(form.typical_monthly_expenses),
            payroll_rhythm:           form.payroll_rhythm.trim()  || null,
            known_inflows:            form.known_inflows.trim()   || null,
            known_outflows:           form.known_outflows.trim()  || null,
            concerns:                 form.concerns.trim()        || null,
          })

      const raw = await runToolCall({
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'cash-flow',
        kind:      'generate',
        model:     HAIKU,
        systemPrompt,
        messages:  [{ role: 'user', content: userMessage }],
        maxTokens: 4000,
        json:      true,
      })

      const parsed = JSON.parse(raw)
      setResult(parsed)
      setMsgs([{
        role:    'assistant',
        content: "Here's your 13-week picture. Tell me to rerun under any assumption — losing a client, winning a retainer, delaying a purchase — and I'll reshape the whole plan.",
      }])
      setStage('result')
    } catch (err) {
      console.error('[cash-flow] generate failed', err)
      isCapExceeded(err) ? setCapError(err) : setError(err.message || 'Something went wrong building the projection.')
      setStage('form')
    }
  }

  // ── Refine ────────────────────────────────────────────────────────────────
  const handleRefine = async (userText) => {
    const text = userText.trim()
    if (!text || refining || !result) return

    const userTurn = { role: 'user', content: text }
    setMsgs(prev => [...prev, userTurn])
    setRefining(true)
    setError(null)

    try {
      const context = await buildAdvisorContext(profile.company_id)
      const systemPrompt = `${CASH_FLOW_REFINE_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      const raw = await runToolCall({
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'cash-flow',
        kind:      'refine',
        model:     HAIKU,
        systemPrompt,
        messages:  [{ role: 'user', content: JSON.stringify({
          original_brief: mode === 'qbo'  ? { data_source: 'quickbooks_live',   concerns }
                        : mode === 'docs' ? { data_source: 'uploaded_documents', concerns, doc_titles: financialDocs.map(f => f.title) }
                        : form,
          current_plan:   result,
          conversation:   [...messages, userTurn].map(m => ({ role: m.role, content: m.content })),
          request:        text,
        }) }],
        maxTokens: 4000,
        json:      true,
      })

      const parsed = JSON.parse(raw)
      if (parsed?.plan) setResult(parsed.plan)
      setMsgs(prev => [...prev, { role: 'assistant', content: parsed?.change_note || 'Updated.' }])
    } catch (err) {
      const content = isCapExceeded(err)
        ? `You've hit your monthly cap for this tool. Resets on the 1st of next month.`
        : "Hmm, I couldn't apply that — try rephrasing."
      setMsgs(prev => [...prev, { role: 'assistant', content, error: true }])
    } finally {
      setRefining(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!result || !profile?.company_id) return
    setStage('saving')
    try {
      const title = buildTitle(result)
      const { error: insertErr } = await supabase.from('documents').insert({
        company_id:  profile.company_id,
        user_id:     profile.id,
        tool_id:     'cash-flow',
        title,
        tags:        [],
        input_data:  mode === 'qbo'  ? { data_source: 'quickbooks_live',   concerns, context_summary: contextSummary }
                   : mode === 'docs' ? { data_source: 'uploaded_documents', concerns, context_summary: contextSummary }
                   : { ...form, context_summary: contextSummary },
        output_data: result,
      })
      if (insertErr) throw insertErr
      navigate('/documents?tool=cash-flow')
    } catch (err) {
      setError(err.message || 'Could not save to your library.')
      setStage('result')
    }
  }

  const handleStartOver = () => {
    setForm(INITIAL_FORM)
    setConcerns('')
    setResult(null)
    setMsgs([])
    setError(null)
    setStage('form')
  }

  // ── Views ─────────────────────────────────────────────────────────────────
  if (!qboLoaded) return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-ink-200 border-t-brand-500 animate-spin" />
    </div>
  )
  if (stage === 'loading') return <LoadingView />

  if (stage === 'result' || stage === 'saving') {
    return (
      <ResultView
        result={result}
        saving={stage === 'saving'}
        error={error}
        capError={capError}
        messages={messages}
        refining={refining}
        contextSummary={contextSummary}
        dataSource={mode === 'qbo' ? { type: 'qbo', snapshot: latestSnapshot }
                  : mode === 'docs' ? { type: 'docs', docs: financialDocs }
                  : null}
        onSave={handleSave}
        onStartOver={handleStartOver}
        onRefine={handleRefine}
      />
    )
  }

  // ── Form view — smart or manual ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-5xl mx-auto px-8 py-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-400">Cash Flow</div>
          <h1 className="text-xl font-bold text-white leading-tight">13-week cash runway</h1>
          <p className="text-xs text-ink-400 mt-0.5">See week-by-week when cash gets tight — and what to do about it.</p>
        </div>
      </div>
      <PageShell>
        {capError && <div className="mb-0"><CapExceededNotice err={capError} toolLabel="Cash Flow" /></div>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {/* Source selector tabs */}
        {(qboConnected || hasDocs) && (
          <div className="flex gap-2">
            {qboConnected && <SourceTab active={mode === 'qbo'} onClick={() => setMode('qbo')} icon="🔗" label="QuickBooks" />}
            {hasDocs && <SourceTab active={mode === 'docs'} onClick={() => setMode('docs')} icon="📄" label="Uploaded docs" />}
            <SourceTab active={mode === 'manual'} onClick={() => setMode('manual')} icon="✏️" label="Enter manually" />
          </div>
        )}

        {/* QBO mode */}
        {mode === 'qbo' && qboConnected && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-900">QuickBooks data ready</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Using <span className="font-semibold">{latestSnapshot?.period_label}</span>
                  {latestSnapshot?.synced_at && ` · synced ${formatRelative(latestSnapshot.synced_at)}`}.
                  Claude will pull your balance, revenue, and expenses directly from your books.
                </p>
              </div>
            </div>
            <SmartConcernsForm concerns={concerns} setConcerns={setConcerns} onGenerate={handleGenerate} buttonLabel="Generate from QuickBooks →" />
          </div>
        )}

        {/* Docs mode */}
        {mode === 'docs' && hasDocs && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-blue-900 mb-2">Using your uploaded financial documents</p>
              <div className="space-y-1.5">
                {financialDocs.map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-xs text-blue-800">
                    <span>📄</span>
                    <span className="font-medium truncate">{f.title}</span>
                    <span className="text-blue-500 flex-shrink-0">{new Date(f.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-3">Claude will read these files for your balance, revenue, and expense figures — and tell you which document each number came from.</p>
            </div>
            <SmartConcernsForm concerns={concerns} setConcerns={setConcerns} onGenerate={handleGenerate} buttonLabel="Generate from uploaded docs →" />
          </div>
        )}

        {/* Manual mode */}
        {mode === 'manual' && (
          <div className="space-y-4">
            {!qboConnected && !hasDocs && (
              <div className="flex gap-3">
                <Link to="/settings?tab=integrations" className="flex-1 group flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 hover:bg-brand-100 p-4 transition-colors">
                  <span className="text-xl flex-shrink-0">🔗</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-900">Connect QuickBooks</p>
                    <p className="text-xs text-brand-700 mt-0.5">Skip the form — pull numbers directly from your books.</p>
                  </div>
                  <span className="text-brand-500 self-center group-hover:translate-x-0.5 transition-transform ml-auto">→</span>
                </Link>
                <Link to="/documents?view=uploaded" className="flex-1 group flex items-start gap-3 rounded-2xl border border-ink-200 bg-ink-50 hover:bg-ink-100 p-4 transition-colors">
                  <span className="text-xl flex-shrink-0">📂</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-800">Upload a P&amp;L or bank export</p>
                    <p className="text-xs text-ink-500 mt-0.5">Claude reads the file so you don't have to retype it.</p>
                  </div>
                  <span className="text-ink-400 self-center group-hover:translate-x-0.5 transition-transform ml-auto">→</span>
                </Link>
              </div>
            )}
            <form onSubmit={handleGenerate} className="bg-white border border-ink-100 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field required label="Cash in the bank today" hint="Your main operating account. Round to the nearest thousand.">
                  <MoneyInput value={form.starting_balance} onChange={updateField('starting_balance')} placeholder="45000" autoFocus />
                </Field>
                <Field label="Comfort threshold" hint="The minimum you want to hold. Common rule: 1 payroll run + rent + tax buffer.">
                  <MoneyInput value={form.comfort_threshold} onChange={updateField('comfort_threshold')} placeholder="20000" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field required label="Typical monthly revenue" hint="What usually lands in the account each month.">
                  <MoneyInput value={form.typical_monthly_revenue} onChange={updateField('typical_monthly_revenue')} placeholder="60000" />
                </Field>
                <Field label="Typical monthly expenses" hint="All-in: payroll, rent, software, COGS, owner's draw.">
                  <MoneyInput value={form.typical_monthly_expenses} onChange={updateField('typical_monthly_expenses')} placeholder="52000" />
                </Field>
              </div>
              <Field label="Payroll rhythm" hint="When and how much — lets us land it in the right weeks.">
                <input type="text" value={form.payroll_rhythm} onChange={updateField('payroll_rhythm')} placeholder="Biweekly Fridays, about $18k per run." className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </Field>
              <Field label="Known big deposits in the next 13 weeks" hint="Retainer starts, milestone payments, tax refunds, loan draws.">
                <textarea value={form.known_inflows} onChange={updateField('known_inflows')} placeholder="Client X net-45, $24k landing week 6. GST refund around week 2, ~$3k." rows={3} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
              </Field>
              <Field label="Known big outflows in the next 13 weeks" hint="Quarterly taxes, equipment, bonuses, insurance renewal.">
                <textarea value={form.known_outflows} onChange={updateField('known_outflows')} placeholder="Q2 GST week 3 ~$4.5k. Equipment purchase week 8 ~$12k." rows={3} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
              </Field>
              <Field label="What are you worried about?" hint="Optional — shapes the commentary toward the thing keeping you up.">
                <textarea value={form.concerns} onChange={updateField('concerns')} placeholder="Covering July payroll — our biggest customer pays slow and I'm hiring another tech next month." rows={2} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
              </Field>
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={!canSubmitManual} className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">Project 13 weeks →</button>
                <Link to="/tools" className="text-sm text-ink-400 hover:text-ink-700">Cancel</Link>
              </div>
            </form>
          </div>
        )}
      </PageShell>
    </div>
  )
}

// ── Result view ───────────────────────────────────────────────────────────────

function ResultView({ result, saving, error, capError, messages, refining, contextSummary, dataSource, onSave, onStartOver, onRefine }) {
  const sourceLabel = dataSource?.type === 'qbo'
    ? `✓ Built from QuickBooks · ${dataSource.snapshot?.period_label} · synced ${formatRelative(dataSource.snapshot?.synced_at)}`
    : dataSource?.type === 'docs'
    ? `✓ Built from ${dataSource.docs?.length} uploaded document${dataSource.docs?.length === 1 ? '' : 's'}`
    : null

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-400">Cash Flow · 13-week projection</div>
            <h1 className="text-xl font-bold text-white leading-tight">Your cash runway</h1>
            {sourceLabel && <p className="text-xs text-green-400 mt-0.5">{sourceLabel}</p>}
          </div>
        </div>
      </div>
      <PageShell>
        {capError && <CapExceededNotice err={capError} toolLabel="Cash Flow" />}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <ContextUsedLine summary={contextSummary} />
        <div className="relative">
          {refining && (
            <div className="absolute top-3 right-4 inline-flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />Updating…
            </div>
          )}
          <CashFlowPlan data={result} />
        </div>
        <RefineChat messages={messages} refining={refining} onSend={onRefine} suggestions={CASH_SUGGESTIONS} placeholder="Assume a $15k/mo retainer starts in week 5. / We lost our biggest customer, rerun. / Add a $50k equipment purchase in week 4." />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onSave} disabled={saving || refining} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors">{saving ? 'Saving…' : 'Save to library'}</button>
          <button type="button" onClick={onStartOver} disabled={saving || refining} className="px-4 py-2.5 rounded-xl border border-ink-200 hover:bg-ink-50 text-sm text-ink-700 font-medium transition-colors">Start over</button>
          <span className="text-xs text-ink-400 ml-auto">Saved projections appear in <Link to="/documents" className="underline hover:text-ink-700">Library</Link>.</span>
        </div>
      </PageShell>
    </div>
  )
}

// ── Layout wrapper ────────────────────────────────────────────────────────────

function PageShell({ children, wide }) {
  return (
    <div className={`max-w-5xl mx-auto px-8 py-6 space-y-5`}>
      {children}
    </div>
  )
}

// ── Loading states ────────────────────────────────────────────────────────────

const CASH_STEPS = [
  { label: 'Reading your financial data',    sub: 'Pulling balance, revenue, and expense figures', delay: 0 },
  { label: 'Mapping your cash inflows',      sub: 'Revenue timing, retainers, and expected deposits', delay: 4000 },
  { label: 'Lining up your outflows',        sub: 'Payroll, taxes, equipment, and known expenses', delay: 10000 },
  { label: 'Finding the tight spots',        sub: 'Weeks where cash gets dangerously close to the floor', delay: 16000 },
  { label: 'Building the week-by-week plan', sub: '13 weeks of projected cash position', delay: 22000 },
  { label: 'Writing the commentary',         sub: 'Plain-English explanation of what to watch and when', delay: 28000 },
]

function LoadingView() {
  const [activeStep, setActiveStep] = useState(0)
  useEffect(() => {
    const timers = CASH_STEPS.slice(1).map((s, i) => setTimeout(() => setActiveStep(i + 1), s.delay))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-semibold tracking-widest uppercase mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Cash Flow
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Your 13-week projection</h2>
        <p className="text-sm text-ink-500 mt-1.5">Usually 20–30 seconds</p>
      </div>
      <div className="w-full max-w-xs space-y-1">
        {CASH_STEPS.map((step, i) => {
          const isDone = i < activeStep, isActive = i === activeStep
          return (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-700 ${isActive ? 'bg-brand-500/10 border border-brand-500/25 shadow-[0_0_20px_rgba(245,158,11,0.08)]' : isDone ? 'bg-white/[0.03]' : 'opacity-25'}`}>
              <div className="flex-shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center">
                {isDone ? <span className="text-[13px] font-bold text-green-400">✓</span>
                  : isActive ? <span className="inline-block w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                  : <span className="inline-block w-2 h-2 rounded-full bg-ink-700" />}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold leading-snug transition-colors duration-500 ${isDone ? 'text-ink-500' : isActive ? 'text-white' : 'text-ink-600'}`}>{step.label}</p>
                {isActive && <p className="text-xs text-ink-500 mt-0.5 leading-snug">{step.sub}</p>}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-10 text-xs text-ink-700 text-center max-w-xs leading-relaxed">
        Week-by-week so payroll never sneaks up on you.
      </p>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MoneyInput({ value, onChange, placeholder, autoFocus }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-ink-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
    </div>
  )
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <div className="flex items-baseline gap-1 mb-1.5">
        <span className="text-sm font-semibold text-ink-800">{label}</span>
        {required && <span className="text-red-400 text-xs">*</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </label>
  )
}

// ── Source tab pill ───────────────────────────────────────────────────────────

function SourceTab({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
        active
          ? 'bg-ink-900 text-white border-ink-900'
          : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}

// ── Shared concerns form (used by QBO + docs modes) ───────────────────────────

function SmartConcernsForm({ concerns, setConcerns, onGenerate, buttonLabel }) {
  return (
    <div className="bg-white border border-ink-200 rounded-2xl p-6">
      <label className="block">
        <p className="text-sm font-semibold text-ink-800 mb-1">Anything specific you're watching?</p>
        <p className="text-xs text-ink-400 mb-3">Optional — shapes the commentary toward what's on your mind.</p>
        <textarea
          value={concerns}
          onChange={e => setConcerns(e.target.value)}
          placeholder="e.g. Covering July payroll, our biggest client pays slow and we're hiring next month…"
          rows={3}
          autoFocus
          className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm text-ink-800 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
        />
      </label>
      <button
        type="button"
        onClick={onGenerate}
        className="mt-4 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
      >
        {buttonLabel}
      </button>
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CASH_SUGGESTIONS = [
  'Assume a $15k/mo retainer starts in week 5',
  'We lost our biggest customer — rerun',
  'Skip owner pay for 2 weeks',
  'Add a $50k equipment purchase in week 4',
  'What if I raise prices 10% starting next month?',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNumber(s) {
  if (s == null) return null
  const cleaned = String(s).replace(/[^\d.-]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function buildTitle(result) {
  const when   = new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  const runway = result?.runway_weeks != null ? ` · ${result.runway_weeks}wk runway` : ''
  return `Cash Flow${runway} · ${when}`
}
