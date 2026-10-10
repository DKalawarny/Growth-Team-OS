import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/**
 * The safety record: what the crew has already reported, gathered in one place.
 *
 * ⚠️ 10 Oct, agreed with Daniel: Safety goes back in the sidebar ONLY as more
 * than a regulation lookup. The app was already collecting, in every daily
 * log, whether anyone was hurt, whether a report was filed, any safety note,
 * and whether the hazard check was done; it showed each one only on its own
 * log. This reads the last 90 days of those and puts them together. It adds no
 * new data entry and is not a signed record: an injury here is what the crew
 * wrote, and the official report still has to be filed where it always was.
 */
const DAYS = 90
const day = iso => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export default function SafetyRecord({ companyId }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    const since = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10)
    Promise.all([
      supabase.from('daily_logs')
        .select('id, log_date, staff_member_id, work_order_id, injury, injury_detail, incident_report_filed, safety_note, flha_done, what_happened')
        .eq('company_id', companyId).gte('log_date', since).order('log_date', { ascending: false }),
      supabase.from('staff_members').select('id, name').eq('company_id', companyId),
      supabase.from('work_orders').select('id, title').eq('company_id', companyId),
    ]).then(([logs, staff, jobs]) => {
      if (cancelled) return
      const who = new Map((staff.data ?? []).map(s => [s.id, s.name]))
      const job = new Map((jobs.data ?? []).map(j => [j.id, j.title]))
      setRows((logs.data ?? []).map(l => ({ ...l, person: who.get(l.staff_member_id) ?? 'Crew', job: job.get(l.work_order_id) ?? null })))
    })
    return () => { cancelled = true }
  }, [companyId])

  const s = useMemo(() => {
    const logs = rows ?? []
    const injuries = logs.filter(l => l.injury)
    const asked = logs.filter(l => l.flha_done != null)
    return {
      total: logs.length,
      injuries,
      unfiled: injuries.filter(l => l.incident_report_filed !== true),
      notes: logs.filter(l => !l.injury && (l.safety_note ?? '').trim()),
      hazardAsked: asked.length,
      hazardDone: asked.filter(l => l.flha_done).length,
    }
  }, [rows])

  if (rows === null) return <div className="h-28 rounded-xl bg-white border border-ink-100 animate-pulse" />

  return (
    <section className="bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-ink-100">
        <h2 className="text-base font-bold text-ink-900">Your safety record · last {DAYS} days</h2>
        <p className="text-[13px] text-ink-500 mt-0.5 max-w-2xl leading-relaxed">
          Gathered from what the crew wrote in their daily logs: anyone hurt, anything they flagged, and whether the
          hazard check got done. Nothing here is entered twice.
        </p>
      </div>

      {s.total === 0 ? (
        <p className="px-5 md:px-6 py-5 text-sm text-ink-500 leading-relaxed">
          No daily logs in the last {DAYS} days, so there is nothing to gather yet. Once the crew write up their day,
          anything about safety shows here on its own.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-ink-100">
            <Figure
              value={s.injuries.length}
              label={s.injuries.length === 1 ? 'time someone was hurt' : 'times someone was hurt'}
              sub={s.injuries.length === 0 ? `Across ${s.total} daily log${s.total === 1 ? '' : 's'}.` : s.unfiled.length > 0 ? `${s.unfiled.length} with no incident report filed yet.` : 'A report was filed for each.'}
              tone={s.unfiled.length > 0 ? 'red' : 'plain'}
            />
            <Figure
              value={s.notes.length}
              label={s.notes.length === 1 ? 'safety note from site' : 'safety notes from site'}
              sub="Hazards the crew saw and wrote down."
            />
            <Figure
              value={s.hazardAsked === 0 ? 'Not asked' : `${s.hazardDone} of ${s.hazardAsked}`}
              label="hazard checks done"
              sub={s.hazardAsked === 0 ? 'No log in this period recorded one either way.' : s.hazardDone === s.hazardAsked ? 'Done on every log that recorded one.' : `${s.hazardAsked - s.hazardDone} started work without one.`}
              tone={s.hazardAsked > 0 && s.hazardDone < s.hazardAsked ? 'amber' : 'plain'}
            />
          </div>

          {s.injuries.length > 0 && (
            <div className="px-5 md:px-6 py-4 border-t border-ink-100">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-2">Someone was hurt</h3>
              <ul className="space-y-3">
                {s.injuries.map(l => (
                  <li key={l.id} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-[12px] text-ink-500">{day(l.log_date)} · {l.person}{l.job ? ` · ${l.job}` : ''}</p>
                    <p className="text-[14px] text-ink-900 leading-relaxed mt-0.5">{l.injury_detail || l.what_happened}</p>
                    <p className={`text-[12.5px] font-semibold mt-1 ${l.incident_report_filed === true ? 'text-green-700' : 'text-red-700'}`}>
                      {l.incident_report_filed === true ? 'Incident report filed.' : l.incident_report_filed === false ? 'No incident report filed yet.' : 'The crew did not say whether a report was filed.'}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-ink-500 mt-2 leading-relaxed">
                This is what the crew reported, not the official report. That still has to be filed with your workers' compensation board.
              </p>
            </div>
          )}

          {s.notes.length > 0 && (
            <div className="px-5 md:px-6 py-4 border-t border-ink-100">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-2">Flagged from site</h3>
              <ul className="divide-y divide-ink-100">
                {s.notes.slice(0, 8).map(l => (
                  <li key={l.id} className="py-2.5 first:pt-0">
                    <p className="text-[12px] text-ink-500">{day(l.log_date)} · {l.person}{l.job ? ` · ${l.job}` : ''}</p>
                    <p className="text-[14px] text-ink-900 leading-relaxed mt-0.5">{l.safety_note}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="px-5 md:px-6 py-3 border-t border-ink-100 bg-ink-50/50">
            <Link to="/logs" className="text-[13px] font-semibold text-brand-700 hover:text-brand-800">Read these in the daily logs →</Link>
          </div>
        </>
      )}
    </section>
  )
}

function Figure({ value, label, sub, tone = 'plain' }) {
  const cls = tone === 'red' ? 'text-red-700' : tone === 'amber' ? 'text-amber-700' : 'text-ink-900'
  return (
    <div className="px-5 md:px-6 py-4">
      <p className={`text-2xl font-bold tabular-nums leading-none ${cls}`}>{value}</p>
      <p className="text-[13px] font-semibold text-ink-800 mt-1.5">{label}</p>
      <p className="text-[12px] text-ink-500 mt-0.5 leading-snug">{sub}</p>
    </div>
  )
}
