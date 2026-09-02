import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

/**
 * DailyLogs — the office's view of what the crew wrote at the end of the day.
 *
 * ⚠️ THIS IS A READING SCREEN, NOT AN EDITING ONE. The crew's account
 * (what_happened / blockers) is rendered and never editable here. The only
 * thing the office can add is its own note alongside it. That is the whole
 * value of the table — it is the one input in Solomon's context the owner did
 * not write — and a screen that let the office revise it would quietly turn
 * ground truth back into a filtered report.
 *
 * ⚠️ MARKING SOMETHING READ CHANGES NOTHING DOWNSTREAM. Solomon reads every
 * log whether or not it has been reviewed. Review is a pass over the data, not
 * a queue in front of it — otherwise an unreviewed backlog would look
 * identical to a quiet week, and silence would be mistaken for calm.
 *
 * ⚠️ Daniel, 2 Sep: "I don't think the PM needs Solomon for the chat." So this
 * page is deliberately self-contained — it reads daily_logs and nothing else.
 * When roles land, a PM gets this, the board and playbooks, and neither the
 * advisor nor the numbers.
 */
// ⚠️ 2 Sep — dates rendered as raw "2026-09-01". An owner scanning a week of
// logs is asking "was that yesterday or last Tuesday", and an ISO string makes
// him do the arithmetic every row.
function humanDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((today - d) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * ⭐ THE POINT OF THE PAGE, not a nice-to-have.
 *
 * One locked door is a bad morning. The same locked door four times is a
 * system nobody wrote down — that is Daniel's own insight, and it is the whole
 * reason blockers get collected. But a reverse-chronological list buries it:
 * the two entries that rhyme are days apart and the reader has to hold both in
 * his head to notice.
 *
 * Deliberately crude matching. Real overlap in a foreman's phrasing shows up in
 * the nouns he reaches for, and anything cleverer would need embeddings and
 * would start claiming patterns that are not there. Two logs sharing two
 * uncommon words is a hint worth showing, phrased as a question rather than a
 * finding.
 */
function repeatedBlockers(logs) {
  const STOP = new Set(['the','and','for','was','were','with','that','this','from','they','them','had','has','have','been','into','over','about','again','then','than','when','what','who','not','but','out','all','are','our','you','your','his','her','its','it','on','in','to','of','a','i','at','by','up','me','my','no','so','as','is','be','an','or','if','we','he'])
  const words = t => new Set(String(t).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)))
  const withBlockers = logs.filter(l => l.blockers?.trim())
  const pairs = []
  for (let i = 0; i < withBlockers.length; i++) {
    for (let j = i + 1; j < withBlockers.length; j++) {
      const a = words(withBlockers[i].blockers)
      const b = words(withBlockers[j].blockers)
      const shared = [...a].filter(w => b.has(w))
      if (shared.length >= 2) pairs.push({ a: withBlockers[i], b: withBlockers[j], shared })
    }
  }
  return pairs.slice(0, 2)
}

export default function DailyLogs() {
  const { profile } = useAuth()
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts]   = useState({})   // { [logId]: text }
  const [saving, setSaving]   = useState(null) // logId currently saving

  // Office notes — the day-to-day things that are not about any one job.
  // Deliberately a separate stream from the crew's logs; see migration 037 for
  // why they are not the same table.
  const [notes, setNotes]         = useState([])
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  const load = useCallback(async () => {
    if (!profile?.company_id) return
    const { data, error } = await supabase
      .from('daily_logs')
      .select('id, log_date, what_happened, blockers, hours_on_site, pm_note, reviewed_at, staff_member_id, work_order_id')
      .eq('company_id', profile.company_id)
      .order('log_date', { ascending: false })
      .limit(100)
    if (error) { setLoading(false); return }

    // Names are resolved client-side rather than joined, so a deleted staff
    // member leaves the log readable instead of taking it down with them.
    const [{ data: staff }, { data: orders }] = await Promise.all([
      supabase.from('staff_members').select('id, name').eq('company_id', profile.company_id),
      supabase.from('work_orders').select('id, title').eq('company_id', profile.company_id),
    ])
    const staffById = new Map((staff ?? []).map(s => [s.id, s.name]))
    const woById    = new Map((orders ?? []).map(o => [o.id, o.title]))

    const { data: noteRows } = await supabase
      .from('office_notes')
      .select('id, note, note_date, created_at, author_profile, status')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotes(noteRows ?? [])

    setLogs((data ?? []).map(l => ({
      ...l,
      person: staffById.get(l.staff_member_id) ?? 'Crew',
      job:    woById.get(l.work_order_id) ?? null,
    })))
    setLoading(false)
  }, [profile?.company_id])

  useEffect(() => { load() }, [load])

  const saveNote = async (log) => {
    const note = (drafts[log.id] ?? log.pm_note ?? '').trim()
    setSaving(log.id)
    const { error } = await supabase
      .from('daily_logs')
      .update({
        pm_note:     note || null,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', log.id)
    setSaving(null)
    if (!error) {
      setDrafts(d => { const n = { ...d }; delete n[log.id]; return n })
      load()
    }
  }

  const addNote = async () => {
    const text = noteDraft.trim()
    if (!text || noteSaving) return
    setNoteSaving(true)
    const { error } = await supabase.from('office_notes').insert({
      company_id:     profile.company_id,
      author_profile: profile.id,
      note:           text,
    })
    setNoteSaving(false)
    if (!error) { setNoteDraft(''); load() }
  }

  // ⚠️ Done notes stay on the page. A note that got done is still the record
  // that it needed doing — "need a new saw" ticked off three times in a quarter
  // says something a disappearing checkbox would erase.
  const setNoteStatus = async (id, status) => {
    await supabase
      .from('office_notes')
      .update({ status, done_at: status === 'done' ? new Date().toISOString() : null })
      .eq('id', id)
    setNotes(ns => ns.map(n => (n.id === id ? { ...n, status } : n)))
  }

  const deleteNote = async (id) => {
    await supabase.from('office_notes').delete().eq('id', id)
    load()
  }

  if (loading) {
    return <div className="p-8 text-sm text-ink-500">Loading the logs…</div>
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1 className="text-xl font-bold text-ink-900">Daily logs</h1>
      {/* ⚠️ 2 Sep — the old blurb explained the PLUMBING: "you cannot change
          what they wrote... Solomon reads every log either way". Daniel: "I
          don't like the description, the notes are more just for the owner,
          it's to keep jobs sorted." Right — the reader does not care what
          Solomon does with it, he cares what the page is FOR. Say that, and let
          the two sections explain the difference between themselves. */}
      <p className="text-xs text-ink-500 mt-1.5 max-w-xl leading-relaxed">
        Your own running list, and what the crew wrote from site at the end of each
        day. Between them they keep the jobs straight, instead of it living in your
        head and half a dozen text messages.
      </p>

      {/* ⚠️ Office notes sit ABOVE the crew logs on purpose. This is the box the
          person at the desk actually reaches for — the crew's logs arrive on
          their own, but a note about the day only exists if somebody writes it,
          and a compose box below a hundred log cards never gets found.
          It is also what makes the note field visible at all when there are no
          logs yet: Daniel asked "where is the area for the PM to make notes?"
          precisely because the per-log note field only renders once a log
          exists, so with an empty list the whole feature was invisible. */}
      <div className="mt-6 rounded-xl border border-ink-100 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-ink-100">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Your list</h2>
          <p className="text-[12px] text-ink-400 mt-0.5">
            Things to remember, chase or buy — not tied to any one job. Tick them off
            as they go. Written by you and the office, not the crew.
          </p>
        </div>
        <div className="px-5 py-4">
          <textarea
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            rows={2}
            placeholder="Supplier rang — steel is going up 6% from the first. Worth repricing the Cascade quote before it goes out."
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
          />
          <button
            type="button"
            onClick={addNote}
            disabled={noteSaving || !noteDraft.trim()}
            className="mt-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-ink-200 text-white text-sm font-medium transition-colors"
          >
            {noteSaving ? 'Saving…' : 'Add note'}
          </button>

          {notes.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {notes.map(n => (
                <li key={n.id} className="flex items-start gap-3 group">
                  {/* ⚠️ Three explicit labels rather than a click-to-cycle circle.
                      Daniel asked for check marks AND said "I just want assurance
                      it's all self-explanatory so it works" — a control whose
                      states you discover by clicking it is the opposite of that.
                      "Working on it" is a real answer and a checkbox forces it
                      into the wrong one, so three, not two. */}
                  <div className="flex gap-1 flex-shrink-0 mt-0.5">
                    {[['open', 'To do'], ['doing', 'Doing'], ['done', 'Done']].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setNoteStatus(n.id, val)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                          (n.status ?? 'open') === val
                            ? val === 'done'
                              ? 'bg-brand-600 border-brand-600 text-white'
                              : 'bg-ink-900 border-ink-900 text-white'
                            : 'border-ink-200 text-ink-400 hover:border-ink-300'
                        }`}
                      >
                        {val === 'done' ? '✓ ' : ''}{label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[12px] text-ink-400 flex-shrink-0 mt-1 w-20" title={n.note_date}>{humanDate(n.note_date)}</span>
                  <p className={`text-[14px] leading-relaxed whitespace-pre-wrap flex-1 mt-0.5 ${
                    n.status === 'done' ? 'text-ink-400 line-through' : 'text-ink-800'
                  }`}>{n.note}</p>
                  {/* Only the author can delete — RLS enforces it, this just
                      hides a button that would fail for everyone else. */}
                  {n.author_profile === profile?.id && (
                    <button
                      type="button"
                      onClick={() => deleteNote(n.id)}
                      className="text-[12px] text-ink-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(() => {
        const pairs = repeatedBlockers(logs)
        if (!pairs.length) return null
        return (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Same thing came up twice
            </p>
            <p className="text-[13px] text-ink-700 mt-1.5 leading-relaxed">
              Worth a look — two different days ran into something similar. It may be
              coincidence, or it may be one thing you can fix once.
            </p>
            <ul className="mt-3 space-y-2">
              {pairs.map((p, i) => (
                <li key={i} className="text-[13px] text-ink-800 leading-relaxed">
                  <span className="text-ink-500">{humanDate(p.a.log_date)}:</span> {p.a.blockers}
                  <br />
                  <span className="text-ink-500">{humanDate(p.b.log_date)}:</span> {p.b.blockers}
                </li>
              ))}
            </ul>
          </div>
        )
      })()}

      {/* ⚠️ The crew section gets its own header. Daniel: "the notes should be
          explained better — general notes vs notes for that day's job the
          foreman gave at the end of the day." Without a heading the two blocks
          look like one list with different formatting. */}
      <div className="mt-10 mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
          From the crew &middot; end of day
        </h2>
        <p className="text-[12px] text-ink-400 mt-0.5 max-w-xl leading-relaxed">
          What each person wrote from site when they finished, about the job they were
          on. You cannot edit it &mdash; add your own note underneath instead.
        </p>
      </div>

      {logs.length === 0 && (
        <div className="mt-8 rounded-xl border border-ink-100 bg-white px-5 py-6">
          <p className="text-sm font-semibold text-ink-900">No crew logs yet.</p>
          <p className="text-[13px] text-ink-500 mt-1.5 leading-relaxed">
            Crew write these from the link they already use for their jobs, under
            &ldquo;End my shift&rdquo;. Nothing here means nobody has written one —
            not that the days went smoothly.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {logs.map(log => {
          const draft = drafts[log.id] ?? log.pm_note ?? ''
          const dirty = draft.trim() !== (log.pm_note ?? '').trim()
          return (
            <div key={log.id} className="rounded-xl border border-ink-100 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-ink-900">{log.person}</span>
                  {log.job && <span className="text-[13px] text-ink-500"> · {log.job}</span>}
                </div>
                <div className="flex items-center gap-3 text-[12px] text-ink-400">
                  {log.hours_on_site != null && <span>{log.hours_on_site}h on site</span>}
                  <span title={log.log_date}>{humanDate(log.log_date)}</span>
                  {log.reviewed_at && <span className="text-brand-600 font-semibold">read</span>}
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <p className="text-[15px] text-ink-900 leading-relaxed whitespace-pre-wrap">
                  {log.what_happened}
                </p>
                {log.blockers && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Got in the way</p>
                    <p className="text-[14px] text-ink-800 mt-1 leading-relaxed whitespace-pre-wrap">{log.blockers}</p>
                  </div>
                )}

                <div className="pt-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-1.5">
                    Your note on this job
                  </label>
                  <textarea
                    value={draft}
                    onChange={e => setDrafts(d => ({ ...d, [log.id]: e.target.value }))}
                    rows={2}
                    placeholder="Anything the owner should know that isn't in the log above."
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                  />
                  {/* ⚠️ 2 Sep — this rendered a DISABLED button labelled "Read"
                      once a note was saved, which reads as an action you are
                      not allowed to take. It was a status wearing a button's
                      clothes, and the header already showed "read" anyway.
                      Now: a button only when there is something to do, and the
                      state said in words when there is not. */}
                  <div className="mt-2 flex items-center gap-3 min-h-[36px]">
                    {(dirty || !log.reviewed_at) ? (
                      <button
                        type="button"
                        onClick={() => saveNote(log)}
                        disabled={saving === log.id}
                        className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-ink-300 text-white text-sm font-medium transition-colors"
                      >
                        {saving === log.id
                          ? 'Saving…'
                          : dirty ? (log.pm_note ? 'Update note' : 'Save note') : 'Mark as read'}
                      </button>
                    ) : (
                      <span className="text-[12px] text-ink-400">Saved.</span>
                    )}
                    {dirty && <span className="text-[12px] text-amber-700">Unsaved</span>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
