import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { classifyAll, todayYmd } from '../lib/milestoneProgress'
import { AMOUNTS_EMBED, withAmounts } from '../lib/jobAmounts'

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
 * ⚠️ 9 Oct, Daniel: "not very good, needs to have more use case." One sentence
 * and five counts gave an owner nothing to DO from here. The page still leads
 * with one thing, but underneath it now shows the work itself: the steps of
 * that milestone and who has each, the tasks in motion and who is on them, and
 * what the crew last wrote. All real rows, still no scores.
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
        supabase.from('staff_members').select('id, name').eq('company_id', cid),
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
          .select(`id, status, title, due_date, milestone_id, staff_member_id, assigned_staff_ids, updated_at, ${AMOUNTS_EMBED}`).eq('company_id', cid),
      ])
      if (cancelled) return
      setState({
        loading:      false,
        milestones:   msRes.data ?? [],
        lastCheckin:  ciRes.data?.[0] ?? null,
        counts: {
          checkins:  ciCount.count    ?? 0,
          documents: docCount.count   ?? 0,
          SOPs: playCount.count  ?? 0,
          staff:     staffCount.data?.length ?? 0,
        },
        staff:     staffCount.data    ?? [],
        logs:      logsRes.data       ?? [],
        openNotes: openNotesRes.data  ?? [],
        orders:    withAmounts(ordersRes.data),
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

    // Who is on each task: the multi-assignee array first, the older single
    // field as the fallback. Same order the roadmap reads them in.
    const staffById = new Map((state.staff ?? []).map(p => [p.id, p]))
    const peopleOn = o => {
      const ids = Array.isArray(o.assigned_staff_ids) && o.assigned_staff_ids.length
        ? o.assigned_staff_ids
        : (o.staff_member_id ? [o.staff_member_id] : [])
      return ids.map(id => staffById.get(id)?.name).filter(Boolean)
    }
    const rank = { in_progress: 0, review: 1, backlog: 2 }
    const openTasks = orders
      .filter(o => o.status && o.status !== 'done')
      .map(o => ({ ...o, people: peopleOn(o) }))
      .sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3))

    return {
      openTasks,
      staffById,
      recentLogs: logs.slice(0, 3),
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
  }, [state.logs, state.orders, state.openNotes, state.staff])

  const statusById = useMemo(
    () => classifyAll(state.milestones ?? [], todayYmd()),
    [state.milestones],
  )

  if (state.loading) return <LoadingSkeleton />

  const { milestones, lastCheckin, counts } = state
  const firstName = profile?.name?.split(' ')[0] ?? null
  const daysSinceLastCheckin = lastCheckin ? daysBetween(lastCheckin.created_at, new Date()) : null
  const done = milestones.filter(m => m.completed).length

  const { headline, detail, lead, others } = pickFocus({ milestones, statusById, daysSinceLastCheckin })

  // The lead milestone's own steps, each with whoever has a task on that exact
  // step (a task titled with the step text is how the roadmap assigns one).
  const leadSteps = (Array.isArray(lead?.actions) ? lead.actions : []).slice(0, 4).map(text => ({
    text,
    people: dash.openTasks.find(o => o.milestone_id === lead.id && o.title === text)?.people ?? [],
  }))
  const leadPeople = lead
    ? [...new Set(dash.openTasks.filter(o => o.milestone_id === lead.id).flatMap(o => o.people))]
    : []

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto w-full max-w-[920px] px-6 pt-16 pb-12 flex flex-col gap-11">

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
              Safety {dash.unsafeToday.length > 0 ? '· today' : '· recent'}
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
              <Link to="/logs#office-notes" className="text-[15px] text-ink-900 hover:text-brand-700">
                <span className="font-semibold">{dash.openNotes.length}</span> thing{dash.openNotes.length === 1 ? '' : 's'} on your list
              </Link>
            )}
            {dash.liveJobs > 0 && (
              <Link to="/board" className="text-[15px] text-ink-900 hover:text-brand-700">
                <span className="font-semibold">{dash.liveJobs}</span> task{dash.liveJobs === 1 ? '' : 's'} on the board
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

          {leadSteps.length > 0 && (
            <div className="rounded-xl bg-white border border-ink-100 px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">The steps</p>
                {leadPeople.length > 0 && (
                  <p className="text-[12.5px] text-ink-500">On this: {leadPeople.join(', ')}</p>
                )}
              </div>
              <ol className="flex flex-col gap-2.5">
                {leadSteps.map((st, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14.5px] text-ink-800">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-ink-100 text-ink-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-relaxed">{st.text}</span>
                    {st.people.length > 0 && <NameChips names={st.people} />}
                  </li>
                ))}
              </ol>
            </div>
          )}

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

        {/* ── The work itself: who is on what, and what the crew last wrote ── */}
        <section className="animate-fade-in grid md:grid-cols-2 gap-5">
          <Panel title="Tasks in motion" to="/board" linkLabel="Open tasks">
            {dash.openTasks.length === 0 ? (
              <Empty>No open tasks. Add one from the board, or from any step on the roadmap.</Empty>
            ) : (
              <ul className="flex flex-col divide-y divide-ink-100">
                {dash.openTasks.slice(0, 5).map(o => (
                  <li key={o.id} className="py-2.5 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[14px] text-ink-900 leading-snug">{o.title}</p>
                      <span className="flex-shrink-0 text-[11px] text-ink-500 whitespace-nowrap mt-0.5">{TASK_STATUS[o.status] ?? o.status}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {o.people.length > 0
                        ? <NameChips names={o.people} />
                        : <span className="text-[12px] text-ink-400">No one on this yet</span>}
                      {o.due_date && (
                        <span className="text-[12px] text-ink-500">
                          Due {new Date(o.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {dash.openTasks.length > 5 && (
              <p className="text-[12.5px] text-ink-400 pt-1">and {dash.openTasks.length - 5} more on the board</p>
            )}
          </Panel>

          <Panel title="From the crew" to="/logs" linkLabel="Open daily logs">
            {dash.recentLogs.length === 0 ? (
              <Empty>No daily logs yet. Once the crew write at the end of the day, the latest shows here.</Empty>
            ) : (
              <ul className="flex flex-col divide-y divide-ink-100">
                {dash.recentLogs.map(l => (
                  <li key={l.id} className="py-2.5 flex flex-col gap-1">
                    <p className="text-[12px] text-ink-500">
                      {new Date(`${l.log_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {l.staff_member_id ? (dash.staffById.get(l.staff_member_id)?.name ?? 'Crew') : 'You'}
                      {!l.reviewed_at && <span className="ml-2 text-brand-700 font-semibold">Not read yet</span>}
                    </p>
                    <p className="text-[14px] text-ink-900 leading-snug">{l.what_happened}</p>
                    {l.blockers && (
                      <p className="text-[13px] text-amber-800 leading-snug">
                        <span className="font-semibold">Held them up:</span> {l.blockers}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>

        {/* ── Straight to the thing you came to do ────────────────────────── */}
        <section className="animate-fade-in flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-300">Jump to</p>
          <div className="flex flex-wrap gap-2.5">
            {[
              ['/advisor',   'Ask Solomon'],
              ['/board',     'Assign a task'],
              ['/playbooks', 'Write an SOP'],
              ['/logs',      'Read the logs'],
              ['/tools/cfo', 'Check the money'],
              ['/documents', 'Add a document'],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className="px-4 py-2.5 rounded-full bg-white border border-ink-100 hover:border-brand-300 hover:text-brand-700 text-[13.5px] font-semibold text-ink-700 transition-colors"
              >
                {label}
              </Link>
            ))}
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
            <Count n={counts.SOPs}  label={counts.SOPs === 1 ? 'SOP written down' : 'SOPs written down'} />
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
          <Link to="/checkins" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[14px] font-semibold hover:bg-brand-700 transition-colors">
            {daysSinceLastCheckin === null ? 'Log your first check-in →' : "Start this week's check-in →"}
          </Link>
        </div>

      </div>
    </div>
  )
}

const TASK_STATUS = { backlog: 'Not started', in_progress: 'In progress', review: 'In review' }

function Panel({ title, to, linkLabel, children }) {
  return (
    <div className="rounded-xl bg-white border border-ink-100 px-5 py-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">{title}</p>
        <Link to={to} className="text-[12.5px] font-semibold text-brand-700 hover:text-brand-800">{linkLabel} →</Link>
      </div>
      {children}
    </div>
  )
}

function Empty({ children }) {
  return <p className="text-[13.5px] text-ink-500 leading-relaxed py-2">{children}</p>
}

// First names as small pills, the same look the roadmap uses for team staff.
function NameChips({ names }) {
  return (
    <span className="flex flex-wrap gap-1 flex-shrink-0">
      {names.map(n => (
        <span key={n} title={n} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap">
          {n.split(' ')[0]}
        </span>
      ))}
    </span>
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
      <div className="mx-auto w-full max-w-[920px] px-6 pt-16 flex flex-col gap-11">
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
