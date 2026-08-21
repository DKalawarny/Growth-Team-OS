import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { HOURS_OPTIONS, DAYS_OFF_OPTIONS } from '../lib/businessProfileOptions'

/**
 * Check-ins (/checkins).
 *
 * Weekly reflection log. Each entry captures how the owner is doing in that
 * moment — mood, a win, a challenge, optional revenue / hours / notes. The
 * last 5 entries feed into the Advisor chat's BUSINESS_CONTEXT block, so
 * logging regularly makes the advisor progressively smarter.
 *
 * Page layout:
 *   - Dark ink-900 header zone (matches Dashboard / Documents pattern)
 *   - Nudge strip — days since last check-in, current milestone reminder
 *   - Form: required fields (mood, win, challenge) up front; optional fields
 *     collapse below to keep the form fast for quick entries.
 *   - History: reverse-chronological expandable cards
 *
 * Data model (already in 001_initial_schema.sql):
 *   checkins(id, company_id, user_id, revenue_update, win, challenge,
 *            mood [1-5], hours_this_week, notes, created_at)
 */

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Meh'   },
  { value: 3, emoji: '😐', label: 'OK'    },
  { value: 4, emoji: '🙂', label: 'Good'  },
  { value: 5, emoji: '😄', label: 'Great' },
]

const INITIAL_FORM = {
  mood:            null,
  win:             '',
  challenge:       '',
  revenue_update:  '',
  hours_this_week: '',
  days_off:        '',
  gave_amount:     '',
  notes:           '',
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function Checkins() {
  const { profile } = useAuth()

  const [loading, setLoading]           = useState(true)
  const [checkins, setCheckins]         = useState([])
  const [nextMilestone, setNextMilestone] = useState(null)
  const [form, setForm]                 = useState(INITIAL_FORM)
  const [showOptional, setShowOptional] = useState(false)
  // Giving is opt-in at the company level and off by default. Asking an owner
  // about their tithing because they signed up for business software reads as
  // a purity test — see migration 028.
  const [trackGiving, setTrackGiving] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)
  const [expandedId, setExpandedId]     = useState(null)

  // Load history + next incomplete milestone in parallel.
  useEffect(() => {
    if (!profile?.company_id || !profile?.id) return
    let cancelled = false

    ;(async () => {
      const [ciRes, msRes, coRes] = await Promise.all([
        supabase
          .from('checkins')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('milestones')
          .select('title, timeframe')
          .eq('company_id', profile.company_id)
          .eq('completed', false)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle(),
        // Opt-in only. A missing column (migration 028 not yet applied) or a
        // failed read both land on false, which is the safe default: the
        // giving field simply does not render.
        supabase
          .from('companies')
          .select('track_giving')
          .eq('id', profile.company_id)
          .maybeSingle(),
      ])
      if (cancelled) return
      setCheckins(ciRes.data ?? [])
      setNextMilestone(msRes.data ?? null)
      setTrackGiving(coRes?.data?.track_giving === true)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [profile?.company_id, profile?.id])

  const daysSinceLast = useMemo(() => {
    if (!checkins.length) return null
    const last = new Date(checkins[0].created_at).getTime()
    const ms   = Date.now() - last
    return Math.floor(ms / (1000 * 60 * 60 * 24))
  }, [checkins])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function isValid() {
    return form.mood !== null
      && form.win.trim() !== ''
      && form.challenge.trim() !== ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid() || saving || !profile?.company_id) return
    setSaving(true)
    setError(null)

    const payload = {
      company_id:      profile.company_id,
      user_id:         profile.id,
      mood:            form.mood,
      win:             form.win.trim(),
      challenge:       form.challenge.trim(),
      revenue_update:  form.revenue_update.trim() || null,
      hours_this_week: form.hours_this_week || null,
      // Blank stays null. An unanswered field must never be stored as a zero —
      // "didn't say" and "took none" are different facts and only one of them
      // is a problem.
      days_off:        form.days_off === '' ? null : parseInt(form.days_off, 10),
      gave_amount:     form.gave_amount === '' ? null : Number(form.gave_amount),
      notes:           form.notes.trim() || null,
    }

    const { data, error: err } = await supabase
      .from('checkins')
      .insert(payload)
      .select()
      .single()

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setCheckins(prev => [data, ...prev])
    setForm(INITIAL_FORM)
    setShowOptional(false)
    setSaving(false)
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  if (loading) return <LoadingSkeleton />

  return (
    <div className="min-h-screen bg-ink-50">

      {/* ── Dark header zone ──────────────────────────────────────────────── */}
      <div className="bg-ink-900 relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-3xl mx-auto px-8 pt-10 pb-16">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Check-ins</h1>
              <p className="text-sm text-ink-400">
                A quick weekly reflection. Your advisor reads your last 5 to stay current.
              </p>
            </div>
            {checkins.length > 0 && (
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-black text-white">{checkins.length}</div>
                <div className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold">
                  {checkins.length === 1 ? 'entry' : 'entries'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content zone ──────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-8 -mt-8 pb-12">

        {/* Nudge */}
        <Nudge daysSinceLast={daysSinceLast} nextMilestone={nextMilestone} />

        {/* Form card */}
        <form onSubmit={handleSubmit} className="bg-white border border-ink-100 rounded-xl shadow-sm p-6 mb-6 space-y-5">

          <MoodPicker value={form.mood} onChange={v => set('mood', v)} />

          <TextAreaField
            label="One win this week"
            value={form.win}
            onChange={v => set('win', v)}
            placeholder="What went well?"
            required
          />

          <TextAreaField
            label="One challenge"
            value={form.challenge}
            onChange={v => set('challenge', v)}
            placeholder="Where did you get stuck?"
            required
          />

          {/* Optional fields */}
          {!showOptional ? (
            <button
              type="button"
              onClick={() => setShowOptional(true)}
              className="text-sm font-medium text-ink-400 hover:text-ink-600 transition-colors"
            >
              + Add revenue, hours, rest, or notes
            </button>
          ) : (
            <div className="space-y-5 pt-4 border-t border-ink-100">
              <TextField
                label="Revenue update (optional)"
                value={form.revenue_update}
                onChange={v => set('revenue_update', v)}
                placeholder="e.g. $12k this week, up from $9k"
              />
              <SelectField
                label="Hours worked this week (optional)"
                value={form.hours_this_week}
                onChange={v => set('hours_this_week', v)}
                options={HOURS_OPTIONS}
              />
              {/* Rest and giving.
                *
                * Phrased as observations, never as questions about obedience,
                * and shown with no target, streak or comparison anywhere near
                * them. "Days you didn't work" can be answered honestly on a
                * bad week; "did you keep Sabbath?" can only be failed.
                */}
              <SelectField
                label="Days you didn't work (optional)"
                value={form.days_off}
                onChange={v => set('days_off', v)}
                options={DAYS_OFF_OPTIONS}
              />
              {trackGiving && (
                <TextField
                  label="Given this period (optional)"
                  value={form.gave_amount}
                  onChange={v => set('gave_amount', v.replace(/[^0-9.]/g, ''))}
                  placeholder="Leave blank if you'd rather not say"
                />
              )}
              <TextAreaField
                label="Notes (optional)"
                value={form.notes}
                onChange={v => set('notes', v)}
                placeholder="Anything else worth remembering."
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={!isValid() || saving}
              className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40 transition-opacity overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #92400e 0%, #b45309 40%, #d97706 100%)',
              }}
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : 'Log check-in'}
            </button>
          </div>
        </form>

        {/* History */}
        <section>
          <h2 className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold mb-3 px-1">
            Past check-ins
          </h2>
          {checkins.length === 0 ? (
            <div className="bg-white border border-dashed border-ink-200 rounded-xl p-8 text-center">
              <p className="text-sm text-ink-500">No check-ins yet — log your first one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {checkins.map(c => (
                <HistoryRow
                  key={c.id}
                  checkin={c}
                  expanded={expandedId === c.id}
                  onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Subcomponents
// ----------------------------------------------------------------------------

function Nudge({ daysSinceLast, nextMilestone }) {
  // First check-in ever — welcome message
  if (daysSinceLast === null) {
    return (
      <div className="bg-white border border-ink-100 rounded-xl px-4 py-3.5 mb-5 shadow-sm flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-ink-900 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs text-white" aria-hidden>✦</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">Welcome — log your first check-in.</p>
          <p className="text-xs text-ink-500 mt-0.5">
            30 seconds now builds the habit, and your advisor learns more about your week every time you log one.
          </p>
          {nextMilestone && (
            <p className="text-xs text-ink-500 mt-2">
              Currently working on: <span className="font-semibold text-ink-700">{nextMilestone.title}</span>
              {nextMilestone.timeframe && <span className="text-ink-400"> · {nextMilestone.timeframe}</span>}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Already checked in today
  if (daysSinceLast === 0) {
    return (
      <div className="bg-white border border-ink-100 rounded-xl px-4 py-3 mb-5 shadow-sm flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        <p className="text-sm text-ink-600 flex-1">
          <span className="font-semibold text-ink-900">Logged today.</span> Nice work.
        </p>
        {nextMilestone && (
          <p className="text-xs text-ink-500 hidden sm:block">
            Next: <span className="font-medium text-ink-700">{nextMilestone.title}</span>
          </p>
        )}
      </div>
    )
  }

  // Nudge based on recency
  const isOverdue = daysSinceLast >= 14
  const isLate    = daysSinceLast >= 7

  const message =
    daysSinceLast === 1 ? 'Last check-in: yesterday.' :
    isOverdue ? `It's been ${daysSinceLast} days — worth a minute to catch up.` :
    isLate    ? `${daysSinceLast} days since your last check-in.` :
    `Last check-in: ${daysSinceLast} days ago.`

  return (
    <div className={`rounded-xl px-4 py-3.5 mb-5 border ${
      isOverdue
        ? 'bg-amber-50 border-amber-200'
        : isLate
          ? 'bg-brand-50 border-brand-200'
          : 'bg-white border-ink-100 shadow-sm'
    }`}>
      <p className="text-sm text-ink-800">{message}</p>
      {nextMilestone && (
        <p className="text-xs text-ink-500 mt-1">
          Currently working on: <span className="font-semibold text-ink-700">{nextMilestone.title}</span>
          {nextMilestone.timeframe && <span className="text-ink-400"> · {nextMilestone.timeframe}</span>}
        </p>
      )}
    </div>
  )
}

function MoodPicker({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink-800 mb-2.5">
        How was this week?
      </label>
      <div className="flex items-center gap-2">
        {MOOD_OPTIONS.map(opt => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-label={opt.label}
              className={`flex-1 rounded-xl border-2 px-2 py-3 flex flex-col items-center gap-1.5 transition-all ${
                selected
                  ? 'border-ink-900 bg-ink-900 shadow-sm'
                  : 'border-ink-100 hover:border-ink-300 bg-white'
              }`}
            >
              <span className="text-xl leading-none">{opt.emoji}</span>
              <span className={`text-[11px] font-semibold ${selected ? 'text-white' : 'text-ink-400'}`}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink-800 mb-1.5">{label}</label>
      <input
        type="text"
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-400 focus:ring-0 transition-colors bg-ink-50 focus:bg-white"
      />
    </div>
  )
}

function TextAreaField({ label, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink-800 mb-1.5">{label}</label>
      <textarea
        rows={2}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-400 focus:ring-0 transition-colors resize-none bg-ink-50 focus:bg-white"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink-800 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-0 transition-colors bg-ink-50 focus:bg-white"
      >
        <option value="">—</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )
}

function HistoryRow({ checkin, expanded, onToggle }) {
  const mood     = MOOD_OPTIONS.find(m => m.value === checkin.mood)
  const hasExtras = checkin.revenue_update || checkin.hours_this_week || checkin.notes

  return (
    <div className="bg-white border border-ink-100 rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-ink-50 transition-colors"
      >
        {/* Mood badge */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xl leading-none ${
          expanded ? 'bg-ink-900' : 'bg-ink-50'
        }`}>
          {mood?.emoji ?? '😐'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-ink-400">{formatDate(checkin.created_at)}</span>
            {mood && (
              <span className="text-[10px] uppercase tracking-widest font-semibold text-ink-500">
                {mood.label}
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-ink-900 truncate">
            {checkin.win}
          </div>
          {!expanded && (
            <div className="text-xs text-ink-500 truncate mt-0.5">
              {checkin.challenge}
            </div>
          )}
        </div>

        <span className={`text-sm font-bold flex-shrink-0 mt-1 transition-colors ${
          expanded ? 'text-ink-600' : 'text-ink-300'
        }`}>
          {expanded ? '−' : '+'}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-ink-100">
          <div className="pt-4 space-y-3">
            <Detail label="Win" value={checkin.win} />
            <Detail label="Challenge" value={checkin.challenge} />
            {checkin.revenue_update  && <Detail label="Revenue update"  value={checkin.revenue_update} />}
            {checkin.hours_this_week && <Detail label="Hours this week" value={checkin.hours_this_week} />}
            {checkin.notes           && <Detail label="Notes"           value={checkin.notes} />}
            {!hasExtras && <p className="text-xs text-ink-400">No extra details logged.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold mb-0.5">{label}</div>
      <div className="text-sm text-ink-700 whitespace-pre-wrap">{value}</div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Loading skeleton
// ----------------------------------------------------------------------------
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 px-8 pt-10 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="h-7 w-32 bg-ink-800 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-ink-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-8 -mt-8">
        <div className="h-14 bg-white rounded-xl animate-pulse mb-5 shadow-sm" />
        <div className="h-72 bg-white rounded-xl animate-pulse mb-6 shadow-sm" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    year:    d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}
