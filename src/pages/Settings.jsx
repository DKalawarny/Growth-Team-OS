import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { callClaude, SONNET } from '../lib/anthropic'
import { ROADMAP_SYSTEM_PROMPT } from '../lib/prompts'
import { fetchWebsiteContent } from '../lib/websiteScraper'
import { assignMilestoneDates, buildDependencyUpdates } from '../lib/milestoneDates'
import { REVENUE_OPTIONS } from '../lib/stageEngine'
import {
  INDUSTRY_OPTIONS,
  TEAM_SIZE_OPTIONS,
  PROFIT_OPTIONS,
  HOURS_OPTIONS,
  GOAL_OPTIONS,
  GOAL_TIMELINE_OPTIONS,
} from '../lib/businessProfileOptions'
import IntegrationsSection from '../components/settings/IntegrationsSection'
import UsageSection from '../components/settings/UsageSection'
import BillingSection from '../components/settings/BillingSection'
import {
  createInvite,
  listInvites,
  revokeInvite,
  listAdvisors,
  removeAdvisor,
  buildInviteUrl,
} from '../lib/invites'

/**
 * Settings — edit your business profile answers any time after onboarding.
 *
 * Two separate actions live on this page:
 *   1. Save changes — updates business_profiles. Cheap, no AI involved.
 *      If you changed the website URL, we re-scrape it so website_content
 *      stays current.
 *   2. Regenerate roadmap — wipes all milestones and re-runs the Claude
 *      prompt against the current profile. Destructive (completed milestones
 *      are lost) so we confirm first.
 *
 * Splitting the two actions matters: a typo fix shouldn't force an
 * AI re-run, and regenerating shouldn't require changing anything first.
 */

// Field definitions used to render the form and persist updates. Keeping
// them as data (not JSX) means we can map over the list once and compose
// inputs based on `type`.
const FIELDS = [
  { name: 'business_name',   label: 'Company name',         type: 'text',   section: 'Business' },
  { name: 'website',         label: 'Website',              type: 'text',   section: 'Business',
    placeholder: 'yourcompany.com',
    hint: "We'll re-read it when you save if the URL has changed." },
  { name: 'industry',        label: 'Industry',             type: 'select', section: 'Business', options: INDUSTRY_OPTIONS },
  { name: 'location',        label: 'City / region',        type: 'text',   section: 'Business' },
  { name: 'team_size',       label: 'Team size',            type: 'select', section: 'Business', options: TEAM_SIZE_OPTIONS },

  { name: 'hours_per_week',  label: 'Hours per week',       type: 'select', section: 'Money & time', options: HOURS_OPTIONS },
  { name: 'last_revenue',    label: 'Last year revenue',    type: 'select', section: 'Money & time', options: REVENUE_OPTIONS },
  { name: 'current_revenue', label: 'Current revenue pace', type: 'select', section: 'Money & time', options: REVENUE_OPTIONS },
  { name: 'profit',          label: 'Profit margin',        type: 'select', section: 'Money & time', options: PROFIT_OPTIONS },

  { name: 'primary_goal',   label: 'Primary goals',         type: 'goals',  section: 'Goals',
    hint: 'Pick as many as apply.' },
  { name: 'goal_timeline',  label: 'Timeline',              type: 'select', section: 'Goals', options: GOAL_TIMELINE_OPTIONS },
]

const SECTIONS = ['Business', 'Money & time', 'Goals']

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function Settings() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(null)
  const [initial, setInitial]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState(null)        // { tone: 'ok'|'err', text: string }
  const [regenState, setRegenState] = useState('idle')    // idle | confirm | running | error
  const [regenError, setRegenError] = useState(null)

  // Post-checkout bounce-back banner. Stripe sends the user to
  // /settings?checkout=success — we show a green confirmation once and
  // then clean the URL so a refresh doesn't resurface it. Lazy
  // initializer matches the IntegrationsSection / Pricing pattern.
  const [params, setParams] = useSearchParams()
  const [checkoutBanner, setCheckoutBanner] = useState(() => checkoutBannerFromParams(params))
  useEffect(() => {
    if (!params.get('checkout')) return
    const next = new URLSearchParams(params)
    next.delete('checkout')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load the current business profile.
  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false

    ;(async () => {
      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle()

      if (cancelled) return

      const hydrated = {
        business_name:   data?.business_name   ?? '',
        website:         data?.website         ?? '',
        industry:        data?.industry        ?? '',
        location:        data?.location        ?? '',
        team_size:       data?.team_size       ?? '',
        hours_per_week:  data?.hours_per_week  ?? '',
        last_revenue:    data?.last_revenue    ?? '',
        current_revenue: data?.current_revenue ?? '',
        profit:          data?.profit          ?? '',
        primary_goal:    normalizeGoalValue(data?.primary_goal),
        goal_timeline:   data?.goal_timeline   ?? '',
      }
      setForm(hydrated)
      setInitial(hydrated)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [profile?.company_id])

  // Detect "dirty" state so we can enable/disable the Save button.
  const isDirty = useMemo(() => {
    if (!form || !initial) return false
    return JSON.stringify(form) !== JSON.stringify(initial)
  }, [form, initial])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaveMsg(null)
  }

  async function handleSave() {
    if (!profile?.company_id || !isDirty) return
    setSaving(true)
    setSaveMsg(null)

    try {
      // If the website URL changed (and is non-empty), re-scrape it so the
      // stored website_content reflects the current URL.
      let websiteContent
      const websiteChanged = form.website.trim() !== (initial?.website ?? '').trim()
      if (websiteChanged && form.website.trim()) {
        websiteContent = await fetchWebsiteContent(form.website)
      } else if (websiteChanged && !form.website.trim()) {
        websiteContent = null   // website cleared — wipe stored content
      }

      const patch = {
        business_name:   form.business_name,
        website:         form.website.trim() || null,
        industry:        form.industry,
        location:        form.location,
        team_size:       form.team_size,
        hours_per_week:  form.hours_per_week,
        last_revenue:    form.last_revenue,
        current_revenue: form.current_revenue,
        profit:          form.profit,
        primary_goal:    form.primary_goal,
        goal_timeline:   form.goal_timeline,
      }
      // Only send website_content if the URL changed — otherwise we'd wipe
      // the existing scrape unnecessarily.
      if (websiteChanged) patch.website_content = websiteContent ?? null

      const { error } = await supabase
        .from('business_profiles')
        .update(patch)
        .eq('company_id', profile.company_id)

      if (error) throw new Error(error.message)

      setInitial(form)
      setSaveMsg({ tone: 'ok', text: 'Saved.' })
    } catch (err) {
      setSaveMsg({ tone: 'err', text: err.message ?? 'Could not save.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    if (!profile?.company_id) return
    setRegenState('running')
    setRegenError(null)

    try {
      // 1. Pull the current (persisted) profile so regeneration uses saved
      //    values even if the user has unsaved edits in the form.
      const { data: bp, error: bpErr } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle()
      if (bpErr) throw new Error(bpErr.message)
      if (!bp) throw new Error('Business profile not found.')

      // 2. Refresh the website scrape if a URL is set, so the new roadmap
      //    is based on the latest site content.
      let websiteContent = bp.website_content
      if (bp.website) {
        const fresh = await fetchWebsiteContent(bp.website)
        if (fresh) websiteContent = fresh
      }

      // 3. Claude → new milestones.
      const raw = await callClaude({
        model: SONNET,
        systemPrompt: ROADMAP_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(buildPayload(bp, websiteContent)) }],
        maxTokens: 4000,
        json: true,
      })
      const parsed = safeParseMilestones(raw)
      if (!parsed?.milestones?.length) throw new Error("Couldn't read the AI response. Try again.")

      // 4. Wipe existing milestones + insert the new ones in one logical swap.
      //    We do this in two statements; a transaction would be nicer but
      //    supabase-js doesn't expose one. Worst case if the delete succeeds
      //    and insert fails: the user ends up with 0 milestones and can
      //    regenerate again. The regenerate button is forgiving.
      const { error: delErr } = await supabase
        .from('milestones').delete().eq('company_id', profile.company_id)
      if (delErr) throw new Error(`Could not clear old milestones: ${delErr.message}`)

      const datedMilestones = assignMilestoneDates(parsed.milestones)
      const rows = datedMilestones.map((m, i) => ({
        company_id:  profile.company_id,
        title:       String(m.title ?? '').slice(0, 200),
        description: m.description ?? null,
        timeframe:   m.timeframe ?? null,
        category:    m.category ?? null,
        actions:     Array.isArray(m.actions) ? m.actions : [],
        books:       Array.isArray(m.books)   ? m.books   : [],
        sort_order:  i,
        start_date:  m.start_date ?? null,
        end_date:    m.end_date ?? null,
        weight:      sanitizeWeight(m.weight),
      }))
      // See Onboarding.jsx: INSERT ... RETURNING preserves input order, so we
      // skip an explicit .order() here to avoid a PostgREST schema-cache edge.
      const { data: insertedRows, error: insErr } = await supabase
        .from('milestones')
        .insert(rows)
        .select('id')
      if (insErr) throw new Error(`Could not save new milestones: ${insErr.message}`)

      // Dependency wiring — array indexes → UUIDs. Best-effort.
      const depUpdates = buildDependencyUpdates(parsed.milestones, insertedRows ?? [])
      if (depUpdates.length > 0) {
        await Promise.all(depUpdates.map(u =>
          supabase.from('milestones').update({ depends_on: u.depends_on }).eq('id', u.id)
        ))
      }

      // 5. Persist the refreshed website_content on the profile (so we don't
      //    re-scrape on next regenerate).
      if (websiteContent && websiteContent !== bp.website_content) {
        await supabase
          .from('business_profiles')
          .update({ website_content: websiteContent })
          .eq('company_id', profile.company_id)
      }

      navigate('/roadmap')
    } catch (err) {
      setRegenError(err.message ?? 'Something went wrong.')
      setRegenState('error')
    }
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  if (loading || !form) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-ink-100 rounded animate-pulse mb-6" />
        <div className="h-32 w-full bg-ink-50 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (regenState === 'running') return <RegeneratingScreen />

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900 tracking-tight">Settings</h1>
        <p className="text-ink-400 text-sm mt-1">
          Update your business profile. The roadmap won't change until you regenerate it.
        </p>
      </header>

      {checkoutBanner && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm border bg-green-50 border-green-200 text-green-800 flex items-start gap-3"
          role="status"
        >
          <span className="flex-1">{checkoutBanner.text}</span>
          <button
            type="button"
            onClick={() => setCheckoutBanner(null)}
            className="text-green-600 hover:text-green-800"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Editable form */}
      <form onSubmit={e => { e.preventDefault(); handleSave() }}>
        {SECTIONS.map(section => (
          <section key={section} className="mb-8">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-400 mb-3">
              {section}
            </h2>
            <div className="bg-white border border-ink-100 rounded-xl divide-y divide-ink-50 shadow-sm">
              {FIELDS.filter(f => f.section === section).map(field => (
                <div key={field.name} className="p-5">
                  <Field field={field} value={form[field.name]} onChange={v => set(field.name, v)} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="flex items-center justify-between bg-white border border-ink-100 rounded-xl p-4 shadow-sm sticky bottom-4">
          <div className="text-sm">
            {saveMsg && (
              <span className={saveMsg.tone === 'ok' ? 'text-green-600' : 'text-red-600'}>
                {saveMsg.text}
              </span>
            )}
            {!saveMsg && isDirty && <span className="text-ink-400">Unsaved changes</span>}
          </div>
          <button
            type="submit"
            disabled={!isDirty || saving}
            className="bg-gold-gradient text-white rounded-lg px-5 py-2 text-sm font-bold tracking-wide disabled:opacity-50 glow-gold-sm hover:glow-gold transition-all duration-200"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* Plan + payment method — Stripe-backed, managed via portal */}
      <BillingSection />

      {/* This month's AI + Places usage against the cap */}
      <UsageSection />

      {/* Third-party integrations (QuickBooks, etc.) */}
      <IntegrationsSection />

      {/* Credit & liquidity — stored on the business profile so Claude always factors it in */}
      <CreditFacilitiesSection companyId={profile?.company_id} />

      {/* Advisor access */}
      <AdvisorAccessSection companyId={profile?.company_id} userId={profile?.id} />

      {/* Team / staff management */}
      <TeamSection companyId={profile?.company_id} />

      {/* Regenerate roadmap */}
      <section className="mt-10 bg-white border border-ink-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink-900 mb-1">Regenerate roadmap</h2>
        <p className="text-sm text-ink-500 mb-4 leading-relaxed">
          Replace your current milestones with a fresh roadmap based on your latest answers.
          <strong className="block mt-1 text-amber-600">
            This deletes every existing milestone — including completed ones.
          </strong>
        </p>

        {regenState === 'error' && regenError && (
          <p className="text-sm text-red-600 mb-3">{regenError}</p>
        )}

        {regenState !== 'confirm' ? (
          <button
            type="button"
            onClick={() => setRegenState('confirm')}
            className="border border-ink-200 text-ink-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink-50 transition-colors"
          >
            Regenerate roadmap
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRegenerate}
              className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Yes, replace my roadmap
            </button>
            <button
              type="button"
              onClick={() => setRegenState('idle')}
              className="text-sm text-ink-400 hover:text-ink-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Subcomponents
// ----------------------------------------------------------------------------
function Field({ field, value, onChange }) {
  const { name, label, type, options, placeholder, hint } = field

  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-2">
        {label}
      </label>
      {hint && <p className="text-[11px] text-ink-400 mb-2 -mt-1">{hint}</p>}

      {type === 'text' && (
        <input
          id={name}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}

      {type === 'textarea' && (
        <textarea
          id={name}
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}

      {type === 'select' && (
        <select id={name} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Choose one…</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}

      {type === 'goals' && (
        <GoalMultiSelect value={value} onChange={onChange} />
      )}
    </div>
  )
}

function GoalMultiSelect({ value, onChange }) {
  const selected = Array.isArray(value) ? value : []
  function toggle(goalValue) {
    const next = selected.includes(goalValue)
      ? selected.filter(v => v !== goalValue)
      : [...selected, goalValue]
    onChange(next)
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

// ----------------------------------------------------------------------------
// Credit & liquidity section — stored in business_profiles.financial_settings
// ----------------------------------------------------------------------------
function CreditFacilitiesSection({ companyId }) {
  const EMPTY = { overdraft_limit: '', overdraft_used: '', cc_limit: '', cc_balance: '' }
  const [fields,   setFields]   = useState(EMPTY)
  const [initial,  setInitial]  = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)     // { tone, text }
  const [migrationNeeded, setMigrationNeeded] = useState(false)

  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      const { data } = await supabase
        .from('business_profiles')
        .select('financial_settings')
        .eq('company_id', companyId)
        .maybeSingle()
      const fs = data?.financial_settings ?? {}
      const hydrated = {
        overdraft_limit: fs.overdraft_limit ?? '',
        overdraft_used:  fs.overdraft_used  ?? '',
        cc_limit:        fs.cc_limit        ?? '',
        cc_balance:      fs.cc_balance      ?? '',
      }
      setFields(hydrated)
      setInitial(hydrated)
    })()
  }, [companyId])

  const isDirty = JSON.stringify(fields) !== JSON.stringify(initial)

  function set(key, val) { setFields(f => ({ ...f, [key]: val })); setMsg(null) }

  async function handleSave() {
    setSaving(true); setMsg(null)
    try {
      const patch = {
        overdraft_limit: parseMoney(fields.overdraft_limit),
        overdraft_used:  parseMoney(fields.overdraft_used),
        cc_limit:        parseMoney(fields.cc_limit),
        cc_balance:      parseMoney(fields.cc_balance),
      }
      const { error } = await supabase
        .from('business_profiles')
        .update({ financial_settings: patch })
        .eq('company_id', companyId)
      if (error) {
        if (error.code === '42703' || error.message?.includes('financial_settings')) {
          setMigrationNeeded(true)
          return
        }
        throw new Error(error.message)
      }
      setInitial(fields)
      setMsg({ tone: 'ok', text: 'Saved — Claude will factor this in from now on.' })
    } catch (err) {
      setMsg({ tone: 'err', text: err.message ?? 'Could not save.' })
    } finally {
      setSaving(false)
    }
  }

  function parseMoney(str) {
    if (!str) return null
    const n = Number(String(str).replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }

  return (
    <section className="mt-8 bg-white border border-ink-100 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink-900">Credit &amp; liquidity</h2>
        <p className="text-sm text-ink-400 mt-0.5">
          Stored once — Claude factors this into cash flow, financial advice, and planning automatically.
        </p>
      </div>

      {migrationNeeded && (
        <div className="mb-4 border border-amber-200 bg-amber-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ One quick database update needed</p>
          <p className="text-xs text-amber-700 mb-2">Run this in your Supabase SQL Editor to enable credit settings:</p>
          <pre className="text-[11px] bg-white border border-amber-200 rounded-lg p-3 overflow-x-auto text-amber-900 font-mono select-all">
{`ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS financial_settings JSONB;`}
          </pre>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <CreditField label="Overdraft / credit line limit" hint="Total facility your bank has approved." value={fields.overdraft_limit} onChange={v => set('overdraft_limit', v)} />
        <CreditField label="Overdraft currently drawn" hint="How much of that line is currently used." value={fields.overdraft_used}  onChange={v => set('overdraft_used',  v)} />
        <CreditField label="Business credit card limit" hint="Combined limit across all business cards."  value={fields.cc_limit}       onChange={v => set('cc_limit',       v)} />
        <CreditField label="Credit card balance owing"  hint="Total charged across all cards right now."  value={fields.cc_balance}     onChange={v => set('cc_balance',     v)} />
      </div>

      <div className="flex items-center gap-4 mt-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
        >
          {saving ? 'Saving…' : 'Update'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.tone === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </section>
  )
}

function CreditField({ label, hint, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-1.5">{label}</span>
      {hint && <span className="block text-[11px] text-ink-400 mb-1.5 -mt-1">{hint}</span>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          className="w-full pl-7"
        />
      </div>
    </label>
  )
}

function RegeneratingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 px-4">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }}
      />
      <div className="relative text-center">
        <div className="w-14 h-14 mx-auto mb-8 relative">
          <div className="absolute inset-0 rounded-full border-4 border-ink-700" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-400 animate-spin" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400 mb-3">
          Rebuilding your roadmap
        </p>
        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
          Regenerating your roadmap…
        </h2>
        <p className="text-ink-400 text-sm max-w-xs mx-auto">This takes 10–20 seconds.</p>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Normalise primary_goal to an array so the UI never has to handle both.
 * Post-migration 004 it's text[], but we defensively coerce in case of
 * old-shape rows or null values.
 */
function normalizeGoalValue(goal) {
  if (Array.isArray(goal)) return goal
  if (typeof goal === 'string' && goal.trim()) return [goal]
  return []
}

/** Same shape the Onboarding wizard sends to Claude. Kept in sync on purpose. */
function buildPayload(bp, websiteContent) {
  return {
    business_name:   bp.business_name,
    website:         bp.website,
    industry:        bp.industry,
    location:        bp.location,
    team_size:       bp.team_size,
    hours_per_week:  bp.hours_per_week,
    last_revenue:    bp.last_revenue,
    current_revenue: bp.current_revenue,
    profit_margin:   bp.profit,
    primary_goals:   bp.primary_goal,
    goal_timeline:   bp.goal_timeline,
    website_content: websiteContent,
  }
}

function safeParseMilestones(raw) {
  if (!raw) return null
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  try { return JSON.parse(trimmed) }
  catch {
    const start = trimmed.indexOf('{')
    const end   = trimmed.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    try { return JSON.parse(trimmed.slice(start, end + 1)) }
    catch { return null }
  }
}

/** 1–10 integer, default 5 when missing/garbage. Mirrors Onboarding. */
function sanitizeWeight(w) {
  const n = Number(w)
  if (!Number.isFinite(n)) return 5
  return Math.max(1, Math.min(10, Math.round(n)))
}

/**
 * Map the ?checkout=success URL param into a banner payload.
 *
 * Stripe's success_url lands here after a completed Checkout Session. The
 * webhook has usually upserted the subscriptions row by the time this
 * renders — BillingSection's own useSubscription fetch will reflect the
 * paid plan. If the webhook is slow, the banner still confirms the charge
 * went through; the plan state will catch up on a refresh.
 *
 * We deliberately don't handle '?checkout=canceled' here — that path sends
 * the user back to /pricing, which owns its own banner.
 */
// ============================================================================
// Advisor Access Section
// ============================================================================

// ============================================================================
// Team Section — add staff members with emails; they appear on the Work Board
// ============================================================================

function TeamSection({ companyId }) {
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [missing,  setMissing]  = useState(false)   // staff_members table not set up yet
  const [form,     setForm]     = useState({ name: '', email: '', role: '' })
  const [saving,   setSaving]   = useState(false)
  const [removing, setRemoving] = useState(null)
  const [err,      setErr]      = useState(null)

  useEffect(() => {
    if (!companyId) return
    supabase
      .from('staff_members')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
      .then(({ data, error }) => {
        if (error?.code === '42P01') { setMissing(true) }
        else setStaff(data ?? [])
        setLoading(false)
      })
  }, [companyId])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setErr(null)
    setSaving(true)
    const { data, error } = await supabase
      .from('staff_members')
      .insert({ company_id: companyId, name: form.name.trim(), email: form.email.trim() || null, role: form.role.trim() || null })
      .select()
      .single()
    setSaving(false)
    if (error) { setErr(error.message); return }
    setStaff(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ name: '', email: '', role: '' })
    setMissing(false)
  }

  async function handleRemove(id) {
    setRemoving(id)
    await supabase.from('staff_members').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
    setRemoving(null)
  }

  function memberInitials(name, email) {
    const str = name || email || '?'
    return str.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <section className="mt-10 bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-ink-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Team</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            Add staff members so you can assign and email tasks from the Work Board.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-2">
          {[1,2].map(i => <div key={i} className="h-12 bg-ink-50 rounded-xl animate-pulse" />)}
        </div>
      ) : missing ? (
        <div className="p-6">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠ One-time setup required</p>
            <p className="text-xs text-amber-700 leading-relaxed mb-3">
              Run this SQL in your Supabase dashboard → SQL Editor to enable staff management:
            </p>
            <pre className="text-[10px] bg-ink-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`create table public.staff_members (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  email text,
  role text,
  created_at timestamptz default now()
);
alter table public.staff_members enable row level security;
create policy "Company members can manage staff"
on public.staff_members for all
using (company_id = (
  select company_id from public.profiles where id = auth.uid()
));`}
            </pre>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-ink-50">
          {/* Existing staff list */}
          {staff.length > 0 && (
            <div className="p-6 space-y-2">
              {staff.map(s => (
                <div key={s.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-ink-100 hover:border-ink-200 transition-colors">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                    {memberInitials(s.name, s.email)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-ink-800">{s.name}</span>
                      {s.role && (
                        <span className="text-[10px] font-medium text-ink-400 bg-ink-50 border border-ink-100 px-2 py-0.5 rounded-full">
                          {s.role}
                        </span>
                      )}
                    </div>
                    {s.email ? (
                      <a href={`mailto:${s.email}`}
                        className="text-[11px] text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1 mt-0.5">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="0.5" y="2" width="9" height="6.5" rx="1"/>
                          <path d="M0.5 3L5 6l4.5-3"/>
                        </svg>
                        {s.email}
                      </a>
                    ) : (
                      <span className="text-[11px] text-ink-300 italic mt-0.5 block">No email</span>
                    )}
                  </div>
                  {/* Remove */}
                  <button type="button"
                    onClick={() => handleRemove(s.id)}
                    disabled={removing === s.id}
                    className="p-2 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0"
                    title="Remove">
                    {removing === s.id
                      ? <span className="text-xs text-ink-400">…</span>
                      : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8">
                          <path d="M2 3.5h10M6 3.5V2.5h2v1M4.5 3.5v8h5v-8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )
                    }
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add staff form */}
          <div className="p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-4">
              Add staff member
            </h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1.5">Full name *</label>
                  <input type="text" value={form.name} onChange={e => setField('name', e.target.value)}
                    placeholder="Jane Smith" required
                    className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1.5">
                    Role <span className="text-ink-400 font-normal">(optional)</span>
                  </label>
                  <input type="text" value={form.role} onChange={e => setField('role', e.target.value)}
                    placeholder="e.g. Technician"
                    className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1.5">
                  Email address <span className="text-ink-400 font-normal">(for task notifications)</span>
                </label>
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                  placeholder="jane@yourcompany.com"
                  className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              {err && <p className="text-xs text-red-500">{err}</p>}
              <button type="submit" disabled={!form.name.trim() || saving}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-bold transition-colors">
                {saving ? 'Adding…' : '+ Add to team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

// ============================================================================
// Advisor Access Section
// ============================================================================

function AdvisorAccessSection({ companyId, userId }) {
  const [invites,   setInvites]   = useState([])
  const [advisors,  setAdvisors]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [copiedId,  setCopiedId]  = useState(null)
  const [email,     setEmail]     = useState('')
  const copyTimerRef = useRef(null)

  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      const [inv, adv] = await Promise.all([
        listInvites(companyId).catch(() => []),
        listAdvisors(companyId).catch(() => []),
      ])
      setInvites(inv)
      setAdvisors(adv)
      setLoading(false)
    })()
  }, [companyId])

  async function handleCreate() {
    if (!companyId || !userId || creating) return
    setCreating(true)
    try {
      const inv = await createInvite({ companyId, userId, email })
      setInvites(prev => [inv, ...prev])
      setEmail('')
    } catch { /* silently fail */ }
    setCreating(false)
  }

  async function handleRevoke(inviteId) {
    if (!confirm('Revoke this invite link? Anyone who hasn\'t used it yet won\'t be able to.')) return
    await revokeInvite(inviteId).catch(() => {})
    setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, status: 'revoked' } : i))
  }

  async function handleRemoveAdvisor(memberId) {
    if (!confirm('Remove this advisor\'s access?')) return
    await removeAdvisor(memberId).catch(() => {})
    setAdvisors(prev => prev.filter(a => a.id !== memberId))
  }

  function handleCopy(invite) {
    const url = buildInviteUrl(invite.token)
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invite.id)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const pendingInvites = invites.filter(i => i.status === 'pending')

  return (
    <section className="mt-10 bg-white border border-ink-100 rounded-xl overflow-hidden shadow-sm">
      {/* Dark header */}
      <div className="bg-ink-900 px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400 mb-0.5">
            Advisor access
          </div>
          <p className="text-xs text-ink-400">
            Invite a coach or advisor to view your workspace — read-only, no editing.
          </p>
        </div>
        <span className="text-2xl flex-shrink-0">🤝</span>
      </div>

      <div className="p-6 space-y-6">

        {/* Active advisors */}
        {!loading && advisors.length > 0 && (
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-400 mb-2">
              Active advisors
            </div>
            <div className="space-y-2">
              {advisors.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 border border-ink-100 rounded-lg px-4 py-2.5 bg-ink-50/40">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-ink-900 text-brand-400 font-bold text-xs flex items-center justify-center">
                      A
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-ink-900">Advisor</div>
                      <div className="text-[11px] text-ink-400">
                        Access granted {formatDate(a.created_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdvisor(a.id)}
                    className="text-xs text-ink-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate invite link */}
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-400 mb-2">
            Generate invite link
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Advisor's email (optional)"
              className="flex-1 text-sm"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {creating ? 'Generating…' : 'Generate link'}
            </button>
          </div>
          <p className="text-[11px] text-ink-400 mt-1.5 leading-relaxed">
            The link is valid for 30 days. Copy it and share directly with your advisor — they'll create a free account if they don't have one.
          </p>
        </div>

        {/* Pending invite links */}
        {pendingInvites.length > 0 && (
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-400 mb-2">
              Pending links
            </div>
            <div className="space-y-2">
              {pendingInvites.map(inv => (
                <div key={inv.id} className="flex items-center gap-2 border border-ink-100 rounded-lg px-3 py-2 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-ink-500 truncate font-mono">
                      {buildInviteUrl(inv.token).replace('https://', '')}
                    </div>
                    <div className="text-[10.5px] text-ink-400 mt-0.5">
                      Expires {formatDate(inv.expires_at)}
                      {inv.email && ` · for ${inv.email}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(inv)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      copiedId === inv.id
                        ? 'bg-green-100 text-green-700'
                        : 'bg-ink-100 hover:bg-ink-200 text-ink-700'
                    }`}
                  >
                    {copiedId === inv.id ? '✓ Copied' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(inv.id)}
                    className="flex-shrink-0 text-xs text-ink-300 hover:text-red-500 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && advisors.length === 0 && pendingInvites.length === 0 && (
          <p className="text-sm text-ink-400">
            No advisors yet. Generate a link above and share it with your coach, accountant, or mentor.
          </p>
        )}

      </div>
    </section>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function checkoutBannerFromParams(params) {
  if (params.get('checkout') !== 'success') return null
  return {
    tone: 'ok',
    text: "Payment successful — you're subscribed. Your plan details are below; it can take a few seconds to update.",
  }
}
