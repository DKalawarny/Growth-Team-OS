import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useSubscription } from '../../hooks/useSubscription'
import {
  buildCalendarEvents,
  getMonthGrid,
  startOfMonth,
  addMonthsStart,
  monthLabel,
} from '../../lib/calendarEvents'
import { toDateString } from '../../lib/milestoneDates'
import { downloadICS } from '../../lib/icsExport'

const WEEKDAYS = ['S','M','T','W','T','F','S']

const EVENT_DOT = {
  'milestone-end':   'bg-brand-500',
  'milestone-start': 'bg-brand-200',
  'checkin':         'bg-green-400',
  'document':        'bg-amber-400',
  'trial-end':       'bg-amber-500',
  'subscription-renewal': 'bg-blue-400',
  'subscription-canceled':'bg-red-400',
}

export default function DashboardCalendar() {
  const { profile, company }           = useAuth()
  const { subscription, trialEndsAt } = useSubscription()
  const [rawData, setRawData]          = useState(null)
  const [anchor, setAnchor]            = useState(() => startOfMonth(new Date()))
  const [selected, setSelected]        = useState(() => toDateString(new Date()))

  useEffect(() => {
    if (!profile?.company_id) return
    const since = new Date()
    since.setMonth(since.getMonth() - 12)

    Promise.all([
      supabase.from('milestones')
        .select('id, title, timeframe, start_date, end_date, completed')
        .eq('company_id', profile.company_id),
      supabase.from('checkins')
        .select('id, win, revenue_update, created_at')
        .eq('company_id', profile.company_id)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('documents')
        .select('id, tool_id, title, created_at')
        .eq('company_id', profile.company_id)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false }),
    ]).then(([ms, ci, docs]) => {
      setRawData({
        milestones: ms.data  ?? [],
        checkins:   ci.data  ?? [],
        documents:  docs.data ?? [],
      })
    }).catch(() => {})
  }, [profile?.company_id])

  const eventsByDate = useMemo(() => {
    if (!rawData) return new Map()
    return buildCalendarEvents({
      milestones:  rawData.milestones,
      checkins:    rawData.checkins,
      documents:   rawData.documents,
      trialEndsAt,
      subscription,
    })
  }, [rawData, trialEndsAt, subscription])

  const cells         = useMemo(() => getMonthGrid(anchor), [anchor])
  const selectedEvts  = eventsByDate.get(selected) ?? []

  // Next upcoming events (from today onwards, across full dataset)
  const upcoming = useMemo(() => {
    const today = toDateString(new Date())
    const all   = []
    for (const [dateStr, evts] of eventsByDate) {
      if (dateStr >= today) {
        evts.forEach(e => all.push({ ...e, dateStr }))
      }
    }
    return all
      .filter(e => e.type === 'milestone-end' || e.type === 'trial-end' || e.type === 'subscription-renewal')
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .slice(0, 4)
  }, [eventsByDate])

  return (
    <section className="bg-white rounded-xl shadow-sm border border-ink-100 overflow-hidden">

      {/* Header */}
      <div className="bg-ink-900 px-5 py-3.5 flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400">
          Calendar
        </span>
        <div className="flex items-center gap-3">
          {rawData?.milestones?.length > 0 && (
            <button
              type="button"
              title="Export milestones to iPhone Calendar, Google Calendar, or Outlook"
              onClick={() => downloadICS(rawData.milestones, company?.name)}
              className="text-[10px] text-ink-500 hover:text-brand-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5V3m0 7.5L5.5 8M8 10.5L10.5 8" />
                <rect x="1.5" y="4" width="13" height="10.5" rx="1.5" strokeLinecap="round" />
                <path strokeLinecap="round" d="M5 1.5v2.5M11 1.5v2.5" />
              </svg>
              Export .ics
            </button>
          )}
          <Link
            to="/calendar"
            className="text-[10.5px] text-ink-400 hover:text-brand-400 transition-colors"
          >
            Full view →
          </Link>
        </div>
      </div>

      <div className="p-4">

        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setAnchor(a => addMonthsStart(a, -1))}
            className="w-6 h-6 flex items-center justify-center rounded text-ink-500 hover:bg-ink-100 transition-colors text-sm"
          >
            ‹
          </button>
          <span className="text-xs font-bold text-ink-800">{monthLabel(anchor)}</span>
          <button
            type="button"
            onClick={() => setAnchor(a => addMonthsStart(a, 1))}
            className="w-6 h-6 flex items-center justify-center rounded text-ink-500 hover:bg-ink-100 transition-colors text-sm"
          >
            ›
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-ink-400 py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {!rawData ? (
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-ink-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map(cell => {
              const evts      = eventsByDate.get(cell.dateStr) ?? []
              const isSelected = cell.dateStr === selected
              const isToday    = cell.isToday

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelected(cell.dateStr)}
                  className={`flex flex-col items-center justify-start pt-1 pb-1 rounded-lg transition-colors h-9 ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : isToday
                      ? 'bg-brand-50 ring-1 ring-brand-400'
                      : !cell.inMonth
                      ? 'opacity-30'
                      : 'hover:bg-ink-50'
                  }`}
                >
                  <span className={`text-[11px] font-semibold leading-none ${
                    isSelected ? 'text-white' : isToday ? 'text-brand-700' : 'text-ink-700'
                  }`}>
                    {cell.date.getDate()}
                  </span>
                  {/* Event dots */}
                  {evts.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {evts.slice(0, 3).map((ev, i) => (
                        <span
                          key={i}
                          className={`w-1 h-1 rounded-full flex-shrink-0 ${
                            isSelected ? 'bg-white/70' : (EVENT_DOT[ev.type] ?? 'bg-ink-300')
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Selected day events */}
        {selectedEvts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-ink-50">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2">
              {selected === toDateString(new Date()) ? 'Today' : formatDay(selected)}
            </div>
            <ul className="space-y-1.5">
              {selectedEvts.slice(0, 3).map((ev, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-ink-700">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${EVENT_DOT[ev.type] ?? 'bg-ink-300'}`} />
                  <span className="truncate">{ev.title}</span>
                </li>
              ))}
              {selectedEvts.length > 3 && (
                <li className="text-[10px] text-ink-400">+{selectedEvts.length - 3} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Upcoming strip — only shown when no selected-day events */}
        {selectedEvts.length === 0 && upcoming.length > 0 && (
          <div className="mt-3 pt-3 border-t border-ink-50">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2">
              Coming up
            </div>
            <ul className="space-y-1.5">
              {upcoming.map((ev, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${EVENT_DOT[ev.type] ?? 'bg-ink-300'}`} />
                  <span className="text-ink-700 truncate flex-1">{ev.title}</span>
                  <span className="text-ink-400 flex-shrink-0 tabular-nums">{formatDay(ev.dateStr)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function formatDay(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}
