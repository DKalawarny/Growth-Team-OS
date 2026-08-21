import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { fetchWebsiteContent } from '../../lib/websiteScraper'
import { REVENUE_OPTIONS } from '../../lib/stageEngine'
import {
  INDUSTRY_OPTIONS,
  TEAM_SIZE_OPTIONS,
  PROFIT_OPTIONS,
  HOURS_OPTIONS,
  GOAL_OPTIONS,
  GOAL_TIMELINE_OPTIONS,
} from '../../lib/businessProfileOptions'
import CreditFacilitiesSection from '../../components/settings/CreditFacilitiesSection'
import GivingSection from '../../components/settings/GivingSection'

/**
 * BusinessSettings — the AI's context about you.
 *
 * Two cards live here:
 *   1. Business profile — name, industry, revenue, goals. Saved with the
 *      sticky save bar at the bottom. If the website URL changes, we
 *      re-scrape it so stored website_content stays current.
 *   2. Credit & liquidity — overdraft + CC limits. Self-saving card; not
 *      part of the profile form.
 *
 * Both are stored on `business_profiles` and fed to Claude (Solomon + cash
 * flow + roadmap). Editing here doesn't regenerate the roadmap — that's a
 * separate destructive action under /settings/danger.
 */

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

export default function BusinessSettings() {
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState(null)
  const [initial, setInitial] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)   // { tone: 'ok'|'err', text }

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
    setSaving(true); setSaveMsg(null)

    try {
      let websiteContent
      const websiteChanged = form.website.trim() !== (initial?.website ?? '').trim()
      if (websiteChanged && form.website.trim()) {
        websiteContent = await fetchWebsiteContent(form.website)
      } else if (websiteChanged && !form.website.trim()) {
        websiteContent = null
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

  if (loading || !form) {
    return (
      <div>
        <div className="h-32 w-full bg-ink-50 rounded-xl animate-pulse mb-4" />
        <div className="h-32 w-full bg-ink-50 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <form onSubmit={e => { e.preventDefault(); handleSave() }}>
        {SECTIONS.map(section => (
          <section key={section} className="mb-6">
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

        {/* Sticky save bar */}
        <div className="flex items-center justify-between bg-white border border-ink-100 rounded-xl p-4 shadow-sm sticky bottom-4 z-10">
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

      {/* Credit & liquidity — separate self-saving card */}
      <CreditFacilitiesSection companyId={profile?.company_id} />

      <GivingSection companyId={profile?.company_id} />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Field renderers
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
        <input id={name} type="text" value={value}
          onChange={e => onChange(e.target.value)} placeholder={placeholder} />
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
