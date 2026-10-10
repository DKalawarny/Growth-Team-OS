import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { quarterKey, quarterLabel, stepsDone, quarterHistory } from '../../lib/quarters'

/**
 * This quarter's priorities, as a view of the roadmap.
 *
 * ⚠️ 10 Oct, agreed with Daniel: rocks were a second list of priorities beside
 * the roadmap, and nothing tracked them (the "done when" boxes saved nowhere,
 * Solomon never saw them). A priority is now a roadmap milestone chosen for the
 * quarter. Ticking a step is saved on the milestone and moves its progress;
 * finishing it is the roadmap's own "completed". So there is ONE place where
 * done is recorded, Solomon reads it with the rest of the roadmap, and each
 * quarter leaves a count behind: finished out of set.
 *
 * Do not add a separate rocks table. If this needs something the milestone
 * lacks, add it to the milestone.
 */
export default function QuarterPriorities({ companyId }) {
  const [rows, setRows]     = useState(null)
  const [pick, setPick]     = useState('')
  const [newTitle, setNew]  = useState('')
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState(null)
  const key = quarterKey()

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    supabase.from('milestones')
      .select('id, title, description, actions, actions_done, rock_quarter, completed, completed_date, progress_percent, end_date, sort_order')
      .eq('company_id', companyId).order('sort_order', { ascending: true })
      .then(({ data, error: err }) => { if (!cancelled) { setRows(data ?? []); if (err) setError(err.message) } })
    return () => { cancelled = true }
  }, [companyId])

  const mine    = useMemo(() => (rows ?? []).filter(m => m.rock_quarter === key), [rows, key])
  const choices = useMemo(() => (rows ?? []).filter(m => !m.completed && m.rock_quarter !== key), [rows, key])
  const past    = useMemo(() => quarterHistory(rows ?? []).filter(q => q.quarter < key), [rows, key])
  const finished = mine.filter(m => m.completed).length

  async function patch(id, fields) {
    setError(null)
    setRows(prev => prev.map(m => (m.id === id ? { ...m, ...fields } : m)))
    const { error: err } = await supabase.from('milestones').update(fields).eq('id', id)
    if (err) setError(`That did not save: ${err.message}`)
  }

  function toggleStep(m, step) {
    const actions = Array.isArray(m.actions) ? m.actions : []
    const done = new Set((Array.isArray(m.actions_done) ? m.actions_done : []).filter(a => actions.includes(a)))
    if (done.has(step)) done.delete(step); else done.add(step)
    const next = actions.filter(a => done.has(a))
    // Progress is counted from the steps, capped below 100: "finished" is a
    // decision the owner makes, not something a last tick does for him.
    const pct = actions.length ? Math.min(95, Math.round((next.length / actions.length) * 100)) : m.progress_percent
    patch(m.id, { actions_done: next, ...(m.completed ? {} : { progress_percent: pct }) })
  }

  const finish  = m => patch(m.id, { completed: true, completed_date: new Date().toISOString(), progress_percent: 100 })
  const reopen  = m => patch(m.id, { completed: false, completed_date: null, progress_percent: Math.min(95, Math.round((stepsDone(m).done / Math.max(1, stepsDone(m).total)) * 100)) })
  const drop    = m => patch(m.id, { rock_quarter: null })
  const addPick = () => { if (pick) { patch(pick, { rock_quarter: key }); setPick('') } }

  async function addNew() {
    const title = newTitle.trim()
    if (!title || busy) return
    setBusy(true); setError(null)
    const sort = Math.max(0, ...(rows ?? []).map(m => m.sort_order ?? 0)) + 1
    const { data, error: err } = await supabase.from('milestones')
      .insert({ company_id: companyId, title, timeframe: 'Next 90 days', category: 'systems', sort_order: sort, progress_percent: 0, completed: false, actions: [], books: [], rock_quarter: key })
      .select('id, title, description, actions, actions_done, rock_quarter, completed, completed_date, progress_percent, end_date, sort_order').single()
    setBusy(false)
    if (err) { setError(`That did not save: ${err.message}`); return }
    setRows(prev => [...prev, data]); setNew('')
  }

  if (rows === null) return <div className="h-24 rounded-xl bg-white border border-ink-100 animate-pulse" />

  return (
    <section className="bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-ink-100 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-ink-900">This quarter · {quarterLabel(key)}</h2>
          <p className="text-[13px] text-ink-500 mt-0.5 max-w-2xl leading-relaxed">
            The three to five things from your roadmap that matter most right now. Tick each step when it is done.
            Solomon sees every tick. At the end of the quarter you see how many you finished.
          </p>
        </div>
        {mine.length > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold text-ink-900 tabular-nums leading-none">{finished} of {mine.length}</div>
            <div className="text-[11px] text-ink-400 mt-1">finished so far</div>
          </div>
        )}
      </div>

      {mine.length === 0 ? (
        <p className="px-5 md:px-6 py-5 text-sm text-ink-500">
          Nothing chosen for this quarter yet. Pick from your roadmap below, or add something new.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {mine.map(m => {
            const actions = Array.isArray(m.actions) ? m.actions : []
            const done = new Set(Array.isArray(m.actions_done) ? m.actions_done : [])
            const sd = stepsDone(m)
            const allTicked = sd.total > 0 && sd.done === sd.total
            return (
              <li key={m.id} className="px-5 md:px-6 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className={`text-[15px] font-semibold leading-snug ${m.completed ? 'text-ink-400 line-through' : 'text-ink-900'}`}>{m.title}</p>
                    <p className="text-[12px] text-ink-400 mt-0.5">
                      {m.completed
                        ? `Finished ${m.completed_date ? new Date(m.completed_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}`
                        : sd.total > 0 ? `${sd.done} of ${sd.total} steps done` : 'No steps written yet. Add them on the roadmap.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {m.completed ? (
                      <button type="button" onClick={() => reopen(m)} className="text-xs font-semibold text-ink-500 hover:text-ink-800">Not finished after all</button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => finish(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${allTicked ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'border border-ink-200 text-ink-700 hover:border-ink-300'}`}
                        >
                          Mark finished
                        </button>
                        <button type="button" onClick={() => drop(m)} className="text-xs text-ink-400 hover:text-red-700">Not this quarter</button>
                      </>
                    )}
                  </div>
                </div>

                {!m.completed && sd.total > 0 && (
                  <div className="mt-2 h-1.5 w-full max-w-md bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.round((sd.done / sd.total) * 100)}%` }} />
                  </div>
                )}

                {actions.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {actions.map(a => (
                      <li key={a}>
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={done.has(a)}
                            onChange={() => toggleStep(m, a)}
                            className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-400 border-ink-300"
                          />
                          <span className={`text-sm leading-snug ${done.has(a) ? 'text-ink-400 line-through' : 'text-ink-800'}`}>{a}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="px-5 md:px-6 py-4 border-t border-ink-100 bg-ink-50/50 space-y-3">
        {mine.length >= 5 && (
          <p className="text-[12.5px] text-amber-800">
            That is {mine.length}. Past five, none of them are really priorities. Worth dropping one before adding another.
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={pick}
            onChange={e => setPick(e.target.value)}
            className="flex-1 min-w-[220px] rounded-lg border border-ink-200 px-3 py-2 text-sm bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="">Choose from your roadmap…</option>
            {choices.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <button type="button" onClick={addPick} disabled={!pick} className="px-4 py-2 rounded-lg bg-ink-900 hover:bg-ink-800 disabled:opacity-40 text-white text-sm font-semibold">
            Add to this quarter
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={newTitle}
            onChange={e => setNew(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNew()}
            placeholder="Or something that is not on the roadmap yet"
            className="flex-1 min-w-[220px] rounded-lg border border-ink-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button type="button" onClick={addNew} disabled={!newTitle.trim() || busy} className="px-4 py-2 rounded-lg border border-ink-200 bg-white hover:border-ink-300 disabled:opacity-40 text-ink-800 text-sm font-semibold">
            Add it
          </button>
        </div>
        <p className="text-[12px] text-ink-400">
          Anything added here is added to your roadmap too. <Link to="/roadmap" className="font-semibold text-brand-700 hover:text-brand-800">Open the roadmap</Link> to write its steps or set a date.
        </p>
        {error && <p className="text-[13px] text-red-700">{error}</p>}
      </div>

      {past.length > 0 && (
        <div className="px-5 md:px-6 py-4 border-t border-ink-100">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Quarter by quarter</h3>
          <p className="text-[12px] text-ink-400 mt-0.5 mb-2">How many of the priorities you set got finished.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {past.slice(-6).map(q => (
              <li key={q.quarter} className="text-sm text-ink-800">
                <span className="font-semibold tabular-nums">{q.finished} of {q.set}</span>
                <span className="text-ink-500"> finished · {quarterLabel(q.quarter).replace(/ \(.*\)$/, '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
