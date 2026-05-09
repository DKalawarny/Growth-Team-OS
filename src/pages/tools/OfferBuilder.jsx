import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { runToolCall, SONNET } from '../../lib/anthropic'
import { isCapExceeded } from '../../lib/usage'
import { OFFER_BUILDER_PROMPT, OFFER_REFINE_PROMPT } from '../../lib/prompts'
import { buildAdvisorContext } from '../../lib/advisorContext'
import { summarizeContext } from '../../lib/toolContextSummary'
import OfferBuilderCard from '../../components/tools/OfferBuilderCard'
import CapExceededNotice from '../../components/tools/CapExceededNotice'
import RefineChat from '../../components/tools/RefineChat'
import ContextUsedLine from '../../components/tools/ContextUsedLine'

/**
 * Offer Builder — /tools/offer-builder
 *
 * Flow (same shape as Hiring + Exit Readiness):
 *   1. 'form'     owner describes the offer and pricing context
 *   2. 'loading'  we call Claude with the brief + BUSINESS_CONTEXT (the
 *                 uploaded financials genuinely sharpen pricing here)
 *   3. 'result'   scoped offer rendered; owner can refine via chat
 *   4. 'saving'   insert into `documents` with tool_id = 'offer-builder'
 *
 * Why this tool matters:
 *   Two problems every small business has. (1) Pricing — owners habitually
 *   underprice. (2) Scope — "I thought that was included" is where margin
 *   gets burned. This tool bolts both together into a single artefact the
 *   owner can paste into a proposal or discovery call.
 *
 * Form design:
 *   Seven fields, two required. The rest are optional because this tool is
 *   run in two very different modes:
 *     A) Pricing a brand-new offer they haven't sold yet
 *     B) Repricing an existing offer that feels underpriced
 *   Required fields cover both modes; optional fields help when the owner
 *   has more context to share (e.g. their current price, competitor pricing).
 */

const INITIAL_FORM = {
  offer_name:        '',   // "12-month HVAC maintenance plan"
  target_customer:   '',   // "Commercial property managers with 5+ rooftop units"
  outcome:           '',   // "Never get a surprise service call in peak summer"
  current_scope:     '',   // what they'd deliver (in bullets/prose)
  current_price:     '',   // optional: what they charge today
  pricing_hesitation:'',   // optional: "I think I'm undercharging" / "Losing to cheaper competitors" / etc.
  delivery_mode:     '',   // "project" | "retainer" | "subscription" | "one-time" — free text
}

export default function OfferBuilder() {
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

  const canSubmit = form.offer_name.trim() && form.target_customer.trim()
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
      const systemPrompt = `${OFFER_BUILDER_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      const userMessage = JSON.stringify({
        offer_name:         form.offer_name.trim(),
        target_customer:    form.target_customer.trim(),
        outcome:            form.outcome.trim() || null,
        current_scope:      form.current_scope.trim() || null,
        current_price:      form.current_price.trim() || null,
        pricing_hesitation: form.pricing_hesitation.trim() || null,
        delivery_mode:      form.delivery_mode.trim() || null,
      })

      // Offer output has tiers + objection handlers + rationale — plenty of
      // structured prose. 3000 tokens leaves room for a premium-length offer
      // without cutting objection handlers short.
      const raw = await runToolCall({
        model:     SONNET,
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'offer-builder',
        kind:      'generate',
        systemPrompt,
        messages:  [{ role: 'user', content: userMessage }],
        maxTokens: 3000,
        json:      true,
      })

      const parsed = JSON.parse(raw)
      setResult(parsed)
      setMsgs([{
        role:    'assistant',
        content: "Here's the first pass. Push the price up, rework the tiers, rewrite the positioning — whatever you want to change, tell me.",
      }])
      setStage('result')
    } catch (err) {
      console.error('[offer-builder] generate failed', err)
      if (isCapExceeded(err)) {
        setCapError(err)
      } else {
        setError(err.message || 'Something went wrong building the offer.')
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
      const systemPrompt = `${OFFER_REFINE_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      const userPayload = JSON.stringify({
        original_brief:  form,
        current_offer:   result,
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
        toolId:    'offer-builder',
        kind:      'refine',
        systemPrompt,
        messages:  [{ role: 'user', content: userPayload }],
        maxTokens: 3000,
        json:      true,
      })

      const parsed = JSON.parse(raw)
      if (parsed?.offer) setResult(parsed.offer)

      setMsgs(prev => [
        ...prev,
        { role: 'assistant', content: parsed?.change_note || 'Updated.' },
      ])
    } catch (err) {
      console.error('[offer-builder] refine failed', err)
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
      const title = buildTitle(form.offer_name)
      const { error: insertErr } = await supabase.from('documents').insert({
        company_id:  profile.company_id,
        user_id:     profile.id,
        tool_id:     'offer-builder',
        title,
        tags:        [],
        input_data:  { ...form, context_summary: contextSummary },
        output_data: result,
      })
      if (insertErr) throw insertErr
      navigate('/documents?tool=offer-builder')
    } catch (err) {
      console.error('[offer-builder] save failed', err)
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

  if (stage === 'loading') return <LoadingView name={form.offer_name} />

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

// ============================================================== subviews

function FormView({ form, canSubmit, error, capError, onChange, onSubmit }) {
  return (
    <div className="min-h-screen bg-ink-50">

      {/* ── Header ── */}
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-brand-400">
            💰 Offer Builder
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight mb-2">
            Turn what you do into a package that's easy to sell — and easy to price.
          </h1>
          <p className="text-sm text-ink-400 leading-relaxed">
            Describe a service you sell — a maintenance contract, a renovation package, a recurring job type.
            We'll define exactly what's included, recommend a price you can defend, and give you word-for-word
            responses when a customer says <em className="text-ink-300">"that seems expensive."</em>
          </p>

          {/* What you'll get */}
          <div className="flex flex-wrap gap-3 mt-5">
            {[
              { icon: '📋', label: 'Clear scope', sub: 'What\'s in and what\'s not — in writing' },
              { icon: '💲', label: 'Right price', sub: 'With a rationale you can explain' },
              { icon: '🗣️', label: 'Sales responses', sub: 'For every objection buyers raise' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-white/6 border border-white/10 rounded-xl px-4 py-3 min-w-0">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold text-white">{item.label}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-5">

        {capError && <CapExceededNotice err={capError} toolLabel="Offer Builder" />}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        {/* Optional upload nudge */}
        <Link to="/documents?view=uploaded"
          className="group flex items-center gap-4 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 hover:border-brand-300 px-5 py-3.5 transition-colors">
          <span className="text-xl flex-shrink-0">📂</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-brand-900">
              Have a past proposal, price list, or P&L?
            </span>
            <span className="text-xs text-brand-700 ml-1.5">
              Upload it first — we'll price against your real margins, not a guess.
            </span>
          </div>
          <span className="text-brand-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>

        <form onSubmit={onSubmit} className="bg-white border border-ink-100 rounded-xl shadow-sm p-6 space-y-6">

          <Field
            required
            label="What service or package are you pricing?"
            hint='Give it a name. e.g. "Annual HVAC maintenance plan", "Bathroom renovation package", "Monthly lawn care contract".'
          >
            <input
              type="text"
              value={form.offer_name}
              onChange={onChange('offer_name')}
              placeholder="Annual HVAC maintenance plan"
              autoFocus
            />
          </Field>

          <Field
            required
            label="Who's the ideal customer for this?"
            hint="The more specific, the better the pricing. Think about the type of customer, their situation, and where they're located."
          >
            <input
              type="text"
              value={form.target_customer}
              onChange={onChange('target_customer')}
              placeholder="Commercial property managers in Alberta with 5+ rooftop units"
            />
          </Field>

          <Field
            label="What problem does this solve for the customer?"
            hint="What are they stressed about that this takes off their plate? What's better for them after working with you?"
          >
            <textarea
              value={form.outcome}
              onChange={onChange('outcome')}
              placeholder="No surprise breakdowns in the middle of summer. One flat fee, no call-out charges — they know exactly what they're spending."
              rows={2}
              className="w-full"
            />
          </Field>

          <Field
            label="What do you actually deliver?"
            hint="List it out — visits, response times, reports, parts, labour. The clearer this is, the better the scope protection."
          >
            <textarea
              value={form.current_scope}
              onChange={onChange('current_scope')}
              placeholder={`- 4 scheduled service visits per year\n- Priority response — on-site within 2 hours\n- Annual compliance sign-off letter\n- All labour included; parts at cost + 10%`}
              rows={4}
              className="w-full"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field
              label="What do you charge today? (if anything)"
              hint="Leave blank if this is a new service. We'll recommend a starting price."
            >
              <input
                type="text"
                value={form.current_price}
                onChange={onChange('current_price')}
                placeholder="$1,800/year"
              />
            </Field>
            <Field
              label="How do you bill for this?"
              hint="One-time job? Monthly contract? Annual fee paid upfront? This shapes the pricing structure."
            >
              <input
                type="text"
                value={form.delivery_mode}
                onChange={onChange('delivery_mode')}
                placeholder="Annual contract, billed monthly"
              />
            </Field>
          </div>

          <Field
            label="What makes pricing this hard?"
            hint="Be honest — we'll address it directly. The more context you give, the more useful the output."
          >
            <textarea
              value={form.pricing_hesitation}
              onChange={onChange('pricing_hesitation')}
              placeholder="I think I'm undercharging compared to competitors but I'm nervous about raising prices on my existing customers."
              rows={2}
              className="w-full"
            />
          </Field>

          <div className="flex items-center gap-3 pt-1 border-t border-ink-50">
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              Build my pricing →
            </button>
            <Link to="/tools" className="text-sm text-ink-400 hover:text-ink-600">Cancel</Link>
            <span className="ml-auto text-xs text-ink-400">Takes about 20–30 seconds</span>
          </div>
        </form>

        <p className="text-xs text-ink-400 text-center pb-4">
          Your answers + business profile are sent to Claude. Nothing is saved until you click "Save to library".
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

const OFFER_STEPS = [
  { label: 'Reading your business context',   sub: 'Pulling your margins, revenue stage, and financials', delay: 0 },
  { label: 'Scoping the offer',               sub: 'Defining what\'s in, what\'s out, and what to guard against', delay: 4000 },
  { label: 'Researching market pricing',      sub: 'Benchmarking against what buyers in your niche actually pay', delay: 10000 },
  { label: 'Building the tiers',              sub: 'Good / better / best structure that maximises capture', delay: 17000 },
  { label: 'Writing the objection handlers',  sub: 'The pushbacks you\'ll hear and how to answer them', delay: 23000 },
  { label: 'Finalising your offer',           sub: 'Price anchoring, rationale, and positioning', delay: 29000 },
]

function LoadingView({ name }) {
  const [activeStep, setActiveStep] = useState(0)
  useEffect(() => {
    const timers = OFFER_STEPS.slice(1).map((s, i) => setTimeout(() => setActiveStep(i + 1), s.delay))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-semibold tracking-widest uppercase mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Offer Builder
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{name || 'Your offer'}</h2>
        <p className="text-sm text-ink-500 mt-1.5">Usually 20–35 seconds</p>
      </div>
      <div className="w-full max-w-xs space-y-1">
        {OFFER_STEPS.map((step, i) => {
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
        Pricing anchored to your real margins — not a guess.
      </p>
    </div>
  )
}

function ResultView({ form, result, saving, error, capError, messages, refining, contextSummary, onSave, onStartOver, onRefine }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-400">💰 Offer Builder</div>
            <h1 className="text-xl font-bold text-white leading-tight">{form.offer_name || 'Your offer'}</h1>
            <p className="text-xs text-ink-400 mt-0.5">Scope · Pricing · Sales responses — ready to use or refine below.</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-5">
        {capError && <CapExceededNotice err={capError} toolLabel="Offer Builder" />}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <ContextUsedLine summary={contextSummary} />

        <div className="bg-white border border-ink-100 rounded-xl shadow-sm p-5 md:p-6 relative">
          {refining && (
            <div className="absolute top-3 right-4 inline-flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2 py-1 rounded-full z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />Updating…
            </div>
          )}
          <OfferBuilderCard data={result} />
        </div>

        <RefineChat messages={messages} refining={refining} onSend={onRefine}
          suggestions={OFFER_SUGGESTIONS}
          placeholder="Push the price up 20%. / Drop the middle tier. / Rewrite objection handlers — I'm B2B not B2C." />

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
            Saved offers appear in <Link to="/documents" className="underline hover:text-ink-700">Documents</Link>.
          </span>
        </div>
      </div>
    </div>
  )
}

const OFFER_SUGGESTIONS = [
  'Push the price up 20%',
  'Make this a retainer, not a project',
  'Drop the Premium tier',
  'Add a pay-in-full discount',
  'Less salesy, more plain-language',
]

// ============================================================== helpers

/**
 * "12-month HVAC maintenance plan · Apr 2026" — date keeps the library
 * chronological when the owner iterates the same offer over time.
 */
function buildTitle(offerName) {
  const when = new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  const name = (offerName || 'Offer').trim()
  return `${name} · ${when}`
}
