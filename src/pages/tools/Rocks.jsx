import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { runToolCall, HAIKU } from '../../lib/anthropic'
import { isCapExceeded } from '../../lib/usage'
import { ROCKS_TRACKER_PROMPT, ROCKS_REFINE_PROMPT } from '../../lib/prompts'
import { buildAdvisorContext } from '../../lib/advisorContext'
import { summarizeContext } from '../../lib/toolContextSummary'
import RocksPlan from '../../components/tools/RocksPlan'
import CapExceededNotice from '../../components/tools/CapExceededNotice'
import RefineChat from '../../components/tools/RefineChat'
import ContextUsedLine from '../../components/tools/ContextUsedLine'

/**
 * Rocks Tracker — /tools/rocks
 *
 * Generates a quarterly "Rocks" plan in the EOS / Traction tradition:
 *   3–5 company priorities, each with an owner, definition-of-done,
 *   weekly milestones, and traps. Plus the "what we're NOT doing" list,
 *   cross-rock risks, and a coined theme for the quarter.
 *
 * Four-stage FSM mirrors the other tools (Hiring, CFO, Cash Flow…):
 *   1. 'form'     owner picks a quarter, names a focus theme, describes team + constraints
 *   2. 'loading'  call Claude with BUSINESS_CONTEXT (roadmap + financials + check-ins)
 *   3. 'result'   render RocksPlan + RefineChat for swaps / reassignments
 *   4. 'saving'   insert into `documents` → redirect to /documents?tool=rocks-tracker
 *
 * Why the input is light:
 *   The richness lives in BUSINESS_CONTEXT — Claude already sees the roadmap's
 *   high-weight milestones, recent check-ins, and live financials. The owner
 *   only needs to surface the stuff Claude can't infer: this quarter's theme,
 *   team shape, and any constraints (cash tight, busy season, etc.).
 */

const INITIAL_FORM = {
  quarter_label:      currentQuarterLabel(),
  primary_focus:      '',
  team_context:       '',
  constraints:        '',
  specific_questions: '',
}

export default function Rocks() {
  const { profile }             = useAuth()
  const navigate                = useNavigate()
  const [stage, setStage]       = useState('form')
  const [form, setForm]         = useState(INITIAL_FORM)
  const [result, setResult]     = useState(null)
  const [messages, setMessages] = useState([])
  const [refining, setRefining] = useState(false)
  const [error, setError]       = useState(null)
  const [capError, setCapError] = useState(null)
  const [contextSummary, setContextSummary] = useState(null)

  // Focus theme is the only real requirement — everything else has a sensible
  // default or Claude can infer from BUSINESS_CONTEXT. Quarter label is pre-
  // filled so the owner only needs to override it for future quarters.
  const canSubmit =
    form.quarter_label.trim() &&
    form.primary_focus.trim() &&
    !!profile?.company_id

  const updateField = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  // -------- generate --------
  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setStage('loading')
    setError(null)
    setCapError(null)
    try {
      const context = await buildAdvisorContext(profile.company_id)
      setContextSummary(summarizeContext(context))
      const systemPrompt = `${ROCKS_TRACKER_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      const userMessage = JSON.stringify({
        quarter_label:      form.quarter_label.trim(),
        primary_focus:      form.primary_focus.trim(),
        team_context:       form.team_context.trim() || null,
        constraints:        form.constraints.trim() || null,
        specific_questions: form.specific_questions.trim() || null,
      })

      // 3–5 rocks × DoD × weekly milestones × traps + NOT-doing + risks. 3500
      // tokens keeps us clear of the ceiling even on a dense plan.
      const raw = await runToolCall({
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'rocks-tracker',
        kind:      'generate',
        model:     HAIKU,
        systemPrompt,
        messages:   [{ role: 'user', content: userMessage }],
        maxTokens:  3500,
        json:       true,
      })

      const parsed = JSON.parse(raw)
      setResult(parsed)
      setMessages([{
        role:    'assistant',
        content: "Here's your quarter. If a rock doesn't fit your team, tell me who should own it — or swap it entirely. You can also move rocks into 'NOT doing', change the theme, or tighten up a definition-of-done.",
      }])
      setStage('result')
    } catch (err) {
      console.error('[rocks-tracker] generate failed', err)
      if (isCapExceeded(err)) {
        setCapError(err)
      } else {
        setError(err.message || 'Something went wrong building the plan.')
      }
      setStage('form')
    }
  }

  // -------- refine --------
  const handleRefine = async (userText) => {
    const text = userText.trim()
    if (!text || refining || !result) return

    const userTurn = { role: 'user', content: text }
    setMessages(prev => [...prev, userTurn])
    setRefining(true)
    setError(null)

    try {
      const context = await buildAdvisorContext(profile.company_id)
      const systemPrompt = `${ROCKS_REFINE_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      const userPayload = JSON.stringify({
        original_brief: form,
        current_plan:   result,
        conversation:   [...messages, userTurn].map(m => ({
          role:    m.role,
          content: m.content,
        })),
        request:        text,
      })

      const raw = await runToolCall({
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'rocks-tracker',
        kind:      'refine',
        model:     HAIKU,
        systemPrompt,
        messages:   [{ role: 'user', content: userPayload }],
        maxTokens:  3500,
        json:       true,
      })

      const parsed = JSON.parse(raw)
      if (parsed?.plan) setResult(parsed.plan)

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: parsed?.change_note || 'Updated.' },
      ])
    } catch (err) {
      console.error('[rocks-tracker] refine failed', err)
      const content = isCapExceeded(err)
        ? `You've hit your monthly cap for this tool (${err.used}/${err.cap} runs). Resets on the 1st of next month.`
        : "Hmm, I couldn't apply that — try rephrasing, or hit Start over to rebuild from scratch."
      setMessages(prev => [
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
      const title = buildTitle(result.quarter_label || form.quarter_label, result.theme)
      const { error: insertErr } = await supabase.from('documents').insert({
        company_id:  profile.company_id,
        user_id:     profile.id,
        tool_id:     'rocks-tracker',
        title,
        tags:        [],
        input_data:  { ...form, context_summary: contextSummary },
        output_data: result,
      })
      if (insertErr) throw insertErr
      navigate('/documents?tool=rocks-tracker')
    } catch (err) {
      console.error('[rocks-tracker] save failed', err)
      setError(err.message || 'Could not save to your library.')
      setStage('result')
    }
  }

  const handleStartOver = () => {
    setForm(INITIAL_FORM)
    setResult(null)
    setMessages([])
    setError(null)
    setStage('form')
  }

  // ============================================================== views

  if (stage === 'loading') {
    return <LoadingView quarter={form.quarter_label} />
  }

  if (stage === 'result' || stage === 'saving') {
    return (
      <ResultView
        form={form}
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

// ============================================================== FormView

function FormView({ form, canSubmit, error, capError, onChange, onSubmit }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-5xl mx-auto px-8 py-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-400">
            🪨 Rocks Tracker
          </div>
          <h1 className="text-xl font-bold text-white leading-tight">
            Quarterly priorities, weekly status, zero spreadsheets
          </h1>
          <p className="text-xs text-ink-400 mt-0.5">
            3–5 company rocks with owners, definitions-of-done, and weekly milestones.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-5">
        {capError && <CapExceededNotice err={capError} toolLabel="Rocks Tracker" />}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <form onSubmit={onSubmit} className="bg-white border border-ink-100 rounded-xl shadow-sm p-6 space-y-5">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field required label="Quarter" hint="Which quarter are we planning?">
              <input type="text" value={form.quarter_label} onChange={onChange('quarter_label')} placeholder="Q2 2026" />
            </Field>
            <Field required label="Primary focus theme" hint="One word or phrase that captures this quarter's intent.">
              <input type="text" value={form.primary_focus} onChange={onChange('primary_focus')} placeholder="e.g. Revenue, Retention, Systems, Team" />
            </Field>
          </div>

          <Field label="Team context" hint="Who's on the team this quarter? Who can own a rock?">
            <textarea value={form.team_context} onChange={onChange('team_context')}
              placeholder="Me (owner). 2 senior techs who can each own a field rock. 1 office admin." rows={2} className="w-full" />
          </Field>

          <Field label="Constraints or headwinds" hint="Cash tight? Busy season? Key person away? Anything that limits what's realistic.">
            <textarea value={form.constraints} onChange={onChange('constraints')}
              placeholder="Summer is our peak — techs are at capacity June–Aug. Can't add overhead right now." rows={2} className="w-full" />
          </Field>

          <Field label="Specific questions you want answered" hint="Optional — anything specific you want the plan to address.">
            <textarea value={form.specific_questions} onChange={onChange('specific_questions')}
              placeholder="Should we make Google reviews a rock, or is it a weekly task?" rows={2} className="w-full" />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={!canSubmit}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
              Build the quarter →
            </button>
            <Link to="/tools" className="text-sm text-ink-400 hover:text-ink-600">Cancel</Link>
          </div>
        </form>

        <p className="text-xs text-ink-400 text-center pb-4">
          We send your inputs + your full roadmap + recent check-ins to Claude. The plan isn't saved until you hit "Save to library".
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

// ============================================================== LoadingView

const ROCKS_STEPS = [
  { label: 'Reading your roadmap',              sub: 'Pulling high-weight milestones and recent check-ins', delay: 0 },
  { label: 'Identifying this quarter\'s priorities', sub: 'What moves the needle most right now', delay: 4000 },
  { label: 'Assigning rock owners',             sub: 'Matching priorities to the right people on your team', delay: 10000 },
  { label: 'Setting definitions of done',       sub: 'What "complete" looks like for each rock', delay: 17000 },
  { label: 'Building weekly milestones',        sub: 'Breaking each rock into trackable checkpoints', delay: 23000 },
  { label: 'Writing your quarter plan',         sub: 'Theme, rocks, and what you\'re NOT doing', delay: 29000 },
]

function LoadingView({ quarter }) {
  const [activeStep, setActiveStep] = useState(0)
  useEffect(() => {
    const timers = ROCKS_STEPS.slice(1).map((s, i) => setTimeout(() => setActiveStep(i + 1), s.delay))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-semibold tracking-widest uppercase mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Rocks Tracker
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{quarter || 'Your quarter'}</h2>
        <p className="text-sm text-ink-500 mt-1.5">Usually 20–35 seconds</p>
      </div>
      <div className="w-full max-w-xs space-y-1">
        {ROCKS_STEPS.map((step, i) => {
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
        Built from your roadmap milestones — not guessed from scratch.
      </p>
    </div>
  )
}

// ============================================================== ResultView

function ResultView({ form, result, saving, error, capError, messages, refining, contextSummary, onSave, onStartOver, onRefine }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-400">🪨 Rocks Tracker</div>
            <h1 className="text-xl font-bold text-white leading-tight">{result?.quarter_label || form.quarter_label}</h1>
            {result?.theme && <p className="text-xs text-ink-400 mt-0.5">"{result.theme}"</p>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-5">
        {capError && <CapExceededNotice err={capError} toolLabel="Rocks Tracker" />}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <ContextUsedLine summary={contextSummary} />

        <div className="bg-white border border-ink-100 rounded-xl shadow-sm p-5 md:p-6 relative">
          {refining && (
            <div className="absolute top-3 right-4 inline-flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2 py-1 rounded-full z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />Updating…
            </div>
          )}
          <RocksPlan data={result} />
        </div>

        <RefineChat messages={messages} refining={refining} onSend={onRefine}
          suggestions={ROCKS_SUGGESTIONS}
          placeholder="Swap the third rock — we can't do that this quarter. / Move the Google reviews rock to NOT-doing. / Reassign the ops rock to Sarah." />

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
            Saved quarters appear in <Link to="/documents" className="underline hover:text-ink-700">Documents</Link>.
          </span>
        </div>
      </div>
    </div>
  )
}

const ROCKS_SUGGESTIONS = [
  'Sarah is on leave in May — reassign her rock',
  'Too ambitious, cut it to 3 rocks',
  'Add a cash-discipline rock, I\'m worried about June',
  'Reassign rock #2 to me — ops manager doesn\'t have capacity',
  'Make the weekly milestones less consultant-y',
]

// ============================================================== helpers

/**
 * "Rocks · Q2 2026 · Cash before scale" — reads cleanly in the library and
 * lets the owner scan across quarters. Trims the theme if it's unusually long.
 */
function buildTitle(quarterLabel, theme) {
  const q = (quarterLabel || 'Quarter').trim()
  const t = theme && theme.trim().length <= 40 ? ` · ${theme.trim()}` : ''
  return `Rocks · ${q}${t}`
}

/**
 * Default quarter label based on today's date. Used as the form default so
 * the owner doesn't have to type it for the most common case ("Rocks for
 * THIS quarter, starting now"). The business-year can vary but Jan–Mar = Q1
 * is the universal SMB convention — worth the pre-fill.
 */
function currentQuarterLabel() {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return `Q${q} ${now.getFullYear()}`
}
