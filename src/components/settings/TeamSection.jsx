import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { sendStaffWelcome, sendStaffLogLink } from '../../lib/email'

/**
 * TeamSection — add staff members so they can be assigned tasks on the
 * Work Board and emailed when work changes hands.
 *
 * When a new staff member is added WITH an email address, we fire a
 * welcome email via the send-email Edge Function. The email is
 * fire-and-forget: if it fails (Resend down, address bounces) the staff
 * row is still created and the UI just surfaces a soft warning.
 *
 * `companyName` and `ownerName` are passed down so the welcome email can
 * be addressed properly ("Danny added you to Acme Roofing"). They're
 * optional — the email helper falls back to "Your manager" / "the team"
 * if missing.
 */
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const fmtHour = (h) => { const am = h < 12; const n = h % 12 === 0 ? 12 : h % 12; return `${n}${am ? 'am' : 'pm'}` }
const TZ_OPTIONS = [
  ['America/Edmonton', 'Mountain (Calgary / Edmonton)'],
  ['America/Vancouver', 'Pacific (Vancouver)'],
  ['America/Toronto', 'Eastern (Toronto)'],
  ['America/Winnipeg', 'Central (Winnipeg)'],
  ['America/Halifax', 'Atlantic (Halifax)'],
  ['America/New_York', 'US Eastern'],
  ['America/Chicago', 'US Central'],
  ['America/Denver', 'US Mountain'],
  ['America/Los_Angeles', 'US Pacific'],
  ['Europe/London', 'UK (London)'],
  ['Australia/Sydney', 'Sydney'],
  ['Pacific/Auckland', 'Auckland'],
]

export default function TeamSection({ companyId, companyName, ownerName }) {
  const [staff,     setStaff]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [form,      setForm]      = useState({ name: '', email: '', role: '' })
  const [saving,    setSaving]    = useState(false)
  const [removing,  setRemoving]  = useState(null)
  const [err,       setErr]       = useState(null)
  // Soft notice shown under the form after a successful add. Two shapes:
  //   { kind: 'sent',    name }   — welcome email shipped
  //   { kind: 'noEmail', name }   — staff added but no address, so nothing sent
  //   { kind: 'failed',  name }   — staff added but the email errored (rare)
  const [lastAdd,   setLastAdd]   = useState(null)
  const [tz,        setTz]        = useState('America/Edmonton')
  const [sendingId, setSendingId] = useState(null)
  const [sentId,    setSentId]    = useState(null)

  useEffect(() => {
    if (!companyId) return
    supabase
      .from('staff_members')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
      .then(({ data }) => {
        setStaff(data ?? [])
        setLoading(false)
      })
    supabase.from('companies').select('timezone').eq('id', companyId).maybeSingle()
      .then(({ data }) => { if (data?.timezone) setTz(data.timezone) })
  }, [companyId])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setErr(null)
    setLastAdd(null)
    setSaving(true)

    const payload = {
      company_id: companyId,
      name:       form.name.trim(),
      email:      form.email.trim() || null,
      role:       form.role.trim()  || null,
    }

    const { data, error } = await supabase
      .from('staff_members')
      .insert(payload)
      .select()
      .single()

    if (error) { setSaving(false); setErr(error.message); return }

    setStaff(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ name: '', email: '', role: '' })

    // Welcome email — fire-and-forget. Awaiting it lets us surface a confirm
    // banner ("Welcome email sent to jane@…") but a failure does NOT undo the
    // insert. Worst case the owner re-sends manually from the row.
    if (data.email) {
      const res = await sendStaffWelcome({
        to:          data.email,
        staffName:   data.name,
        companyName: companyName || 'the team',
        ownerName:   ownerName   || 'Your manager',
      })
      setLastAdd(
        res.ok
          ? { kind: 'sent',   name: data.name, email: data.email }
          : { kind: 'failed', name: data.name, email: data.email, error: res.error }
      )
    } else {
      setLastAdd({ kind: 'noEmail', name: data.name })
    }

    setSaving(false)
  }

  // ⚠️ Which days to NUDGE, not a record of who works when. A rota needs
  // maintaining and goes stale the first time someone swaps a shift; a nudge on
  // the wrong day costs nothing and gets ignored. Nothing else in the product
  // reads this, and nothing else should.
  async function saveDays(id, days) {
    setStaff(list => list.map(s => (s.id === id ? { ...s, log_days: days } : s)))
    await supabase.from('staff_members').update({ log_days: days }).eq('id', id)
  }

  async function saveHour(id, hour) {
    setStaff(list => list.map(s => (s.id === id ? { ...s, log_hour: hour } : s)))
    await supabase.from('staff_members').update({ log_hour: hour }).eq('id', id)
  }

  // Fast "set everyone the same," then adjust the exceptions (e.g. a night crew).
  async function applyToAll(src) {
    const days = Array.isArray(src.log_days) ? src.log_days : []
    const hour = src.log_hour ?? 16
    setStaff(list => list.map(s => (s.email ? { ...s, log_days: days, log_hour: hour } : s)))
    await supabase.from('staff_members').update({ log_days: days, log_hour: hour }).eq('company_id', companyId).not('email', 'is', null)
  }

  async function saveTz(v) {
    setTz(v)
    await supabase.from('companies').update({ timezone: v }).eq('id', companyId)
  }

  async function sendLinkNow(s) {
    if (!s.email) return
    setSendingId(s.id)
    const res = await sendStaffLogLink({ to: s.email, staffId: s.id, staffName: s.name })
    setSendingId(null)
    if (res?.ok) { setSentId(s.id); setTimeout(() => setSentId(null), 3000) } else { setErr('Could not send the link. Check the email address.') }
  }

  // Edit an existing staff member's name / email / role. Email edits do NOT
  // re-send the welcome (that fires only on add). Optimistic, reverts nothing
  // because a failed update just leaves the old values on a re-fetch.
  async function saveStaff(id, fields) {
    const clean = { name: (fields.name || '').trim(), email: (fields.email || '').trim() || null, role: (fields.role || '').trim() || null }
    if (!clean.name) return { ok: false }
    setStaff(list => list.map(s => (s.id === id ? { ...s, ...clean } : s)).sort((a, b) => a.name.localeCompare(b.name)))
    const { error } = await supabase.from('staff_members').update(clean).eq('id', id)
    return { ok: !error }
  }

  async function handleRemove(id) {
    setRemoving(id)
    await supabase.from('staff_members').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
    setRemoving(null)
  }

  return (
    <section className="mt-10 bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-ink-900 px-6 py-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400 mb-0.5">Field crew</div>
        <p className="text-xs text-ink-400">Your on-site crew. They get a phone link to log their day and take assigned jobs, no login needed.</p>
      </div>

      {loading ? (
        <div className="p-6 space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 bg-ink-50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="divide-y divide-ink-50">
          {staff.length > 0 && (
            <div className="px-6 pt-5 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-ink-500">Reminder times are in</span>
              <select value={tz} onChange={e => saveTz(e.target.value)} className="text-[12px] py-1 rounded-lg border border-ink-200">
                {(TZ_OPTIONS.some(([v]) => v === tz) ? TZ_OPTIONS : [[tz, tz], ...TZ_OPTIONS]).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          )}
          {staff.length > 0 && (
            <div className="p-6 pt-4 space-y-2">
              {staff.map(s => (
                <StaffRow
                  key={s.id}
                  staff={s}
                  removing={removing === s.id}
                  sending={sendingId === s.id}
                  sent={sentId === s.id}
                  onRemove={() => handleRemove(s.id)}
                  onSetDays={(days) => saveDays(s.id, days)}
                  onSetHour={(hour) => saveHour(s.id, hour)}
                  onApplyAll={() => applyToAll(s)}
                  onSendLink={() => sendLinkNow(s)}
                  onSave={(fields) => saveStaff(s.id, fields)}
                />
              ))}
            </div>
          )}

          <div className="p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-4">
              Add staff member
            </h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1.5">Full name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder="Jane Smith"
                    required
                    className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1.5">
                    Role <span className="text-ink-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={e => setField('role', e.target.value)}
                    placeholder="e.g. Technician"
                    className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1.5">
                  Email address <span className="text-ink-400 font-normal">(for task notifications)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="jane@yourcompany.com"
                  className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              {err && <p className="text-xs text-red-500">{err}</p>}
              {lastAdd && <AddNotice notice={lastAdd} onDismiss={() => setLastAdd(null)} />}
              <button
                type="submit"
                disabled={!form.name.trim() || saving}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-bold transition-colors"
              >
                {saving ? 'Adding…' : '+ Add to team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function StaffRow({ staff: s, removing, sending, sent, onRemove, onSetDays, onSetHour, onApplyAll, onSendLink, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState({ name: s.name ?? '', email: s.email ?? '', role: s.role ?? '' })
  const [busy, setBusy]       = useState(false)
  const initials = (s.name || s.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  async function save() {
    if (!draft.name.trim()) return
    setBusy(true)
    const res = await onSave({ ...draft })
    setBusy(false)
    if (res?.ok) setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-brand-200 bg-brand-50/40">
        <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          <input value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} placeholder="Role (optional)" className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          <input value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} placeholder="Email (for task notifications)" className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          <div className="flex items-center gap-2 pt-0.5">
            <button type="button" disabled={busy || !draft.name.trim()} onClick={save} className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-bold transition-colors">{busy ? 'Saving\u2026' : 'Save'}</button>
            <button type="button" disabled={busy} onClick={() => { setEditing(false); setDraft({ name: s.name ?? '', email: s.email ?? '', role: s.role ?? '' }) }} className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-700">Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-ink-100 hover:border-ink-200 transition-colors">
      <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink-800">{s.name}</span>
          {s.role && (
            <span className="text-[10px] font-medium text-ink-400 bg-ink-50 border border-ink-100 px-2 py-0.5 rounded-full">
              {s.role}
            </span>
          )}
        </div>
        {/* ⚠️ 2 Sep — Daniel: "a foreman might not need one every day... maybe
            he's sometimes not the foreman or has days off." Day toggles, and
            they only appear when there is an email to send to — offering to
            schedule a reminder we have no way to deliver is worse than not
            offering. */}
        {s.email && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <span className="text-[10px] text-ink-400 mr-1">Ask for a log on</span>
            {[[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [7, 'S']].map(([day, letter], i) => {
              const days = Array.isArray(s.log_days) ? s.log_days : []
              const on   = days.includes(day)
              return (
                <button
                  key={i}
                  type="button"
                  title={`${on ? 'Stop asking' : 'Ask'} on this day`}
                  onClick={() => onSetDays(on ? days.filter(d => d !== day) : [...days, day].sort())}
                  className={`w-5 h-5 rounded text-[10px] font-bold transition-colors ${
                    on ? 'bg-teal-600 text-white' : 'bg-ink-50 text-ink-300 hover:bg-ink-100'
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        )}
        {s.email && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-ink-400">at</span>
            <select
              value={s.log_hour ?? 16}
              onChange={(e) => onSetHour(Number(e.target.value))}
              className="text-[11px] py-0.5 pl-1.5 pr-1 rounded border border-ink-200 text-ink-700"
              title="When to send the reminder"
            >
              {HOURS.map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
            </select>
            <button type="button" onClick={onApplyAll} className="text-[10px] text-ink-400 hover:text-brand-600 underline" title="Set every crew member to these days and this time">
              apply to all
            </button>
          </div>
        )}
        {s.email ? (
          <a
            href={`mailto:${s.email}`}
            className="text-[11px] text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1 mt-0.5"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0.5" y="2" width="9" height="6.5" rx="1" />
              <path d="M0.5 3L5 6l4.5-3" />
            </svg>
            {s.email}
          </a>
        ) : (
          <span className="text-[11px] text-ink-300 italic mt-0.5 block">No email</span>
        )}
      </div>
      {s.email && (
        <button
          type="button"
          onClick={onSendLink}
          disabled={sending}
          className="text-[11px] font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors flex-shrink-0 whitespace-nowrap"
          title="Email this person their log link now"
        >
          {sent ? 'Sent \u2713' : sending ? 'Sending\u2026' : 'Send link'}
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="p-2 rounded-lg text-ink-300 hover:text-brand-600 hover:bg-brand-50 transition-colors flex-shrink-0"
        title="Edit"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 2.5l2 2L5 11l-2.5.5.5-2.5 6.5-6.5z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="p-2 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0"
        title="Remove"
      >
        {removing ? (
          <span className="text-xs text-ink-400">…</span>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 3.5h10M6 3.5V2.5h2v1M4.5 3.5v8h5v-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  )
}

/**
 * Inline confirmation after a staff add. Three states:
 *   - sent     : welcome email landed; show the address so the owner can verify
 *   - noEmail  : no address on the row, so we couldn't (and didn't) email
 *   - failed   : staff row created but the email errored — owner can resend
 *                manually or check the email_log
 *
 * Always dismissible. Auto-fades isn't worth the complexity here — the owner
 * will start typing the next staff member and the form clears on its own
 * the next time they hit Add.
 */
function AddNotice({ notice, onDismiss }) {
  const baseClasses = 'flex items-start gap-2 text-xs rounded-lg px-3 py-2 border'
  const variant =
    notice.kind === 'sent'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : notice.kind === 'noEmail'
        ? 'bg-ink-50 border-ink-200 text-ink-600'
        : 'bg-amber-50 border-amber-200 text-amber-800'

  return (
    <div className={`${baseClasses} ${variant}`}>
      <span className="flex-1">
        {notice.kind === 'sent' && (
          <>
            <strong>{notice.name}</strong> added, welcome email sent to {notice.email}.
          </>
        )}
        {notice.kind === 'noEmail' && (
          <>
            <strong>{notice.name}</strong> added. No email on file. You can still assign tasks, but they won't get notified.
          </>
        )}
        {notice.kind === 'failed' && (
          <>
            <strong>{notice.name}</strong> added, but the welcome email didn't send
            {notice.error ? ` (${notice.error})` : ''}. You can re-add or send manually.
          </>
        )}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-ink-400 hover:text-ink-700 text-base leading-none -mt-0.5"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
