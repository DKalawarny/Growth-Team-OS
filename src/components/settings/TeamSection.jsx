import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { sendStaffWelcome } from '../../lib/email'

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

  async function handleRemove(id) {
    setRemoving(id)
    await supabase.from('staff_members').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
    setRemoving(null)
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
          {[1, 2].map(i => <div key={i} className="h-12 bg-ink-50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="divide-y divide-ink-50">
          {staff.length > 0 && (
            <div className="p-6 space-y-2">
              {staff.map(s => (
                <StaffRow
                  key={s.id}
                  staff={s}
                  removing={removing === s.id}
                  onRemove={() => handleRemove(s.id)}
                  onSetDays={(days) => saveDays(s.id, days)}
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

function StaffRow({ staff: s, removing, onRemove, onSetDays }) {
  const initials = (s.name || s.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

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
            <strong>{notice.name}</strong> added — welcome email sent to {notice.email}.
          </>
        )}
        {notice.kind === 'noEmail' && (
          <>
            <strong>{notice.name}</strong> added. No email on file — you can still assign tasks, but they won't get notified.
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
