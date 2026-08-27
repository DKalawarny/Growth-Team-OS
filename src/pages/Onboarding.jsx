import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { callClaude, SONNET, HAIKU } from '../lib/anthropic'
import { buildAdvisorContext } from '../lib/advisorContext'
import { REVENUE_OPTIONS } from '../lib/stageEngine'
import { fetchWebsiteContent } from '../lib/websiteScraper'
import { assignMilestoneDates, buildDependencyUpdates } from '../lib/milestoneDates'
import ShowHimTheBusiness from '../components/onboarding/ShowHimTheBusiness'
import {
  INDUSTRY_OPTIONS,
  TEAM_SIZE_OPTIONS,
  PROFIT_OPTIONS,
  HOURS_OPTIONS,
  GOAL_OPTIONS,
  GOAL_TIMELINE_OPTIONS,
} from '../lib/businessProfileOptions'

/**
 * Onboarding wizard — 5 steps, 10 questions, ~3 minutes.
 *
 * The fifth step asks the owner, in his own words, what the business is for.
 * It is optional, it is not a dropdown of pious options, and it is stored in
 * solomon_memory (source 'onboarding') rather than business_profiles — because
 * it is a durable statement the advisor should read on every turn, which is
 * exactly what that table exists for.
 *
 * Split-screen layout: dark branded left panel + clean form right panel.
 */

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  {
    title:       'About you',
    description: 'Who you are and what you do.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    panel: {
      headline: 'Your business,\nunderstood.',
      sub: 'Ten minutes now, and Solomon stops giving you advice that could be for anyone.',
      bullets: [
        'Roadmap tailored to your industry and stage',
        'Advice grounded in your actual numbers',
        'Reads your website so it already knows you',
      ],
    },
    fields: [
      { name: 'full_name',     label: 'Your full name',      type: 'text' },
      { name: 'business_name', label: 'Company name',        type: 'text',
        hint: 'However it appears on an invoice.' },
      { name: 'website',       label: 'Website (optional)',  type: 'text',
        placeholder: 'yourcompany.com',
        hint: "We'll read it so the roadmap is specific to your business.",
        optional: true },
      { name: 'industry',      label: 'Industry',            type: 'select', options: INDUSTRY_OPTIONS,
        hint: 'The closest fit is fine — it sets the benchmarks we compare you against.' },
    ],
  },
  {
    title:       'Your operation',
    description: 'Where, who with, and how much of your time.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
    panel: {
      headline: 'Sized to what you\nactually have.',
      sub: "Whether it's just you or a crew of thirty, the plan fits the hours you really have.",
      bullets: [
        'Steps that fit the time you actually have',
        'Advice that accounts for who is already on the team',
        'The right authority for your province, not a generic one',
      ],
    },
    fields: [
      { name: 'location',       label: 'City / region',           type: 'text', placeholder: 'e.g. Calgary, AB',
        hint: 'Where you mostly work. Decides which employment and safety authority we point you to.' },
      { name: 'team_size',      label: 'Team size',               type: 'select', options: TEAM_SIZE_OPTIONS,
        hint: 'Everyone you pay, including yourself and regular subcontractors.' },
      { name: 'hours_per_week', label: 'Hours you work per week', type: 'select', options: HOURS_OPTIONS,
        hint: 'Honestly, not contractually. Evenings and weekends count.' },
    ],
  },
  {
    title:       'The numbers',
    description: "Rough ranges are fine — we'll sharpen these with your books later.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    panel: {
      headline: 'Rough is fine.\nHonest matters.',
      sub: "Nobody is auditing this. A ballpark you believe beats a precise number you don't.",
      bullets: [
        'Compared against businesses at your size, not a national average',
        'Cash forecasting once he knows where you stand',
        'Connect QuickBooks later and he uses the real figures instead',
      ],
    },
    fields: [
      { name: 'last_revenue',    label: 'Last year revenue',    type: 'select', options: REVENUE_OPTIONS,
        hint: 'Total sales for your last full year, before any expenses come out.' },
      { name: 'current_revenue', label: 'Where this year is tracking', type: 'select', options: REVENUE_OPTIONS,
        hint: 'If the rest of the year looks like the last few months, what would the year total? Up on last year, pick the higher band.' },
      { name: 'profit',          label: 'Profit margin',        type: 'select', options: PROFIT_OPTIONS,
        hint: 'NET — what is left after everything, including your own pay. Most owner-operated businesses land between 5% and 15%. "Not sure" is a real answer and Solomon can help you find it.' },
    ],
  },
  {
    title:       'Your goals',
    description: 'Two quick answers and your roadmap is ready.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    panel: {
      headline: 'A roadmap built\nfor your goals.',
      sub: 'Solomon sequences 8–12 milestones across your timeline — nothing generic.',
      bullets: [
        'Ordered so the things that unblock other things come first',
        'Balanced across everything you picked, not just the loudest one',
        'Real dates, so a slipped one is visible rather than quietly forgotten',
      ],
    },
    fields: [
      { name: 'primary_goal',  label: 'Primary goals',           type: 'goals',
        hint: 'Pick as many as apply — the roadmap will balance them.' },
      { name: 'goal_timeline', label: 'Timeline for those goals', type: 'select', options: GOAL_TIMELINE_OPTIONS,
        hint: 'When you want this to be true by. It sets the dates on your roadmap, so pick something you would actually hold yourself to.' },
    ],
  },
  {
    // ⭐ The one question that makes this product different from a business
    // dashboard. Everything above it is facts a spreadsheet could hold; this
    // is the owner's own reason, in his own words, and Solomon reads it on
    // every turn from day one.
    //
    // Deliberately OPTIONAL and deliberately not a checklist of pious-sounding
    // options. An owner who is asked to pick "glorify God" from a dropdown has
    // been handed a gimmick, and the brand rule is that we do not do gimmicks.
    // Blank is a perfectly good answer and costs him nothing.
    title:       'What this is for',
    description: "One question, in your own words. Skip it if you'd rather not.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"/>
      </svg>
    ),
    panel: {
      headline: 'The part a\nspreadsheet misses.',
      sub: 'Solomon reads this before every answer he gives you.',
      bullets: [
        'Why you run it the way you do',
        "What you won't do, even when it costs you",
        'What you want it to look like in ten years',
      ],
    },
    fields: [
      { name: 'why_statement', label: 'Why do you run this business?', type: 'textarea',
        placeholder: "There's no wrong answer. Something like: it pays for four families, not just mine — and I want to be able to look anyone I've worked with in the eye afterwards.",
        hint: 'Optional. He reads it before every answer — change or delete it any time under Context.',
        optional: true },
    ],
  },
]

const INITIAL_FORM = {
  full_name: '', business_name: '', website: '', industry: '',
  location: '', team_size: '', hours_per_week: '',
  last_revenue: '', current_revenue: '', profit: '',
  primary_goal: [], goal_timeline: '', why_statement: '',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate()
  const { refresh, session } = useAuth()

  const [stepIndex, setStepIndex]   = useState(0)
  const [form, setForm]             = useState(INITIAL_FORM)
  const [phase, setPhase]           = useState('form')     // 'form' | 'generating' | 'error'
  const [genStatus, setGenStatus]   = useState('')
  const [genStep, setGenStep]       = useState(0)          // 0-4 for the generating progress steps
  // ⚠️ companyId is created inside handleGenerate (the create_company RPC), and
  // useAuth() here only carries { refresh, session } — there is no `profile` in
  // scope on this page. The document screen needs both ids, so they are parked
  // here on the way past rather than re-derived from a context that may not
  // have refreshed yet.
  const [docsCtx, setDocsCtx]       = useState(null)       // { companyId, userId }
  const [error, setError]           = useState(null)
  const [direction, setDirection]   = useState('forward')  // for slide animation hint

  const step       = STEPS[stepIndex]
  const totalSteps = STEPS.length
  const isLastStep = stepIndex === totalSteps - 1

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  function fieldIsFilled(field) {
    if (field.optional) return true
    const v = form[field.name]
    if (Array.isArray(v)) return v.length > 0
    return typeof v === 'string' && v.trim() !== ''
  }

  function currentStepIsValid() { return step.fields.every(fieldIsFilled) }

  function handleNext(e) {
    e.preventDefault()
    if (!currentStepIsValid()) return
    setDirection('forward')
    setStepIndex(i => Math.min(i + 1, totalSteps - 1))
  }

  function handleBack() {
    setDirection('back')
    setStepIndex(i => Math.max(i - 1, 0))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!currentStepIsValid()) return
    setPhase('generating')
    setError(null)
    setGenStep(0)

    try {
      setGenStatus('Setting up your workspace…'); setGenStep(1)
      const { data: companyId, error: rpcError } = await supabase.rpc(
        'bootstrap_company',
        { p_company_name: form.business_name, p_full_name: form.full_name }
      )
      if (rpcError) throw new Error(`Could not create your company: ${rpcError.message}`)

      let websiteContent = null
      if (form.website?.trim()) {
        setGenStatus('Reading your website…'); setGenStep(2)
        websiteContent = await fetchWebsiteContent(form.website)
      } else {
        setGenStep(2)
      }

      setGenStatus('Saving your answers…'); setGenStep(3)
      const { error: bpError } = await supabase
        .from('business_profiles')
        .upsert(
          {
            company_id: companyId, business_name: form.business_name,
            industry: form.industry, location: form.location,
            team_size: form.team_size, last_revenue: form.last_revenue,
            current_revenue: form.current_revenue, profit: form.profit,
            hours_per_week: form.hours_per_week, primary_goal: form.primary_goal,
            goal_timeline: form.goal_timeline,
            website: form.website?.trim() || null, website_content: websiteContent,
          },
          { onConflict: 'company_id' }
        )
      if (bpError) throw new Error(`Could not save your answers: ${bpError.message}`)

      // The owner's own reason goes to solomon_memory, not business_profiles —
      // it is a durable statement the advisor reads on every turn, which is
      // what that table is for.
      //
      // Fire-and-forget on purpose: a failure here must never cost the owner
      // an onboarding he has already finished. He can add it later under
      // /context, and the statement is capped at 400 chars to match the
      // table's own check constraint rather than letting the insert 400.
      const why = form.why_statement?.trim()
      if (why) {
        supabase
          .from('solomon_memory')
          .insert({
            company_id: companyId,
            user_id:    session?.user?.id ?? null,
            kind:       'context',
            statement:  why.slice(0, 400),
            source:     'onboarding',
          })
          .then(({ error }) => {
            if (error) console.warn('[onboarding] could not save why_statement:', error.message)
          })
      }

      setGenStatus(websiteContent
        ? 'Analysing your website and building your roadmap…'
        : 'Building your personalised roadmap…'
      )
      setGenStep(4)

      const raw = await callClaude({
        model: SONNET,
        promptKey: 'ROADMAP_SYSTEM_PROMPT',
        messages: [{ role: 'user', content: JSON.stringify(buildProfilePayload(form, websiteContent)) }],
        maxTokens: 4000,
        json: true,
      })

      const parsed = safeParseMilestones(raw)
      if (!parsed || !Array.isArray(parsed.milestones) || parsed.milestones.length === 0) {
        // Log the raw response so engineers can diagnose bad output even
        // though the user only sees the generic "try again" message.
        // Useful when Claude returns prose instead of JSON, an empty array,
        // or a different schema after a prompt change.
        console.error('[Onboarding] AI_PARSE_FAILED — raw response:', raw)
        throw new Error('AI_PARSE_FAILED')
      }

      setGenStatus('Saving your roadmap…'); setGenStep(5)
      const datedMilestones = assignMilestoneDates(parsed.milestones)
      const rows = datedMilestones.map((m, i) => ({
        company_id: companyId,
        title: String(m.title ?? '').slice(0, 200),
        description: m.description ?? null,
        timeframe: m.timeframe ?? null,
        category: m.category ?? null,
        actions: Array.isArray(m.actions) ? m.actions : [],
        books: Array.isArray(m.books) ? m.books : [],
        sort_order: i,
        start_date: m.start_date ?? null,
        end_date: m.end_date ?? null,
        weight: sanitizeWeight(m.weight),
      }))

      const { data: insertedRows, error: msError } = await supabase
        .from('milestones').insert(rows).select('id')
      if (msError) throw new Error(`Could not save your roadmap: ${msError.message}`)

      const depUpdates = buildDependencyUpdates(parsed.milestones, insertedRows ?? [])
      if (depUpdates.length > 0) {
        // depends_on is metadata used by the Roadmap UI to grey out blocked
        // milestones. If it fails to save the roadmap still works — the user
        // just sees every milestone as immediately startable. Don't fail the
        // whole onboarding over it, but DO log so we can spot a regression.
        const depResults = await Promise.all(depUpdates.map(u =>
          supabase.from('milestones').update({ depends_on: u.depends_on }).eq('id', u.id)
        ))
        const depErrors = depResults.filter(r => r.error)
        if (depErrors.length > 0) {
          console.warn('[Onboarding] Some milestone dependencies failed to save:', depErrors.map(r => r.error.message))
        }
      }

      // ── First-session wow moment ─────────────────────────────────────────
      // Generate Solomon's first personalised message right now, while they're
      // watching the loader, so when they land on /advisor it's already there.
      // Best-effort — if it fails, we still navigate them through.
      setGenStatus('Solomon is reading your setup…'); setGenStep(6)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          const ctx = await buildAdvisorContext(companyId, { userId: user.id })
          const ownerFirst = form.full_name?.split(' ')[0] ?? 'there'
          // ⚠️ These were bare `promptKey, stableContext,` referencing variables
          // that do not exist in this scope — my scripted prompt migration
          // rewrote the call site but left the local named systemPrompt and
          // never defined the two it started passing. The call failed, no
          // opener was written, and a freshly onboarded owner landed in an old
          // conversation with nothing acknowledging the setup he had just done.
          // It builds and it runs; only finishing onboarding reveals it.
          const openerContext = ctx
            ? `\n\nBUSINESS_CONTEXT:\n${JSON.stringify(ctx, null, 2)}`
            : ''
          const opener = await callClaude({
            model: HAIKU,
            promptKey:     'FIRST_SESSION_OPENER_PROMPT',
            stableContext: openerContext,
            messages: [{ role: 'user', content: `Send your first ever message to ${ownerFirst}. They just finished setting up.` }],
            maxTokens: 350,
          })
          if (opener) {
            await supabase.from('chat_messages').insert({
              company_id: companyId,
              user_id:    user.id,
              chat_type:  'advisor',
              role:       'assistant',
              content:    opener,
            })
            // Mark today as opened so Advisor doesn't generate a second opener.
            try {
              const d = new Date()
              const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              localStorage.setItem(`gos_morning_${user.id}_${today}`, '1')
            } catch { /* storage blocked — non-fatal */ }
          }
        }
      } catch (openerErr) {
        // Non-fatal — owner still lands on a working advisor, just without the
        // pre-generated opener. The Advisor will fall back to its own.
        // Logged so a persistent failure (e.g. cap exceeded, model change) is
        // visible during dev rather than silently degrading the wow moment.
        console.warn('[Onboarding] First-session opener failed (non-fatal):', openerErr)
      }

      await refresh()

      // Fire-and-forget welcome email. Non-fatal — navigate regardless.
      // Requires the send-email Edge Function to be deployed and Resend
      // domain verified (eliv8os.com). Silently skips if either is missing.
      ;(async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (authUser?.email) {
            await supabase.functions.invoke('send-email', {
              body: {
                template: 'user-welcome',
                to:       authUser.email,
                data:     { ownerName: form.full_name, companyName: form.business_name },
              },
            })
          }
        } catch { /* non-fatal — email is a nice-to-have, not a blocker */ }
      })()

      // ⭐ One more screen before the advisor: ask for documents.
      //
      // Placed AFTER generation on purpose. The roadmap already exists, so the
      // ask lands on someone who has just been given something rather than
      // someone still paying an entry fee — and the library analysis can feed a
      // roadmap that is already there. Putting it earlier would have delayed
      // the payoff behind a chore, which is how upload steps get skipped.
      setDocsCtx({ companyId, userId: session?.user?.id ?? null })
      setPhase('documents')
    } catch (err) {
      // Always log the underlying error so a failed onboarding is debuggable.
      // The user-facing message stays plain English — but engineers reading
      // the console get the stack + any wrapped Supabase / Anthropic detail.
      console.error('[Onboarding] Roadmap generation failed:', err)

      const msg = err.message === 'AI_PARSE_FAILED'
        ? "We couldn't read the AI's response. Try again — it usually works on the next try."
        : (err.message ?? 'Something went wrong. Please try again.')
      setError(msg)
      setPhase('error')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'generating') return <GeneratingScreen status={genStatus} genStep={genStep} />

  if (phase === 'documents' && docsCtx?.companyId) {
    return (
      <ShowHimTheBusiness
        companyId={docsCtx.companyId}
        userId={docsCtx.userId}
        onDone={() => navigate('/advisor')}
      />
    )
  }

  if (phase === 'error') {
    return (
      <SplitShell stepIndex={stepIndex}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-ink-900 mb-2">Something went wrong</h1>
          <p className="text-ink-500 text-sm mb-6 leading-relaxed max-w-sm mx-auto">{error}</p>
          <button
            onClick={handleSubmit}
            className="w-full bg-gold-gradient text-white rounded-xl px-4 py-3 text-sm font-bold tracking-wide glow-gold-sm hover:glow-gold transition-all duration-200 mb-3"
          >
            Try again
          </button>
          <button
            onClick={() => { setPhase('form'); setError(null) }}
            className="w-full text-ink-400 text-sm hover:text-ink-600 transition-colors"
          >
            ← Back to wizard
          </button>
        </div>
      </SplitShell>
    )
  }

  return (
    <SplitShell stepIndex={stepIndex}>
      {/* Step dots */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
              i < stepIndex
                ? 'bg-brand-500 text-white'
                : i === stepIndex
                  ? 'bg-ink-900 text-white ring-2 ring-brand-400 ring-offset-2'
                  : 'bg-ink-100 text-ink-400'
            }`}>
              {i < stepIndex ? (
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2 6l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 transition-all duration-500 ${i < stepIndex ? 'bg-brand-400' : 'bg-ink-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step heading */}
      <div className="mb-6">
        <p className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-500 mb-1.5">
          Step {stepIndex + 1} of {totalSteps}
        </p>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{step.title}</h1>
        <p className="text-ink-400 text-sm mt-1">{step.description}</p>
      </div>

      {/* Form */}
      <form onSubmit={isLastStep ? handleSubmit : handleNext} className="space-y-5">
        {step.fields.map(field => (
          <Field
            key={field.name}
            field={field}
            value={form[field.name]}
            onChange={v => set(field.name, v)}
          />
        ))}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="text-sm text-ink-400 hover:text-ink-700 disabled:opacity-0 transition-colors font-medium"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={!currentStepIsValid()}
            className="bg-gold-gradient text-white rounded-xl px-7 py-2.5 text-sm font-bold tracking-wide disabled:opacity-40 glow-gold-sm hover:glow-gold transition-all duration-200"
          >
            {isLastStep ? 'Build my roadmap →' : 'Continue →'}
          </button>
        </div>
      </form>
    </SplitShell>
  )
}

// ── Split shell ───────────────────────────────────────────────────────────────

function SplitShell({ stepIndex, children }) {
  const panel = STEPS[Math.min(stepIndex, STEPS.length - 1)].panel

  return (
    <div className="min-h-screen flex">
      {/* Left — dark branded panel */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] bg-ink-gradient flex-col justify-between p-12 relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <span className="text-white font-bold text-base tracking-tight">Eliv8 OS</span>
          </div>

          {/* Step-specific messaging */}
          <div key={stepIndex} className="animate-fade-in">
            <h2 className="text-3xl font-bold text-white leading-tight whitespace-pre-line mb-4">
              {panel.headline}
            </h2>
            <p className="text-ink-300 text-sm leading-relaxed mb-8">
              {panel.sub}
            </p>
            <ul className="space-y-3">
              {panel.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                      <path d="M2 6l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="text-ink-300 text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom trust line */}
        <p className="text-ink-600 text-xs">
          Takes about 3 minutes · Your data is private
        </p>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-ink-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-ink-100 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ field, value, onChange }) {
  const { name, label, type, options, placeholder, hint } = field
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">
        {label}
      </label>
      {hint && <p className="text-[11px] text-ink-400 mb-2 -mt-1">{hint}</p>}

      {type === 'text' && (
        <input id={name} type="text" value={value}
          onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}

      {type === 'select' && (
        <select id={name} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Choose one…</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}

      {type === 'textarea' && (
        <textarea
          id={name}
          rows={5}
          value={value}
          onChange={e => onChange(e.target.value.slice(0, 400))}
          placeholder={placeholder}
          className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
      )}

      {type === 'goals' && (
        <GoalMultiSelect value={value} onChange={onChange} />
      )}
    </div>
  )
}

function GoalMultiSelect({ value, onChange }) {
  const selected = Array.isArray(value) ? value : []
  function toggle(v) {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  }
  return (
    <div className="grid grid-cols-1 gap-2">
      {GOAL_OPTIONS.map(opt => {
        const isSelected = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`text-left border rounded-xl px-4 py-3 transition-all duration-150 flex items-center gap-3 ${
              isSelected
                ? 'border-brand-400 bg-brand-50/60 ring-1 ring-brand-400'
                : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50'
            }`}
          >
            <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
              isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-ink-300'
            }`}>
              {isSelected && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2 6l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-ink-900">{opt.label}</span>
              <span className="block text-xs text-ink-400 mt-0.5">{opt.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Generating screen ─────────────────────────────────────────────────────────

const GEN_STEPS = [
  'Creating your workspace',
  'Reading your website',
  'Saving your profile',
  'Building your roadmap with Solomon',
  'Wiring your milestones',
  'Solomon is reading your setup',
]

function GeneratingScreen({ status, genStep }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — same branded style */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] bg-ink-gradient flex-col justify-center p-12 relative overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <span className="text-white font-bold text-base tracking-tight">Eliv8 OS</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Almost there.
          </h2>
          <p className="text-ink-300 text-sm leading-relaxed">
            Solomon is sequencing your milestones, setting dates, and wiring dependencies. Your personalised roadmap will be ready in seconds.
          </p>
        </div>
      </div>

      {/* Right panel — step-by-step progress */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-ink-50">
        <div className="w-full max-w-md">
          {/* Spinner */}
          <div className="w-16 h-16 mx-auto mb-10 relative">
            <div className="absolute inset-0 rounded-full border-4 border-ink-200" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-400/40" />
            </div>
          </div>

          <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-brand-500 mb-2">
            Building your roadmap
          </p>
          <h2 className="text-center text-xl font-bold text-ink-900 mb-8">
            {status || 'Setting up…'}
          </h2>

          {/* Step checklist */}
          <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 space-y-4">
            {GEN_STEPS.map((label, i) => {
              const isDone    = i < genStep
              const isActive  = i === genStep - 1
              const isPending = i >= genStep
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isDone   ? 'bg-brand-500' :
                    isActive ? 'border-2 border-brand-400 bg-brand-50' :
                               'border-2 border-ink-200 bg-white'
                  }`}>
                    {isDone && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M2 6l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    )}
                  </div>
                  <span className={`text-sm transition-colors duration-200 ${
                    isDone   ? 'text-ink-400 line-through' :
                    isActive ? 'text-ink-900 font-semibold' :
                               'text-ink-300'
                  }`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-ink-400 mt-6">
            This takes 10–20 seconds
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildProfilePayload(form, websiteContent) {
  return {
    business_name: form.business_name, website: form.website?.trim() || null,
    industry: form.industry, location: form.location, team_size: form.team_size,
    hours_per_week: form.hours_per_week, last_revenue: form.last_revenue,
    current_revenue: form.current_revenue, profit_margin: form.profit,
    primary_goals: form.primary_goal, goal_timeline: form.goal_timeline,
    website_content: websiteContent,
  }
}

function safeParseMilestones(raw) {
  if (!raw) return null
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  try { return JSON.parse(trimmed) } catch {
    const start = trimmed.indexOf('{')
    const end   = trimmed.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    try { return JSON.parse(trimmed.slice(start, end + 1)) } catch { return null }
  }
}

function sanitizeWeight(w) {
  const n = Number(w)
  if (!Number.isFinite(n)) return 5
  return Math.max(1, Math.min(10, Math.round(n)))
}
