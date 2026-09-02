import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { classifyAll, todayYmd } from '../lib/milestoneProgress'

/**
 * Home.
 *
 * This page used to stack twelve blocks — hero, KPI strip, tool pulse, quick
 * actions, executive brief, next focus, calendar, recent activity, trajectory,
 * roadmap strip, overdue alert. Everything competed for attention equally, so
 * opening the app felt like reading an incident report. For an owner already
 * carrying the business that is the opposite of useful.
 *
 * It now says ONE thing — whichever has a date on it — and lets the rest wait
 * behind a quiet row of chips. The counts at the bottom are counted, not
 * scored: no targets, no progress bars, no red. A number that judges you every
 * morning is guilt-driven engagement wearing a calm palette.
 *
 * None of the old components were deleted; this page simply stopped rendering
 * them. They live on in src/components/dashboard/ and on the surfaces that own
 * them.
 */

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'
}

function daysBetween(iso, now) {
  const past = new Date(iso).getTime()
  if (!Number.isFinite(past)) return null
  return Math.max(0, Math.floor((now.getTime() - past) / (1000 * 60 * 60 * 24)))
}

function longDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
}

/**
 * Pick the single thing worth leading with, and everything else that's live.
 *
 * Deliberately derived from real rows rather than generated prose — Solomon
 * writes the briefing on his own page, and inventing a summary here would be
 * putting words in his mouth that aren't grounded in anything.
 */
function pickFocus({ milestones, statusById, daysSinceLastCheckin }) {
  const open = milestones.filter(m => !m.completed)
  const byStatus = s => open.filter(m => statusById.get(m.id) === s)

  const overdue    = byStatus('overdue')
  const inProgress = byStatus('in-progress')
  const ready      = byStatus('ready')

  const candidates = [...overdue, ...inProgress, ...ready]
  const lead = candidates[0] ?? null

  let headline, detail
  if (overdue.length) {
    headline = `“${overdue[0].title}” has passed its date.`
    detail = overdue.length > 1
      ? `It's the oldest of ${overdue.length} that have slipped. Worth either moving the date honestly or deciding it isn't happening.`
      : `Worth either moving the date honestly or deciding it isn't happening. Carrying it costs more than closing it.`
  } else if (inProgress.length) {
    headline = `“${inProgress[0].title}” is the one in flight.`
    detail = inProgress[0].end_date
      ? `Due ${new Date(inProgress[0].end_date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}. Nothing else needs you first.`
      : `Nothing else needs you first.`
  } else if (ready.length) {
    headline = `“${ready[0].title}” is ready to start.`
    detail = `Nothing is blocking it, and nothing else is in flight.`
  } else if (daysSinceLastCheckin === null) {
    headline = `Nothing is on the plan yet.`
    detail = `Half an hour with Solomon is usually enough to get the first few things down.`
  } else {
    headline = `Nothing has a date on it this week.`
    detail = `That's worth noticing rather than filling. If it's genuinely quiet, take the quiet.`
  }

  return { headline, detail, lead, others: candidates.slice(1, 3) }
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false
    const cid = profile.company_id

    ;(async () => {
      const [msRes, ciRes, ciCount, docCount, playCount, staffCount, logsRes, openNotesRes, ordersRes] = await Promise.all([
        supabase.from('milestones').select('*').eq('company_id', cid).order('sort_order', { ascending: true }),
        supabase.from('checkins').select('id, created_at').eq('company_id', cid).order('created_at', { ascending: false }).limit(1),
        supabase.from('checkins').select('id', { count: 'exact', head: true }).eq('company_id', cid),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('company_id', cid),
        supabase.from('work_order_templates').select('id', { count: 'exact', head: true }).eq('company_id', cid).is('archived_at', null),
        supabase.from('staff_members').select('id', { count: 'exact', head: true }).eq('company_id', cid),
        // ⚠️ 2 Sep — everything below is new to this page. The dashboard was
        // built before the job record existed and showed only milestones, so it
        // could not answer either of the two questions an owner actually opens
        // it with: "what needs me today" and "is this running without me".
        supabase.from('daily_logs')
          .select('id, log_date, what_happened, blockers, injury, safety_note, reviewed_at, staff_member_id, who_on_site')
          .eq('company_id', cid).order('log_date', { ascending: false }).limit(30),
        supabase.from('office_notes')
          .select('id, status').eq('company_id', cid).neq('status', 'done'),
        supabase.from('work_orders')
          .select('id, status, quoted_amount, cost_amount, invoiced_amount').eq('company_id', cid),
      ])
      if (cancelled) return
      setState({
        loading:      false,
        milestones:   msRes.data ?? [],
        lastCheckin:  ciRes.data?.[0] ?? null,
        counts: {
          checkins:  ciCount.count    ?? 0,
          documents: docCount.count   ?? 0,
          playbooks: playCount.count  ?? 0,
          staff:     staffCount.count ?? 0,
        },
        logs:      logsRes.data       ?? [],
        openNotes: openNotesRes.data  ?? [],
        orders:    ordersRes.data     ?? [],
      })
    })()

    return () => { cancelled = true }
  }, [profile?.company_id])

  // ⚠️ 2 Sep — Daniel: "it depends on the owner's status; if in the business
  // will need a different dashboard than the owner that is just checking on the
  // CEO." Two modes on one page, because moving between them IS what the
  // product is for — a homepage that only served one would be telling half its
  // customers they had arrived, or the other half that they never would.
  //
  // ⚠️ user-scoped localStorage key, and userId is deliberately NOT in the
  // save-effect deps — same rule as everywhere else in this codebase.
  const [mode, setMode] = useState('today')
  useEffect(() => {
    if (!profile?.id) return
    try {
      const saved = localStorage.getItem(`eliv8_dash_mode_${profile.id}`)
      if (saved === 'today' || saved === 'running') setMode(saved)
    } catch { /* storage blocked — 'today' is the safe default */ }
  }, [profile?.id])
  const chooseMode = (next) => {
    setMode(next)
    try { localStorage.setItem(`eliv8_dash_mode_${profile?.id}`, next) } catch { /* noop */ }
  }

  // ⭐ THE HONEST SIGNAL. An owner writing his own daily logs is in the
  // business, whatever he told the questionnaire — and that is the only
  // owner-dependence measure in the product that is evidence rather than
  // self-report. It belongs in the "is it running" view as content, not as a
  // nag: it is literally the answer to the question that view asks.
  const dash = useMemo(() => {
    const logs   = state.logs   ?? []
    const orders = state.orders ?? []
    const today  = todayYmd()

    const unsafe      = logs.filter(l => l.injury || l.safety_note)
    const unreadLogs  = logs.filter(l => !l.reviewed_at)
    const ownLogs     = logs.filter(l => !l.staff_member_id)   // no crew member = the owner wrote it
    const priced      = orders.filter(o => o.invoiced_amount != null && o.cost_amount != null && o.invoiced_amount > 0)
    const margin      = priced.length
      ? Math.round(priced.reduce((a, o) => a + ((o.invoiced_amount - o.cost_amount) / o.invoiced_amount), 0) / priced.length * 100)
      : null

    return {
      unsafe,
      unsafeToday: unsafe.filter(l => l.log_date === today),
      unreadLogs,
      openNotes:   state.openNotes ?? [],
      liveJobs:    orders.filter(o => o.status && o.status !== 'done').length,
      ownLogs,
      logCount:    logs.length,
      margin,
      pricedCount: priced.length,
      reviewedPct: logs.length ? Math.round(((logs.length - unreadLogs.length) / logs.length) * 100) : null,
    }
  }, [state.logs, state.orders, state.openNotes])

  const statusById = useMemo(
    () => classifyAll(state.milestones ?? [], todayYmd()),
    [state.milestones],
  )

  if (state.loading) return <LoadingSkeleton />

  const { milestones, lastCheckin, counts } = state
  const firstName = profile?.name?.split(' ')[0] ?? null
  const daysSinceLastCheckin = lastCheckin ? daysBetween(lastCheckin.created_at, new Date()) : null
  const done = milestones.filter(m => m.completed).length

  const { headline, detail, others } = pickFocus({ milestones, statusById, daysSinceLastCheckin })

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto w-full max-w-[680px] px-6 pt-16 pb-12 flex flex-col gap-11">

        <header className="animate-fade-in flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-300">
            {longDate()}
          </p>
          <h1 className="font-serif text-4xl leading-[1.1] text-ink-900">
            {greeting()}{firstName ? `, ${firstName}` : ''}.
          </h1>
        </header>

        {/* ── Which question are you here to answer ───────────────────────── */}
        <div className="animate-fade-in flex gap-1 -mt-4">
          {[['today', 'What needs me today'], ['running', 'Is it running without me']].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => chooseMode(val)}
              className={`text-[12.5px] px-3.5 py-1.5 rounded-full border transition-colors ${
                mode === val
                  ? 'bg-ink-900 border-ink-900 text-white'
                  : 'border-ink-200 text-ink-500 hover:border-ink-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ⚠️ Injury and near misses sit above BOTH modes and are never
            collapsed into a count. "1 safety item" is a number you scroll past;
            the sentence someone wrote is not. */}
        {dash.unsafe.length > 0 && (
          <section className="animate-fade-in rounded-xl border border-red-300 bg-red-50 px-5 py-4 flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">
              {dash.unsafeToday.length > 0 ? 'Today' : 'Recently'}
            </p>
            {dash.unsafe.slice(0, 2).map(l => (
              <p key={l.id} className="text-[14.5px] text-ink-900 leading-relaxed">
                {l.injury && <span className="font-semibold">Someone was hurt. </span>}
                {l.safety_note || l.what_happened}
              </p>
            ))}
            <Link to="/logs" className="text-[13px] font-semibold text-red-700 hover:text-red-800 mt-0.5">
              Open the logs →
            </Link>
          </section>
        )}

        {mode === 'today' ? (
          <section className="animate-fade-in flex flex-wrap gap-x-8 gap-y-3">
            {dash.unreadLogs.length > 0 && (
              <Link to="/logs" className="text-[15px] text-ink-900 hover:text-brand-700">
                <span className="font-semibold">{dash.unreadLogs.length}</span> log{dash.unreadLogs.length === 1 ? '' : 's'} you have not read
              </Link>
            )}
            {dash.openNotes.length > 0 && (
              <Link to="/logs" className="text-[15px] text-ink-900 hover:text-brand-700">
                <span className="font-semibold">{dash.openNotes.length}</span> thing{dash.openNotes.length === 1 ? '' : 's'} on your list
              </Link>
            )}
            {dash.liveJobs > 0 && (
              <Link to="/board" className="text-[15px] text-ink-900 hover:text-brand-700">
                <span className="font-semibold">{dash.liveJobs}</span> job{dash.liveJobs === 1 ? '' : 's'} on
              </Link>
            )}
          </section>
        ) : (
          <section className="animate-fade-in flex flex-col gap-3">
            {/* ⭐ The honest one. An owner writing his own daily logs is in the
                business whatever the questionnaire says, and this is the only
                owner-dependence measure in the product made of evidence rather
                than self-report. Stated as a fact, not a telling-off. */}
            {dash.logCount > 0 && (
              <p className="text-[15px] text-ink-900 leading-relaxed">
                {dash.ownLogs.length === 0
                  ? `The last ${dash.logCount} daily log${dash.logCount === 1 ? '' : 's'} came from the crew, not from you.`
                  : `You wrote ${dash.ownLogs.length} of the last ${dash.logCount} daily logs yourself.`}
              </p>
            )}
            {dash.reviewedPct != null && (
              <p className="text-[15px] text-ink-600 leading-relaxed">
                {dash.reviewedPct}% of what the crew wrote has been read by someone in the office.
              </p>
            )}
            {dash.margin != null && (
              <p className="text-[15px] text-ink-600 leading-relaxed">
                Across {dash.pricedCount} job{dash.pricedCount === 1 ? '' : 's'} with numbers on them, the average margin is {dash.margin}%.
              </p>
            )}
            {dash.logCount === 0 && (
              <p className="text-[15px] text-ink-500 leading-relaxed">
                Nothing to read from yet. Once the crew are writing at the end of the day,
                this is where you will see whether it runs without you.
              </p>
            )}
          </section>
        )}

        {/* ── The one thing ───────────────────────────────────────────────── */}
        <section className="animate-fade-in flex flex-col gap-5">
          <h2 className="font-serif text-[27px] leading-[1.45] text-ink-900">
            {headline}
          </h2>
          <p className="text-[15.5px] leading-[1.7] text-ink-700">{detail}</p>

          <div className="flex flex-wrap gap-3 pt-0.5">
            <Link
              to="/advisor"
              className="px-6 py-3 rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white text-[14.5px] font-semibold transition-colors"
            >
              Talk it through
            </Link>
            <Link
              to="/roadmap"
              className="px-6 py-3 rounded-[10px] border border-ink-200 hover:border-ink-300 text-ink-900 text-[14.5px] font-semibold transition-colors"
            >
              Open the roadmap
            </Link>
          </div>
        </section>

        {/* ── Everything else, quietly ────────────────────────────────────── */}
        {others.length > 0 && (
          <>
            <hr className="border-0 border-t border-ink-100" />
            <section className="flex flex-col gap-4">
              <p className="text-[14.5px] text-ink-500">
                {others.length === 1 ? 'One other thing' : `${others.length} other things`}, whenever you want {others.length === 1 ? 'it' : 'them'}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {others.map(m => (
                  <Link
                    key={m.id}
                    to="/roadmap"
                    className="px-4 py-2.5 rounded-full bg-white border border-ink-100 hover:border-ink-200 text-[13.5px] text-ink-600 transition-colors"
                  >
                    {m.title}
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── Counted, not scored ─────────────────────────────────────────── */}
        <hr className="border-0 border-t border-ink-100" />
        <section className="flex flex-col gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-300">
            So far
          </p>
          <div className="flex flex-wrap gap-x-10 gap-y-5">
            <Count n={done}              label={done === 1 ? 'step finished' : 'steps finished'} />
            <Count n={counts.checkins}   label={counts.checkins === 1 ? 'check-in logged' : 'check-ins logged'} />
            <Count n={counts.playbooks}  label={counts.playbooks === 1 ? 'job written down' : 'jobs written down'} />
            <Count n={counts.staff}      label={counts.staff === 1 ? 'person on the team' : 'people on the team'} />
            <Count n={counts.documents}  label={counts.documents === 1 ? 'thing Solomon made' : 'things Solomon made'} />
          </div>
          <p className="text-[13.5px] leading-[1.6] text-ink-300 max-w-[520px]">
            Counted, not scored. The trends live in the roadmap when you want to look at them.
          </p>
        </section>

        {/* ── A door, not a nag ───────────────────────────────────────────── */}
        <div className="mt-4 pt-6 border-t border-ink-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-ink-500">
            {daysSinceLastCheckin === null
              ? 'Solomon reads your plan and your numbers before he says anything.'
              : "Sit down with Solomon when you're ready. He'll keep."}
          </p>
          <Link to="/checkins" className="text-[14px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
            {daysSinceLastCheckin === null ? 'Log your first check-in →' : "Start this week's check-in →"}
          </Link>
        </div>

      </div>
    </div>
  )
}

function Count({ n, label }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-serif text-[27px] leading-none text-ink-900 tabular-nums">{n}</span>
      <span className="text-[13px] text-ink-300">{label}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto w-full max-w-[680px] px-6 pt-16 flex flex-col gap-11">
        <div className="flex flex-col gap-3">
          <div className="h-3 w-32 rounded bg-ink-100" />
          <div className="h-10 w-64 rounded bg-ink-100" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-7 w-full rounded bg-ink-100" />
          <div className="h-7 w-4/5 rounded bg-ink-100" />
          <div className="h-4 w-full rounded bg-ink-100" />
        </div>
      </div>
    </div>
  )
}
