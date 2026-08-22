import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { runToolCall, SONNET } from '../../lib/anthropic'
import { isCapExceeded } from '../../lib/usage'
import { buildAdvisorContext } from '../../lib/advisorContext'
import { summarizeContext } from '../../lib/toolContextSummary'
import ExitReadinessReport from '../../components/tools/ExitReadinessReport'
import CapExceededNotice from '../../components/tools/CapExceededNotice'
import RefineChat from '../../components/tools/RefineChat'
import ContextUsedLine from '../../components/tools/ContextUsedLine'

/**
 * Exit Readiness — /tools/exit-readiness
 *
 * Flow (mirrors Hiring Planner):
 *   1. 'form'     owner answers ~6 diagnostic questions about sellability
 *   2. 'loading'  we call Claude with answers + their BUSINESS_CONTEXT +
 *                 uploaded knowledge files (financials / SOPs sharpen the score)
 *   3. 'result'   weighted 8-driver report rendered; owner can refine via chat
 *   4. 'saving'   insert into `documents` with tool_id = 'exit-readiness'
 *
 * Why this tool matters:
 *   Most small-business owners can't get a straight answer on "what's my
 *   business worth?" without hiring a broker. This tool gives them a
 *   directionally-right sellability score + what to fix, grounded in their
 *   actual profile, roadmap, and uploaded docs.
 *
 * Why the questions are minimal:
 *   Every extra field is friction. The BUSINESS_CONTEXT already tells
 *   Claude the stage, revenue, goals, and roadmap. We ask only for the
 *   pieces that a profile couldn't capture — owner-off-tools feasibility,
 *   top customer %, contract mix, documented systems — i.e. the drivers
 *   that move the score most.
 */

const INITIAL_FORM = {
  owner_dependence:       '',  // "What breaks if you take 4 weeks off?"
  recurring_pct:          '',  // recurring/contracted share of revenue (0-100 or description)
  top_customer_pct:       '',  // % of revenue from the largest customer
  differentiation:        '',  // why customers pick you vs alternatives
  systems_state:          '',  // SOPs / playbooks / team training
  exit_timeline:          '',  // when do you want to sell / transition?
  deal_breaker:           '',  // optional — anything a buyer would see as a no-go
}

export default function ExitReadiness() {
  const { profile }          = useAuth()
  const navigate             = useNavigate()
  const [stage, setStage]    = useState('form')   // form | loading | result | saving
  const [form, setForm]      = useState(INITIAL_FORM)
  const [result, setResult]  = useState(null)
  const [messages, setMsgs]  = useState([])
  const [refining, setRefining] = useState(false)
  const [error, setError]    = useState(null)
  const [capError, setCapError] = useState(null)
  const [contextSummary, setContextSummary] = useState(null)

  const canSubmit = form.owner_dependence.trim() && form.recurring_pct.trim()
  const updateField = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  // -------- submit --------
  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!canSubmit || !profile?.company_id) return

    setStage('loading')
    setError(null)
    setCapError(null)
    try {
      const context = await buildAdvisorContext(profile.company_id)
      setContextSummary(summarizeContext(context))
      const promptKey     = 'EXIT_READINESS_PROMPT'
      const stableContext = `\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      const userMessage = JSON.stringify({
        owner_dependence:  form.owner_dependence.trim(),
        recurring_pct:     form.recurring_pct.trim(),
        top_customer_pct:  form.top_customer_pct.trim() || null,
        differentiation:   form.differentiation.trim() || null,
        systems_state:     form.systems_state.trim() || null,
        exit_timeline:     form.exit_timeline.trim() || null,
        deal_breaker:      form.deal_breaker.trim() || null,
      })

      // Bigger maxTokens than Hiring: 8 driver notes + strengths + risks +
      // quick_wins + books adds up. 3000 leaves headroom for a thorough pass.
      const raw = await runToolCall({
        model:     SONNET,
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'exit-readiness',
        kind:      'generate',
        promptKey,
        stableContext,
        messages:  [{ role: 'user', content: userMessage }],
        maxTokens: 3000,
        json:      true,
      })

      const parsed = JSON.parse(raw)
      setResult(parsed)
      setMsgs([{
        role:    'assistant',
        content: "Here's your sellability diagnostic. Push back on any score you think is off, add context I missed, or ask me to rescore under a different assumption (\"what if I hired a GM next year?\").",
      }])
      setStage('result')
    } catch (err) {
      console.error('[exit-readiness] generate failed', err)
      if (isCapExceeded(err)) {
        setCapError(err)
      } else {
        setError(err.message || 'Something went wrong generating the report.')
      }
      setStage('form')
    }
  }

  // -------- refine (chat) --------
  const handleRefine = async (userText) => {
    const text = userText.trim()
    if (!text || refining || !result) return

    const userTurn = { role: 'user', content: text }
    setMsgs(prev => [...prev, userTurn])
    setRefining(true)
    setError(null)

    try {
      const context = await buildAdvisorContext(profile.company_id)
      const promptKey     = 'EXIT_REFINE_PROMPT'
      const stableContext = `\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      const userPayload = JSON.stringify({
        original_brief:  form,
        current_report:  result,
        conversation:    [...messages, userTurn].map(m => ({
          role:    m.role,
          content: m.content,
        })),
        request:         text,
      })

      const raw = await runToolCall({
        model:     SONNET,
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'exit-readiness',
        kind:      'refine',
        promptKey,
        stableContext,
        messages:  [{ role: 'user', content: userPayload }],
        maxTokens: 3000,
        json:      true,
      })

      const parsed = JSON.parse(raw)
      if (parsed?.report) setResult(parsed.report)

      setMsgs(prev => [
        ...prev,
        {
          role:    'assistant',
          content: parsed?.change_note || 'Updated.',
        },
      ])
    } catch (err) {
      console.error('[exit-readiness] refine failed', err)
      const content = isCapExceeded(err)
        ? `You've hit your monthly cap for this tool (${err.used}/${err.cap} runs). Resets on the 1st of next month.`
        : "Hmm, I couldn't apply that — try rephrasing, or hit Start over to rebuild from scratch."
      setMsgs(prev => [
        ...prev,
        { role: 'assistant', content, error: true },
      ])
    } finally {
      setRefining(false)
    }
  }

  // -------- save --------
  const handleSave = async () => {
    if (!result || !profile?.company_id) return
    setStage('saving')
    try {
      const title = buildTitle(result)
      const { error: insertErr } = await supabase.from('documents').insert({
        company_id:  profile.company_id,
        user_id:     profile.id,
        tool_id:     'exit-readiness',
        title,
        tags:        [],
        input_data:  { ...form, context_summary: contextSummary },
        output_data: result,
      })
      if (insertErr) throw insertErr
      navigate('/documents?tool=exit-readiness')
    } catch (err) {
      console.error('[exit-readiness] save failed', err)
      setError(err.message || 'Could not save to your library.')
      setStage('result')
    }
  }

  const handleStartOver = () => {
    setForm(INITIAL_FORM)
    setResult(null)
    setMsgs([])
    setError(null)
    setStage('form')
  }

  // ============================================================== views

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
        onSave={handleSave}
        onStartOver={handleStartOver}
        onRefine={handleRefine}
      />
    )
  }

  return (
    <FormView
      form={form}
      canSubmit={canSubmit}
      error={error}
      capError={capError}
      onChange={updateField}
      onSubmit={handleGenerate}
    />
  )
}

// ============================================================== subviews

function FormView({ form, canSubmit, error, capError, onChange, onSubmit }) {
  return (
    <div className="min-h-screen bg-ink-50">

      {/* Dark header */}
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-5xl mx-auto px-8 py-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-400">
            🚪 Exit Readiness
          </div>
          <h1 className="text-xl font-bold text-white leading-tight">
            Score your business against what a buyer actually looks at
          </h1>
          <p className="text-xs text-ink-400 mt-0.5">
            Eight drivers. One score. The fixes that move the needle most.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-5">

        {capError && <CapExceededNotice err={capError} toolLabel="Exit Readiness" />}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        {/* Upload CTA */}
        <Link
          to="/documents?view=uploaded"
          className="group flex items-start gap-4 rounded-xl border-2 border-brand-200 bg-brand-50 hover:bg-brand-100 hover:border-brand-300 p-4 transition-colors"
        >
          <div className="text-3xl flex-shrink-0">📂</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-brand-900">Upload your financials or SOPs first for a sharper score</div>
            <p className="text-xs text-brand-800 mt-0.5">Solomon will read them directly — cite your actual margins, contract terms, and documented processes — instead of working from a profile alone.</p>
          </div>
          <div className="text-brand-600 text-xl flex-shrink-0 self-center group-hover:translate-x-0.5 transition-transform">→</div>
        </Link>

        <form onSubmit={onSubmit} className="bg-white border border-ink-100 rounded-xl shadow-sm p-6 space-y-5">

          <Field required label="What breaks if you take four weeks off?" hint="Be honest. This is the single biggest predictor of sale price for small businesses.">
            <textarea value={form.owner_dependence} onChange={onChange('owner_dependence')}
              placeholder="Estimating would stop. Two of our top five customers only deal with me. Nobody else knows our pricing logic."
              rows={3} className="w-full" />
          </Field>

          <Field required label="How much of your revenue is recurring or contracted?" hint="Retainers, maintenance contracts, subscriptions, multi-year agreements. Rough % is fine.">
            <input type="text" value={form.recurring_pct} onChange={onChange('recurring_pct')}
              placeholder="About 25% — 18 customers on monthly maintenance. The rest is one-off jobs." />
          </Field>

          <Field label="What % of your revenue comes from your biggest customer?" hint="If it's over 20%, buyers flinch. Over 40% and it's a discount-the-price conversation.">
            <input type="text" value={form.top_customer_pct} onChange={onChange('top_customer_pct')}
              placeholder="Top one is ~15%. Top three combined is ~38%." />
          </Field>

          <Field label="Why do customers pick you over competitors?" hint="The real answer, not the pitch-deck one.">
            <textarea value={form.differentiation} onChange={onChange('differentiation')}
              placeholder="We own the top 3 Google results for our service area. Same-day response is written into our contracts."
              rows={2} className="w-full" />
          </Field>

          <Field label="How documented are your systems?" hint={`From "it's all in my head" to "every role has an SOP a new hire could follow".`}>
            <textarea value={form.systems_state} onChange={onChange('systems_state')}
              placeholder="Field work is documented. Office / admin / pricing is not — that's all me."
              rows={2} className="w-full" />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="When would you want to exit?" hint="12 months, 3 years, 5+ years. Shapes which fixes are even worth starting.">
              <input type="text" value={form.exit_timeline} onChange={onChange('exit_timeline')}
                placeholder="3–5 years, but want the option sooner." />
            </Field>
            <Field label="Anything a buyer would see as a red flag?" hint="Lawsuit pending, key-person risk, revenue concentration, non-transferable contract.">
              <input type="text" value={form.deal_breaker} onChange={onChange('deal_breaker')}
                placeholder="Our biggest contract isn't assignable." />
            </Field>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={!canSubmit}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
              Score my business →
            </button>
            <Link to="/tools" className="text-sm text-ink-400 hover:text-ink-600">Cancel</Link>
          </div>
        </form>

        <p className="text-xs text-ink-400 text-center pb-4">
          We send your answers + business profile + uploaded knowledge files to Solomon. The report isn't saved until you hit "Save to library".
        </p>
      </div>
    </div>
  )
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <div className="mb-1">
        <span className="text-sm font-medium text-ink-800">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      </div>
      {children}
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </label>
  )
}

const EXIT_STEPS = [
  { label: 'Reading your business profile',    sub: 'Pulling revenue, team, roadmap, and uploaded docs', delay: 0 },
  { label: 'Assessing owner dependence',        sub: 'The single biggest driver of sale price for small businesses', delay: 5000 },
  { label: 'Scoring recurring revenue',         sub: 'Retainers and contracts add a valuation premium', delay: 11000 },
  { label: 'Checking customer concentration',   sub: 'Buyer risk flags and how exposed you are', delay: 18000 },
  { label: 'Rating your systems',               sub: 'From "in my head" to fully documented', delay: 24000 },
  { label: 'Building your exit playbook',       sub: 'Prioritised fixes that move the needle most', delay: 30000 },
]

function LoadingView() {
  const [activeStep, setActiveStep] = useState(0)
  useEffect(() => {
    const timers = EXIT_STEPS.slice(1).map((s, i) => setTimeout(() => setActiveStep(i + 1), s.delay))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-semibold tracking-widest uppercase mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Exit Readiness
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Scoring your business</h2>
        <p className="text-sm text-ink-500 mt-1.5">Usually 20–35 seconds</p>
      </div>
      <div className="w-full max-w-xs space-y-1">
        {EXIT_STEPS.map((step, i) => {
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
        Eight drivers, one sellability score, and the fixes worth doing before a buyer finds them.
      </p>
    </div>
  )
}

function ResultView({ result, saving, error, capError, messages, refining, contextSummary, onSave, onStartOver, onRefine }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-400">🚪 Exit Readiness</div>
            <h1 className="text-xl font-bold text-white leading-tight">Your sellability diagnostic</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-5">
        {capError && <CapExceededNotice err={capError} toolLabel="Exit Readiness" />}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <ContextUsedLine summary={contextSummary} />

        <div className="bg-white border border-ink-100 rounded-xl shadow-sm p-5 md:p-6 relative">
          {refining && (
            <div className="absolute top-3 right-4 inline-flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2 py-1 rounded-full z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />Updating…
            </div>
          )}
          <ExitReadinessReport data={result} />
        </div>

        <RefineChat messages={messages} refining={refining} onSend={onRefine}
          suggestions={EXIT_SUGGESTIONS}
          placeholder="I hired an ops manager since this — rescore owner dependence. / What if I doubled recurring revenue first?" />

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onSave} disabled={saving || refining}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
            {saving ? 'Saving…' : 'Save to library'}
          </button>
          <button type="button" onClick={onStartOver} disabled={saving || refining}
            className="px-4 py-2.5 rounded-xl border border-ink-200 hover:bg-ink-50 text-sm text-ink-700 font-medium transition-colors">
            Start over
          </button>
          <span className="text-xs text-ink-400 ml-auto">
            Saved reports appear in <Link to="/documents" className="underline hover:text-ink-700">Documents</Link>.
          </span>
        </div>
      </div>
    </div>
  )
}

const EXIT_SUGGESTIONS = [
  'Rescore assuming I hire a GM next year',
  'You\'re being generous on Owner Dependence',
  'Reorder the quick wins by leverage',
  'Less corporate, more plain-language',
  'Make the risks more specific',
]

// ============================================================== helpers

/**
 * "Exit Readiness · C+ · Apr 2026" — date keeps the library chronological
 * when the owner reruns the diagnostic. Grade in the title lets them scan
 * progress over time at a glance.
 */
function buildTitle(result) {
  const when  = new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  const grade = result?.grade ? ` · ${result.grade}` : ''
  return `Exit Readiness${grade} · ${when}`
}
