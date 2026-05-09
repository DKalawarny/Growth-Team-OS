import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

/**
 * Work Board — /board
 *
 * 4-column kanban: Backlog → In Progress → Review → Done
 * Cards are draggable between columns. Each card can be assigned to either:
 *   - An app user (profiles table)
 *   - An external staff member (staff_members table — name + email only)
 *
 * When a staff member with an email is assigned, an "📧 Email task" button
 * appears on the card — clicking it opens the user's mail client with the
 * task pre-filled.
 *
 * Setup: requires work_orders + staff_members tables. If missing, the page
 * shows a one-time setup screen with the SQL to run.
 */

// ── Column + priority config ──────────────────────────────────────────────────

const COLUMNS = [
  { key: 'backlog',     label: 'Backlog',     headerCls: 'bg-ink-100   text-ink-700',   dotCls: 'bg-ink-400'   },
  { key: 'in_progress', label: 'In Progress', headerCls: 'bg-brand-100 text-brand-800', dotCls: 'bg-brand-500' },
  { key: 'review',      label: 'Review',      headerCls: 'bg-amber-100 text-amber-800', dotCls: 'bg-amber-500' },
  { key: 'done',        label: 'Done',        headerCls: 'bg-green-100 text-green-800', dotCls: 'bg-green-500' },
]
const COLUMN_KEYS = COLUMNS.map(c => c.key)

const PRIORITIES = [
  { key: 'low',    label: 'Low',    strip: 'bg-ink-200',    badge: 'bg-ink-50    text-ink-500    border-ink-200'    },
  { key: 'medium', label: 'Medium', strip: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  border-amber-200'  },
  { key: 'high',   label: 'High',   strip: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'urgent', label: 'Urgent', strip: 'bg-red-500',    badge: 'bg-red-50    text-red-700    border-red-200'    },
]
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.key, p]))

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(str) {
  if (!str) return '?'
  return str.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ member, size = 'md' }) {
  const sz = size === 'sm' ? 'w-6 h-6 text-[9px]' : size === 'lg' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-[10px]'
  if (member?.avatar_url) {
    return <img src={member.avatar_url} alt={member?.name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  }
  const bg = member?._type === 'staff' ? 'bg-teal-600' : 'bg-brand-600'
  return (
    <div className={`${sz} rounded-full ${bg} flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initials(member?.name || member?.email)}
    </div>
  )
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isOverdue(d) {
  if (!d) return false
  return new Date(d + 'T23:59:59') < new Date()
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Board() {
  const { profile }  = useAuth()
  const companyId    = profile?.company_id
  const [searchParams, setSearchParams] = useSearchParams()

  const [appUsers,         setAppUsers]         = useState([])   // profiles with GrowthOS accounts
  const [staff,            setStaff]            = useState([])   // external staff_members
  const [workOrders,       setWorkOrders]        = useState([])
  const [milestones,       setMilestones]        = useState([])
  const [loading,          setLoading]           = useState(true)
  const [setupNeeded,      setSetupNeeded]       = useState(false)
  const [staffSetupNeeded, setStaffSetupNeeded]  = useState(false)
  const [filterCid,        setFilterCid]         = useState(null)
  const [showModal,        setShowModal]         = useState(false)
  const [editingOrder,     setEditingOrder]      = useState(null)
  const [dragId,           setDragId]            = useState(null)
  // Unified member list — each tagged with _type and _cid (prefixed ID string)
  const allMembers = [
    ...appUsers.map(p => ({ ...p, _type: 'profile', _cid: `p:${p.id}` })),
    ...staff.map(s =>    ({ ...s, _type: 'staff',   _cid: `s:${s.id}` })),
  ]
  const memberByCid = Object.fromEntries(allMembers.map(m => [m._cid, m]))

  // Which combined ID a work order is assigned to
  function getAssigneeCid(order) {
    if (order.staff_member_id) return `s:${order.staff_member_id}`
    if (order.assigned_to)     return `p:${order.assigned_to}`
    return null
  }

  useEffect(() => {
    if (!companyId) return
    loadAll()
  }, [companyId])

  // When the page is opened from a Roadmap "Work order" link, auto-open the
  // new-order modal pre-filled with the milestone and optional action step.
  // Wait until loading is done so milestones are in the dropdown.
  useEffect(() => {
    if (loading) return
    const msId    = searchParams.get('ms_id')
    const msTitle = searchParams.get('ms_title')
    const task    = searchParams.get('task')
    if (!msId && !msTitle && !task) return

    setEditingOrder({
      status:       'backlog',
      title:        task        ? task    : '',
      milestone_id: msId        ? msId    : '',
      // Store the milestone title as a hint even if it isn't the task title
      _ms_hint:     msTitle     ?? '',
    })
    setShowModal(true)
    // Clean the URL so a refresh doesn't re-open the modal
    setSearchParams({}, { replace: true })
  }, [loading])

  async function loadAll() {
    setLoading(true)
    const [usersRes, staffRes, ordersRes, msRes] = await Promise.all([
      supabase.from('profiles').select('id, name, email, avatar_url').eq('company_id', companyId),
      supabase.from('staff_members').select('*').eq('company_id', companyId).order('name'),
      supabase.from('work_orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('milestones').select('id, title, source').eq('company_id', companyId).eq('completed', false).order('sort_order', { ascending: true }),
    ])
    // Detect missing table via both the Postgres "undefined_table" code (42P01)
    // and the PostgREST schema-cache miss code (PGRST200 / "schema cache" message).
    const tableMissing = (err) =>
      err?.code === '42P01' ||
      err?.code === 'PGRST200' ||
      err?.message?.toLowerCase().includes('schema cache')

    if (tableMissing(ordersRes.error)) { setSetupNeeded(true); setLoading(false); return }
    if (tableMissing(staffRes.error))  setStaffSetupNeeded(true)
    setAppUsers(usersRes.data  ?? [])
    setStaff(staffRes.data    ?? [])
    setWorkOrders(ordersRes.data ?? [])
    setMilestones(msRes.data   ?? [])
    setLoading(false)
  }

  async function handleSave(data) {
    // Decode the prefixed combined ID back to the right FK
    let assigned_to    = null
    let staff_member_id = null
    if (data.assignee_cid?.startsWith('p:')) assigned_to    = data.assignee_cid.slice(2)
    if (data.assignee_cid?.startsWith('s:')) staff_member_id = data.assignee_cid.slice(2)

    // Only include staff_member_id when the user picked a staff member
    // AND the column is confirmed to exist — avoids a silent Postgres error
    // when work_orders was created with the old setup SQL.
    const payload = {
      title:        data.title,
      description:  data.description || null,
      assigned_to,
      due_date:     data.due_date || null,
      priority:     data.priority,
      milestone_id: data.milestone_id || null,
      status:       data.status,
      ...(staff_member_id && !staffSetupNeeded ? { staff_member_id } : {}),
    }

    if (data.id) {
      const { error } = await supabase.from('work_orders').update(payload).eq('id', data.id)
      if (!error) {
        setWorkOrders(prev => prev.map(o =>
          o.id === data.id ? { ...o, ...payload } : o
        ))
      }
      setShowModal(false); setEditingOrder(null)
      return error?.message ?? null
    } else {
      const { data: row, error } = await supabase.from('work_orders').insert({
        company_id: companyId,
        created_by: profile.id,
        ...payload,
        priority: payload.priority || 'medium',
        status:   payload.status   || 'backlog',
      }).select().single()
      if (!error && row) {
        setWorkOrders(prev => [row, ...prev])
        setShowModal(false); setEditingOrder(null)
      }
      return error?.message ?? null
    }
  }

  async function handleMove(orderId, newStatus) {
    setWorkOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    await supabase.from('work_orders').update({ status: newStatus }).eq('id', orderId)
  }

  async function handleDelete(orderId) {
    setWorkOrders(prev => prev.filter(o => o.id !== orderId))
    await supabase.from('work_orders').delete().eq('id', orderId)
  }

  function handleEmailTask(order) {
    const cid    = getAssigneeCid(order)
    const member = cid ? memberByCid[cid] : null
    if (!member?.email) return
    const name = member.name || member.email
    const subject = encodeURIComponent(`Task assigned: ${order.title}`)
    const lines = [
      `Hi ${name},`,
      '',
      `You've been assigned a task on the Work Board:`,
      '',
      `📋 ${order.title}`,
    ]
    if (order.description) lines.push('', order.description)
    lines.push('', `Priority: ${PRIORITY_MAP[order.priority]?.label ?? order.priority}`)
    if (order.due_date) lines.push(`Due: ${fmtDate(order.due_date)}`)
    lines.push('', 'Log in to GrowthOS to view the full board and update progress.')
    window.location.href = `mailto:${member.email}?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`
  }

  function openNew(status = 'backlog')  { setEditingOrder({ status }); setShowModal(true) }
  function openEdit(order)              { setEditingOrder({ ...order, assignee_cid: getAssigneeCid(order) }); setShowModal(true) }
  function onDrop(status)               { if (dragId) { handleMove(dragId, status); setDragId(null) } }

  const filtered     = filterCid
    ? workOrders.filter(o => getAssigneeCid(o) === filterCid)
    : workOrders
  const milestoneMap = Object.fromEntries(milestones.map(m => [m.id, m]))

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <div className="bg-ink-900 h-20 animate-pulse" />
        <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-96 bg-white rounded-xl animate-pulse shadow-sm" />)}
        </div>
      </div>
    )
  }

  // ── Setup screen ─────────────────────────────────────────────────────────

  if (setupNeeded) {
    return (
      <div className="min-h-screen bg-ink-50">
        <div className="bg-ink-900 border-b border-ink-800 px-8 py-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400 mb-0.5">Work Board</div>
          <h1 className="text-xl font-bold text-white">Work Board</h1>
        </div>
        <div className="max-w-2xl mx-auto px-8 py-12">
          <div className="bg-white border border-ink-100 rounded-xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">🛠️</div>
            <h2 className="text-lg font-bold text-ink-900 mb-2">One-time setup required</h2>
            <p className="text-sm text-ink-500 mb-6 leading-relaxed">
              Run this SQL in your Supabase dashboard → SQL Editor, then click the button below.
            </p>
            <pre className="text-left text-[11px] bg-ink-900 text-green-400 rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap">
{`-- Work orders table
create table public.work_orders (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id)
    on delete cascade not null,
  created_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  staff_member_id uuid,
  title text not null,
  description text,
  status text not null default 'backlog',
  priority text not null default 'medium',
  due_date date,
  milestone_id uuid references public.milestones(id)
    on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.work_orders enable row level security;
create policy "Company members can manage work orders"
on public.work_orders for all
using (company_id = (
  select company_id from public.profiles
  where id = auth.uid()
));

-- Staff members table (external team, email only)
create table public.staff_members (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id)
    on delete cascade not null,
  name text not null,
  email text,
  role text,
  created_at timestamptz default now()
);
alter table public.staff_members enable row level security;
create policy "Company members can manage staff"
on public.staff_members for all
using (company_id = (
  select company_id from public.profiles
  where id = auth.uid()
));

-- Link work orders → staff members
alter table public.work_orders
  add constraint work_orders_staff_member_fk
  foreign key (staff_member_id)
  references public.staff_members(id)
  on delete set null;`}
            </pre>
            <button type="button" onClick={loadAll}
              className="mt-6 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors">
              I've run it — load the board
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Board ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-ink-50">

      {/* Dark header */}
      <div className="bg-ink-900 border-b border-ink-800">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400 mb-0.5">Work Board</div>
            <h1 className="text-xl font-bold text-white leading-tight">Work Board</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ink-800 hover:bg-ink-700 text-ink-200 hover:text-white text-sm font-semibold transition-colors border border-ink-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7" cy="7" r="3"/><path d="M1 18c0-3.3 2.7-6 6-6h.5"/>
                <circle cx="14" cy="12" r="3"/><path d="M11 18c0-1.7 1.3-3 3-3s3 1.3 3 3"/>
              </svg>
              Manage team
            </Link>
            <button type="button" onClick={() => openNew()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
              New work order
            </button>
          </div>
        </div>
      </div>

      {/* Member filter strip */}
      <div className="max-w-7xl mx-auto px-8 pt-4 pb-2 flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setFilterCid(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            filterCid === null
              ? 'bg-ink-900 text-white border-ink-900'
              : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
          }`}>
          All
        </button>
        {allMembers.map(m => (
          <button key={m._cid} type="button"
            onClick={() => setFilterCid(filterCid === m._cid ? null : m._cid)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              filterCid === m._cid
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
            }`}>
            <Avatar member={m} size="sm" />
            {m.name || m.email}
            {m._type === 'staff' && (
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">staff</span>
            )}
          </button>
        ))}
        <span className="text-[11px] text-ink-400 ml-1">
          {filtered.length} work order{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Kanban grid */}
      <div className="max-w-7xl mx-auto px-8 pb-10 overflow-x-auto">
        <div className="grid grid-cols-4 gap-4 min-w-[780px] pt-2">
          {COLUMNS.map(col => {
            const cards = filtered.filter(o => o.status === col.key)
            return (
              <div key={col.key} className="flex flex-col"
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(col.key)}>

                {/* Column header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 ${col.headerCls}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dotCls}`} />
                  <span className="text-xs font-bold flex-1">{col.label}</span>
                  <span className="text-xs font-bold opacity-50">{cards.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-3 flex-1 min-h-[100px]">
                  {cards.map(order => {
                    const cid    = getAssigneeCid(order)
                    const member = cid ? memberByCid[cid] ?? null : null
                    return (
                      <WorkOrderCard
                        key={order.id}
                        order={order}
                        member={member}
                        milestone={milestoneMap[order.milestone_id]}
                        onEdit={() => openEdit(order)}
                        onMove={s => handleMove(order.id, s)}
                        onDelete={() => handleDelete(order.id)}
                        onDragStart={() => setDragId(order.id)}
                        onEmail={() => handleEmailTask(order)}
                      />
                    )
                  })}
                  {cards.length === 0 && (
                    <div className="border-2 border-dashed border-ink-150 rounded-xl h-24 flex items-center justify-center">
                      <span className="text-xs text-ink-300">Drop cards here</span>
                    </div>
                  )}
                </div>

                {/* Add shortcut */}
                <button type="button" onClick={() => openNew(col.key)}
                  className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-ink-400 hover:text-ink-700 hover:bg-white hover:shadow-sm transition-all w-full border border-transparent hover:border-ink-100">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2">
                    <path d="M7 2v10M2 7h10" strokeLinecap="round" />
                  </svg>
                  Add to {col.label.toLowerCase()}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Work order modal */}
      {showModal && (
        <WorkOrderModal
          order={editingOrder}
          appUsers={appUsers}
          staff={staff}
          milestones={milestones}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingOrder(null) }}
        />
      )}

    </div>
  )
}

// ── Work order card ───────────────────────────────────────────────────────────

function WorkOrderCard({ order, member, milestone, onEdit, onMove, onDelete, onDragStart, onEmail }) {
  const priority = PRIORITY_MAP[order.priority] ?? PRIORITY_MAP.medium
  const colIdx   = COLUMN_KEYS.indexOf(order.status)
  const overdue  = isOverdue(order.due_date)
  const hasEmail = !!member?.email

  return (
    <div draggable onDragStart={onDragStart}
      className="bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden cursor-grab active:cursor-grabbing group hover:shadow-md transition-shadow">

      {/* Priority colour strip */}
      <div className={`h-1 w-full ${priority.strip}`} />

      <div className="p-3.5">

        {/* Title + action buttons */}
        <div className="flex items-start gap-2 mb-2">
          <h3 className="text-sm font-semibold text-ink-900 leading-snug flex-1">{order.title}</h3>
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-700 transition-colors" title="Edit">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8">
                <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 text-ink-400 hover:text-red-500 transition-colors" title="Delete">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 3h8M5 3V2h2v1M4 3v7h4V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Description */}
        {order.description && (
          <p className="text-[11px] text-ink-400 mb-2.5 leading-relaxed line-clamp-2">{order.description}</p>
        )}

        {/* Milestone badge */}
        {milestone && (
          <div className="mb-2.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full max-w-full truncate">
              🗺️ {milestone.title}
            </span>
          </div>
        )}

        {/* Priority badge */}
        <div className="mb-2.5">
          <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${priority.badge}`}>
            {priority.label}
          </span>
        </div>

        {/* Footer: assignee + email button + due date */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {member ? (
              <>
                <Avatar member={member} size="sm" />
                <span className="text-[11px] font-medium text-ink-600 truncate">
                  {member.name || member.email}
                </span>
                {hasEmail && (
                  <button type="button" onClick={onEmail}
                    title={`Email task to ${member.email}`}
                    className="ml-0.5 p-1 rounded hover:bg-teal-50 text-teal-600 hover:text-teal-700 transition-colors flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="12" height="9" rx="1.5"/>
                      <path d="M1 4.5l6 4 6-4"/>
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <span className="text-[11px] text-ink-300 italic">Unassigned</span>
            )}
          </div>
          {order.due_date && (
            <span className={`text-[10px] font-semibold flex-shrink-0 ${overdue ? 'text-red-500' : 'text-ink-400'}`}>
              {overdue ? '⚠ ' : ''}{fmtDate(order.due_date)}
            </span>
          )}
        </div>

        {/* Move buttons */}
        <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-ink-50">
          <button type="button"
            onClick={() => colIdx > 0 && onMove(COLUMN_KEYS[colIdx - 1])}
            disabled={colIdx === 0}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-semibold text-ink-400 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
            ← {colIdx > 0 ? COLUMNS[colIdx - 1].label : ''}
          </button>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${COLUMNS[colIdx]?.headerCls ?? ''}`}>
            {COLUMNS[colIdx]?.label}
          </span>
          <button type="button"
            onClick={() => colIdx < COLUMN_KEYS.length - 1 && onMove(COLUMN_KEYS[colIdx + 1])}
            disabled={colIdx === COLUMN_KEYS.length - 1}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-semibold text-ink-400 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
            {colIdx < COLUMN_KEYS.length - 1 ? COLUMNS[colIdx + 1].label : ''} →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Work order modal ──────────────────────────────────────────────────────────

function WorkOrderModal({ order, appUsers, staff, milestones, onSave, onClose }) {
  const fromRoadmap = !!(order?._ms_hint || order?.milestone_id) && !order?.id
  const [form, setForm] = useState({
    id:           order?.id           ?? null,
    title:        order?.title        ?? '',
    description:  order?.description  ?? '',
    assignee_cid: order?.assignee_cid ?? '',
    due_date:     order?.due_date     ?? '',
    priority:     order?.priority     ?? 'medium',
    milestone_id: order?.milestone_id ?? '',
    status:       order?.status       ?? 'backlog',
  })
  const [saving,   setSaving]   = useState(false)
  const [saveErr,  setSaveErr]  = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setSaveErr(null)
    const errMsg = await onSave(form)
    setSaving(false)
    if (errMsg) setSaveErr(errMsg)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        <div className="bg-ink-900 px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-bold text-white">
            {form.id ? 'Edit work order' : 'New work order'}
          </span>
          <button type="button" onClick={onClose} className="text-ink-500 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Roadmap context banner */}
          {fromRoadmap && (
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2.5">
              <span className="text-sm">🗺️</span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-brand-700">From roadmap</p>
                {order?._ms_hint && (
                  <p className="text-[11px] text-brand-600 truncate">{order._ms_hint}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">Task *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder={order?._ms_hint ? `Task for "${order._ms_hint}"…` : 'What needs to get done?'}
              required autoFocus
              className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5">Details</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Add context, steps, or notes…" rows={3}
              className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
          </div>

          {/* Assign to — shows both app users and staff */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Assign to</label>
              <select value={form.assignee_cid} onChange={e => set('assignee_cid', e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="">Unassigned</option>
                {appUsers.length > 0 && (
                  <optgroup label="App users">
                    {appUsers.map(m => (
                      <option key={`p:${m.id}`} value={`p:${m.id}`}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </optgroup>
                )}
                {staff.length > 0 && (
                  <optgroup label="Team staff">
                    {staff.map(s => (
                      <option key={`s:${s.id}`} value={`s:${s.id}`}>
                        {s.name}{s.email ? ` — ${s.email}` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Column</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300">
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300">
                {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">Due date</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          </div>

          {milestones.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5">
                Link to milestone <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <select value={form.milestone_id} onChange={e => set('milestone_id', e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="">No milestone</option>
                {milestones.filter(m => m.source !== 'trajectory').length > 0 && (
                  <optgroup label="Roadmap">
                    {milestones.filter(m => m.source !== 'trajectory').map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </optgroup>
                )}
                {milestones.filter(m => m.source === 'trajectory').length > 0 && (
                  <optgroup label="Side Quests">
                    {milestones.filter(m => m.source === 'trajectory').map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {saveErr && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              ⚠ {saveErr}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!form.title.trim() || saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-bold transition-colors">
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create work order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

