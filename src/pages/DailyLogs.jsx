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
      .select('id, note, note_date, created_at, author_profile')
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
      <p className="text-xs text-ink-500 mt-1.5 max-w-xl leading-relaxed">
        What the crew wrote at the end of each day, in their own words. You can add
        a note of your own beside any of them — you cannot change what they wrote,
        and you do not need to: Solomon reads every log either way.
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
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Notes on the day</h2>
          <p className="text-[12px] text-ink-400 mt-0.5">
            Anything worth knowing that is not about one job — a supplier, a client call, who is off next week.
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
                  <span className="text-[12px] text-ink-400 tabular-nums flex-shrink-0 mt-0.5 w-20">{n.note_date}</span>
                  <p className="text-[14px] text-ink-800 leading-relaxed whitespace-pre-wrap flex-1">{n.note}</p>
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
                  <span>{log.log_date}</span>
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
                    Your note
                  </label>
                  <textarea
                    value={draft}
                    onChange={e => setDrafts(d => ({ ...d, [log.id]: e.target.value }))}
                    rows={2}
                    placeholder="Anything the owner should know that isn't in the log above."
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => saveNote(log)}
                      disabled={saving === log.id || (!dirty && !!log.reviewed_at)}
                      className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-ink-200 text-white text-sm font-medium transition-colors"
                    >
                      {saving === log.id
                        ? 'Saving…'
                        : log.reviewed_at ? (dirty ? 'Update note' : 'Read') : (dirty ? 'Save note' : 'Mark as read')}
                    </button>
                    {dirty && <span className="text-[12px] text-ink-400">Unsaved</span>}
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
