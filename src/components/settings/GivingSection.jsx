import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * The switch that turns giving tracking on.
 *
 * Migration 028 added `companies.track_giving`, defaulting to false, and the
 * check-in form hides the giving field unless it is true — which meant that as
 * shipped the field could never appear at all. This is that missing switch.
 *
 * It stays off by default and it stays here rather than in onboarding on
 * purpose. Asking an owner about his giving because he signed up for business
 * software reads as a purity test, and it is the single question most likely
 * to make a guarded buyer close the tab. Someone who wants it tracked will
 * come looking; nobody should be asked on the way in.
 */
export default function GivingSection({ companyId }) {
  const [on, setOn]         = useState(null)   // null while loading
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('track_giving')
        .eq('id', companyId)
        .maybeSingle()
      if (cancelled) return
      if (error) { setErr(error.message); setOn(false); return }
      setOn(data?.track_giving === true)
    })()
    return () => { cancelled = true }
  }, [companyId])

  async function toggle() {
    if (saving || on === null) return
    const next = !on
    setOn(next)                       // optimistic; a toggle that lags feels broken
    setSaving(true)
    setErr(null)
    const { error } = await supabase
      .from('companies')
      .update({ track_giving: next })
      .eq('id', companyId)
    setSaving(false)
    if (error) { setOn(!next); setErr(error.message) }
  }

  if (on === null) return <div className="h-24 w-full bg-ink-50 rounded-xl animate-pulse" />

  return (
    <section>
      <h2 className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-400 mb-3">
        Giving
      </h2>
      <div className="bg-white border border-ink-100 rounded-xl p-5 shadow-sm flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1.5 min-w-0">
          <p className="text-sm font-semibold text-ink-900">Track giving in your check-ins</p>
          <p className="text-[13px] leading-relaxed text-ink-500 max-w-prose">
            Adds one optional field to the weekly check-in. It feeds the twelve-month
            view, so you can see whether generosity has kept pace with revenue.
            No target, no streak, and blank is always allowed.
          </p>
          <p className="text-[12.5px] text-ink-400">
            Off unless you turn it on. Solomon won&rsquo;t raise the subject either way.
          </p>
          {err && <p className="text-[12.5px] text-red-600">Couldn&rsquo;t save that — {err}</p>}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Track giving in your check-ins"
          onClick={toggle}
          disabled={saving}
          className={[
            'relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20',
            on ? 'bg-brand-600' : 'bg-ink-200',
            saving ? 'opacity-60' : '',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm',
              'transition-transform duration-200',
              on ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>
    </section>
  )
}
