import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { runToolCall, HAIKU } from '../../lib/anthropic'
import { isCapExceeded } from '../../lib/usage'
import { buildAdvisorContext } from '../../lib/advisorContext'
import { summarizeContext } from '../../lib/toolContextSummary'
import GBPAudit from '../../components/tools/GBPAudit'
import CapExceededNotice from '../../components/tools/CapExceededNotice'
import RefineChat from '../../components/tools/RefineChat'
import ContextUsedLine from '../../components/tools/ContextUsedLine'
import {
  fetchGBPSnapshot,
  GBPNotFoundError,
  formatRating,
  snapshotToListingText,
} from '../../lib/gbp'

/**
 * GBP Optimizer — /tools/gbp
 *
 * Audits the owner's Google Business Profile against the five dimensions
 * Google actually rewards (completeness, reviews, content, local signals,
 * engagement) and produces a do-it-today / this-week / this-month plan.
 *
 * Five-stage FSM:
 *   1. 'form'     owner enters business name + city; can either auto-fetch
 *                 via Places API OR fall through to a manual paste-in.
 *   2. 'loading'  Claude runs the audit against the profile + website + the
 *                 fetched-or-pasted listing.
 *   3. 'result'   audit grade + category bars + quick wins + etc.; refine chat
 *   4. 'saving'   insert into `documents` → redirect to /documents?tool=gbp-optimizer
 *
 * Why auto-fetch + paste fallback:
 *   The ideal flow is "type your name, click, done". Places API handles
 *   that for ~95% of listings. But small businesses with generic names, brand-
 *   new listings, or listings under a different legal name sometimes don't
 *   resolve. Rather than making the owner re-search five times, we keep the
 *   manual paste visible as an escape hatch below the auto-fetch UX.
 *
 * Business_name + city pre-fill from business_profiles (location). Everything
 * auto-filled is editable — the owner's ground truth beats Places' guess.
 */

const INITIAL_FORM = {
  // Auto-fetch query
  find_query:        '',

  // Audit brief — these four sharpen Claude's output significantly.
  // The Places snapshot handles the raw listing data; these fields give
  // intent and context the API can't see.
  top_jobs:          '',
  customer_phrases:  '',
  competitors:       '',
  known_weakness:    '',

  // Fallback paste (only used if auto-fetch fails to find the listing)
  manual_listing:    '',
}

export default function GBP() {
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

  // Fetch state — null means "owner hasn't tried auto-fetch yet". Once the
  // owner clicks "find", this becomes either { snapshot } or { error: ... }.
  const [snapshot, setSnapshot]   = useState(null)
  const [fetching, setFetching]   = useState(false)
  const [fetchError, setFetchErr] = useState(null)

  // On mount: restore the last saved audit (if any) so the page stays
  // populated between navigations — same pattern as the CFO tool.
  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false
    ;(async () => {
      const [bpRes, docRes] = await Promise.all([
        supabase
          .from('business_profiles')
          .select('business_name, location')
          .eq('company_id', profile.company_id)
          .maybeSingle(),
        supabase
          .from('documents')
          .select('id, title, created_at, input_data, output_data')
          .eq('company_id', profile.company_id)
          .eq('tool_id', 'gbp-optimizer')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      if (cancelled) return

      // Pre-fill find_query from business profile (zero-friction default)
      if (bpRes.data) {
        setForm(prev => {
          if (prev.find_query) return prev
          const parts = [bpRes.data.business_name, bpRes.data.location].filter(Boolean)
          return { ...prev, find_query: parts.join(' ').trim() }
        })
      }

      // Restore last saved audit
      if (docRes.data) {
        const doc = docRes.data
        const outputData = doc.output_data
        const parsed = typeof outputData === 'string'
          ? (() => { try { return JSON.parse(outputData) } catch { return outputData } })()
          : outputData

        setResult(parsed)
        if (doc.input_data?.form)     setForm(doc.input_data.form)
        if (doc.input_data?.snapshot) setSnapshot(doc.input_data.snapshot)
        if (doc.input_data?.context_summary) setContextSummary(doc.input_data.context_summary)
        setMessages([{
          role:    'assistant',
          content: "Here's your most recent GBP audit. Want to tweak anything, or run a fresh one below?",
        }])
        setStage('result')
      }
    })()
    return () => { cancelled = true }
  }, [profile?.company_id])

  // Submit is enabled when we have EITHER a fetched snapshot OR a manual
  // paste of at least 50 chars. Without one of those, the audit would just
  // be speculation from the business profile — no good.
  const canSubmit =
    (!!snapshot || form.manual_listing.trim().length >= 50) &&
    !!profile?.company_id

  const updateField = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  // -------- auto-fetch --------
  const handleFind = async () => {
    const query = form.find_query.trim()
    if (!query || fetching) return
    setFetching(true)
    setFetchErr(null)
    try {
      const result = await fetchGBPSnapshot(query)
      setSnapshot(result)
    } catch (err) {
      console.error('[gbp-optimizer] fetch failed', err)
      setFetchErr(
        err instanceof GBPNotFoundError
          ? err.message
          : err.message || 'Could not fetch GBP data'
      )
      setSnapshot(null)
    } finally {
      setFetching(false)
    }
  }

  const handleClearSnapshot = () => {
    setSnapshot(null)
    setFetchErr(null)
  }

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
      const promptKey     = 'GBP_OPTIMIZER_PROMPT'
      const stableContext = `\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      // Build the current_listing blob the prompt expects. Either we synthesise
      // it from the Places snapshot, or we use the owner's manual paste
      // verbatim when auto-fetch couldn't find the listing.
      const currentListing = snapshot
        ? snapshotToListingText(snapshot)
        : form.manual_listing.trim()

      const userMessage = JSON.stringify({
        business_name:    snapshot?.display_name || null,
        gbp_url:          snapshot?.maps_uri || null,
        current_listing:  currentListing,
        service_area:     snapshot?.formatted_address || null,
        business_type:    'service_area',
        top_jobs:         form.top_jobs.trim() || null,
        customer_phrases: form.customer_phrases.trim() || null,
        competitors:      form.competitors.trim() || null,
        known_weakness:   form.known_weakness.trim() || null,
        auto_fetched:     snapshot || null,
        owner_name:       profile?.name?.split(' ')[0] || null,
      })

      const raw = await runToolCall({
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'gbp-optimizer',
        kind:      'generate',
        model:     HAIKU,
        promptKey,
        stableContext,
        messages:   [{ role: 'user', content: userMessage }],
        maxTokens:  16000,
        json:       true,
      })

      const parsed = safeParseJson(raw)
      setResult(parsed)
      setMessages([{
        role:    'assistant',
        content: "Here's the audit. Want a different tone on the description? Drop the event posts? Swap the primary category? Tell me what's off and I'll rework it.",
      }])
      setStage('result')
    } catch (err) {
      console.error('[gbp-optimizer] generate failed', err)
      if (isCapExceeded(err)) {
        setCapError(err)
      } else {
        setError(err.message || 'Something went wrong building the audit.')
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
      const promptKey     = 'GBP_OPTIMIZER_REFINE_PROMPT'
      const stableContext = `\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      const userPayload = JSON.stringify({
        original_brief: form,
        current_audit:  result,
        conversation:   [...messages, userTurn].map(m => ({
          role:    m.role,
          content: m.content,
        })),
        request:        text,
      })

      const raw = await runToolCall({
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'gbp-optimizer',
        kind:      'refine',
        model:     HAIKU,
        promptKey,
        stableContext,
        messages:   [{ role: 'user', content: userPayload }],
        maxTokens:  16000,
        json:       true,
      })

      const parsed = safeParseJson(raw)
      if (parsed?.audit) setResult(parsed.audit)

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: parsed?.change_note || 'Updated.' },
      ])
    } catch (err) {
      console.error('[gbp-optimizer] refine failed', err)
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
      const title = buildTitle(snapshot?.display_name || form.find_query || 'Profile', result.audit_grade)
      const { error: insertErr } = await supabase.from('documents').insert({
        company_id:  profile.company_id,
        user_id:     profile.id,
        tool_id:     'gbp-optimizer',
        title,
        tags:        [],
        input_data:  { form, snapshot, context_summary: contextSummary },
        output_data: result,
      })
      if (insertErr) throw insertErr
      navigate('/documents?tool=gbp-optimizer')
    } catch (err) {
      console.error('[gbp-optimizer] save failed', err)
      setError(err.message || 'Could not save to your library.')
      setStage('result')
    }
  }

  const handleStartOver = () => {
    setForm(INITIAL_FORM)
    setResult(null)
    setMessages([])
    setError(null)
    setSnapshot(null)
    setFetchErr(null)
    setStage('form')
  }

  // ============================================================== views

  if (stage === 'loading') {
    return <LoadingView name={snapshot?.display_name || form.find_query} />
  }

  if (stage === 'result' || stage === 'saving') {
    return (
      <ResultView
        snapshot={snapshot}
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
      snapshot={snapshot}
      fetching={fetching}
      fetchError={fetchError}
      onFind={handleFind}
      onClearSnapshot={handleClearSnapshot}
    />
  )
}

// ============================================================== FormView

function FormView({
  form, canSubmit, error, capError, onChange, onSubmit,
  snapshot, fetching, fetchError, onFind, onClearSnapshot,
}) {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-5xl mx-auto px-8 py-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-400">📍 Local & AI Visibility</div>
          <h1 className="text-xl font-bold text-white leading-tight">Show up on Google — and in AI search</h1>
          <p className="text-xs text-ink-400 mt-0.5">GBP audit · website SEO · citations · backlinks · schema · AI search readiness — all in one run.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6">
        {capError && <div className="mb-4"><CapExceededNotice err={capError} toolLabel="Local & AI Visibility" /></div>}
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <form onSubmit={onSubmit} className="bg-white border border-ink-100 rounded-2xl overflow-hidden shadow-sm">

          {/* ── Step 1: Find listing ───────────────────────────────────────── */}
          <div className="px-6 pt-6 pb-5 border-b border-ink-100">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Step 1 — Find your Google listing
            </p>

            {snapshot ? (
              <FoundRow snapshot={snapshot} onClear={onClearSnapshot} />
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.find_query}
                    onChange={onChange('find_query')}
                    placeholder="Business name + city, e.g. Newcastle Plumbing Co, NSW"
                    disabled={fetching}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15 disabled:bg-gray-50 disabled:text-gray-400 transition"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onFind() } }}
                  />
                  <button
                    type="button"
                    onClick={onFind}
                    disabled={fetching || !form.find_query.trim()}
                    className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    {fetching ? 'Searching…' : 'Find listing'}
                  </button>
                </div>
                {fetchError && (
                  <p className="mt-2 text-xs text-red-600">{fetchError}</p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  We pull your categories, reviews, hours, and photos directly from Google.
                </p>
              </>
            )}
          </div>

          {/* ── Step 2: About your business ───────────────────────────────── */}
          <div className="px-6 py-5 space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Step 2 — About your business
              <span className="ml-1.5 normal-case font-normal text-gray-300">optional — each field sharpens the output</span>
            </p>

            {/* 2-col question grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Jobs you want more of" hint="e.g. hot water, emergency callouts, renos">
                <textarea
                  value={form.top_jobs}
                  onChange={onChange('top_jobs')}
                  placeholder="Your 2–3 most profitable service types"
                  rows={3}
                  className="w-full px-2.5 py-2 border border-ink-200 rounded-lg text-sm bg-white outline-none resize-y transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-300/30"
                />
              </FormField>

              <FormField label="What customers say about you" hint="Phrases from your best reviews">
                <textarea
                  value={form.customer_phrases}
                  onChange={onChange('customer_phrases')}
                  placeholder="e.g. Always on time, fair pricing, no mess"
                  rows={3}
                  className="w-full px-2.5 py-2 border border-ink-200 rounded-lg text-sm bg-white outline-none resize-y transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-300/30"
                />
              </FormField>

              <FormField label="Main competitors" hint="Who shows up when customers search you">
                <textarea
                  value={form.competitors}
                  onChange={onChange('competitors')}
                  placeholder="e.g. Smith Bros Plumbing, Aqua Fix Newcastle"
                  rows={3}
                  className="w-full px-2.5 py-2 border border-ink-200 rounded-lg text-sm bg-white outline-none resize-y transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-300/30"
                />
              </FormField>

              <FormField label="What's weak right now" hint="No posts? Bad photos? Missing from directories?">
                <textarea
                  value={form.known_weakness}
                  onChange={onChange('known_weakness')}
                  placeholder="e.g. Haven't posted in months, no job-site photos"
                  rows={3}
                  className="w-full px-2.5 py-2 border border-ink-200 rounded-lg text-sm bg-white outline-none resize-y transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-300/30"
                />
              </FormField>
            </div>

            {/* Manual paste — only when no snapshot */}
            {!snapshot && <ManualFallback value={form.manual_listing} onChange={onChange('manual_listing')} />}

            {/* Submit */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                Run local SEO audit →
              </button>
              <Link to="/tools" className="text-sm text-gray-400 hover:text-gray-600">
                Cancel
              </Link>
              {!canSubmit && !snapshot && form.manual_listing.trim().length < 50 && !fetching && (
                <span className="text-xs text-gray-400 ml-auto">Find your listing to continue</span>
              )}
            </div>
          </div>
        </form>

        <p className="text-xs text-ink-400 mt-3 text-center">Nothing is saved until you click "Save to library".</p>
      </div>

    </div>
  )
}

// ── Found listing row (compact) ───────────────────────────────────────────────

function FoundRow({ snapshot, onClear }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
      <span className="flex-shrink-0 text-green-500 font-bold text-base leading-none mt-0.5">✓</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{snapshot.display_name}</span>
          {snapshot.formatted_address && (
            <span className="text-xs text-gray-500">{snapshot.formatted_address}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {snapshot.categories?.primary_display && (
            <Chip>{snapshot.categories.primary_display}</Chip>
          )}
          <Chip>⭐ {formatRating(snapshot.reviews)}</Chip>
          {snapshot.photos_available > 0 && <Chip>📸 {snapshot.photos_available} photos</Chip>}
          {snapshot.website && <Chip>🌐 Website</Chip>}
          {snapshot.phone && <Chip>📞 Phone</Chip>}
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
      >
        Change
      </button>
    </div>
  )
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium bg-white border border-green-200 text-green-800 px-2 py-0.5 rounded-full">
      {children}
    </span>
  )
}

// ── Manual paste fallback ─────────────────────────────────────────────────────

function ManualFallback({ value, onChange }) {
  return (
    <details className="group border-t border-gray-100 pt-4">
      <summary className="flex items-center justify-between cursor-pointer list-none text-sm text-gray-500 hover:text-gray-700">
        <span>Can't find your listing? Paste it manually</span>
        <span className="text-gray-300 group-open:rotate-180 transition-transform text-xs" aria-hidden>▾</span>
      </summary>
      <div className="mt-3">
        <textarea
          value={value}
          onChange={onChange}
          placeholder={MANUAL_PLACEHOLDER}
          rows={8}
          className="w-full px-2.5 py-2 border border-ink-200 rounded-lg text-xs font-mono bg-white outline-none resize-y transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-300/30"
        />
        <p className="text-xs text-gray-400 mt-1">
          Category, hours, description, services, review count, photo count — more detail = sharper audit.
        </p>
      </div>
    </details>
  )
}

const MANUAL_PLACEHOLDER = `Primary category: Plumber
Hours: Mon–Fri 7a–5p, Sat 8a–12p
Reviews: 47 total, 4.7⭐, last review 3 months ago
Photos: ~20, mostly logo + truck, no job shots
Recent posts: none since Nov
Q&A: 2 unanswered`

function FormField({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-800 block mb-1">{label}</span>
      {hint && <span className="text-xs text-gray-400 block mb-1.5">{hint}</span>}
      {children}
    </label>
  )
}

// ============================================================== LoadingView

const AUDIT_STEPS = [
  {
    label: 'Locking in your listing',
    sub:   'Pulling your GBP data straight from Google',
    delay: 0,
  },
  {
    label: 'Finding your #1 ranking gap',
    sub:   'Comparing your signals against the local pack leaders',
    delay: 5000,
  },
  {
    label: 'Sizing up the competition',
    sub:   'Benchmarking reviews, categories, and content depth',
    delay: 12000,
  },
  {
    label: 'Mapping your keywords',
    sub:   'Identifying the service terms Google actually rewards',
    delay: 20000,
  },
  {
    label: 'Auditing your website',
    sub:   'On-page signals, schema, and local landing pages',
    delay: 28000,
  },
  {
    label: 'Building your ranking playbook',
    sub:   'Turning every gap into a prioritised move',
    delay: 36000,
  },
]

function LoadingView({ name }) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timers = AUDIT_STEPS.slice(1).map((step, i) =>
      setTimeout(() => setActiveStep(i + 1), step.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center px-6">

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-semibold tracking-widest uppercase mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Local & AI Visibility
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {name || 'Your business'}
        </h2>
        <p className="text-sm text-ink-500 mt-1.5">Usually 30–60 seconds</p>
      </div>

      {/* Step list */}
      <div className="w-full max-w-xs space-y-1">
        {AUDIT_STEPS.map((step, i) => {
          const isDone   = i < activeStep
          const isActive = i === activeStep

          return (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-700 ${
                isActive  ? 'bg-brand-500/10 border border-brand-500/25 shadow-[0_0_20px_rgba(99,102,241,0.08)]' :
                isDone    ? 'bg-white/[0.03]' :
                            'opacity-25'
              }`}
            >
              {/* State icon */}
              <div className="flex-shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center">
                {isDone ? (
                  <span className="text-[13px] font-bold text-green-400">✓</span>
                ) : isActive ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                ) : (
                  <span className="inline-block w-2 h-2 rounded-full bg-ink-700" />
                )}
              </div>

              {/* Label + subtitle */}
              <div className="min-w-0">
                <p className={`text-sm font-semibold leading-snug transition-colors duration-500 ${
                  isDone   ? 'text-ink-500' :
                  isActive ? 'text-white'   :
                             'text-ink-600'
                }`}>
                  {step.label}
                </p>
                {isActive && (
                  <p className="text-xs text-ink-500 mt-0.5 leading-snug">
                    {step.sub}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="mt-10 text-xs text-ink-700 text-center max-w-xs leading-relaxed">
        Benchmarking against real local pack leaders to find exactly what's keeping you out of position #1.
      </p>
    </div>
  )
}

// ============================================================== ResultView

function ResultView({ snapshot, form, result, saving, error, capError, messages, refining, contextSummary, onSave, onStartOver, onRefine }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-brand-400">📍 Local & AI Visibility · {snapshot?.display_name || form.find_query || 'Your business'}</div>
            <h1 className="text-xl font-bold text-white leading-tight">Your local & AI visibility audit</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-5">
        {capError && <CapExceededNotice err={capError} toolLabel="Local & AI Visibility" />}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <ContextUsedLine summary={contextSummary} />

        <div className="bg-white border border-ink-100 rounded-xl shadow-sm p-5 md:p-6 relative">
          {refining && (
            <div className="absolute top-3 right-4 inline-flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2 py-1 rounded-full z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />Updating…
            </div>
          )}
          <GBPAudit data={result} />
        </div>

        <RefineChat messages={messages} refining={refining} onSend={onRefine} suggestions={GBP_SUGGESTIONS}
          placeholder="Drop the event posts — we don't do events. Replace with customer-story posts." />

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
            Saved audits appear in <Link to="/documents" className="underline hover:text-ink-700">Documents</Link>.
          </span>
        </div>
      </div>
    </div>
  )
}

const GBP_SUGGESTIONS = [
  'Rewrite the description — less salesy, more direct',
  'Focus the backlinks on local trade associations',
  'I\'m service-area only, no storefront — rework the photo list',
  'I\'m already at 100+ reviews — update the review strategy',
  'Add more commercial keywords, less residential',
  'Simplify the schema section — I\'m on Squarespace',
]

// ============================================================== JSON helpers

/**
 * Parse JSON with a truncation-repair fallback.
 *
 * The GBP audit JSON is large (~8–12k tokens). If the model hits the token
 * ceiling mid-response the raw string is valid up to the cut point but
 * unclosed. Strategy:
 *   1. Try JSON.parse normally — fast path for valid responses.
 *   2. Walk the string tracking open brackets/braces and whether we're inside
 *      a string literal. Close anything left open and retry.
 *   3. If repair still fails, re-throw the original error so the caller's
 *      catch block shows a proper error to the user.
 */
function safeParseJson(raw) {
  try {
    return JSON.parse(raw)
  } catch (firstErr) {
    try {
      return JSON.parse(repairJson(raw))
    } catch {
      throw firstErr
    }
  }
}

function repairJson(s) {
  const stack  = []   // tracks expected closing chars
  let inString = false
  let escaped  = false

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (escaped)                      { escaped = false; continue }
    if (c === '\\' && inString)       { escaped = true;  continue }
    if (c === '"')                    { inString = !inString; continue }
    if (inString)                     continue
    if (c === '{')                    stack.push('}')
    else if (c === '[')               stack.push(']')
    else if (c === '}' || c === ']')  stack.pop()
  }

  let out = s
  // Close an open string first, then close all open containers
  if (inString) out += '"'
  while (stack.length > 0) out += stack.pop()
  return out
}

// ============================================================== helpers

/**
 * "GBP · Newcastle Plumbing · B+" — reads cleanly in the library and lets
 * the owner scan grade-over-time across re-runs.
 */
function buildTitle(businessName, grade) {
  const name  = (businessName || 'Profile').trim()
  const gradeBit = grade ? ` · ${grade}` : ''
  return `GBP · ${name}${gradeBit}`
}
