import { Link } from 'react-router-dom'
import { getToolById } from '../../lib/tools'

/**
 * RecentActivity — unified chronological feed of documents + check-ins,
 * sorted by created_at desc, capped at 5. Dark header strip matches app card
 * language. "View all" link lives in the header alongside the label.
 */
export default function RecentActivity({ documents, checkins }) {
  const items = mergeAndSort(documents, checkins).slice(0, 5)

  return (
    <section className="bg-white rounded-xl shadow-sm border border-ink-100 overflow-hidden">
      <div className="bg-ink-900 px-5 py-3.5 flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-widest text-brand-400">
          Recent work
        </span>
        <Link
          to="/documents"
          className="text-[10.5px] text-ink-400 hover:text-brand-400 font-medium transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="p-4">
        {items.length === 0 ? (
          <div className="py-3 text-xs text-ink-400 leading-relaxed">
            Nothing yet — run a tool from quick actions to see it here.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {items.map(item => <Row key={item.key} item={item} />)}
          </ul>
        )}
      </div>
    </section>
  )
}

// ----------------------------------------------------------------------------

function Row({ item }) {
  return (
    <li>
      <Link
        to={item.href}
        className="group flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-ink-50 transition-colors"
      >
        <span className="text-base flex-shrink-0 w-6 text-center" aria-hidden="true">
          {item.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-ink-900 truncate group-hover:text-brand-700 transition-colors">
            {item.title}
          </div>
          <div className="text-[11px] text-ink-400 truncate mt-0.5">
            {item.subtitle}
          </div>
        </div>
        <span className="text-[11px] text-ink-400 flex-shrink-0 tabular-nums">
          {formatRelative(item.created_at)}
        </span>
      </Link>
    </li>
  )
}

// ----------------------------------------------------------------------------

function mergeAndSort(documents, checkins) {
  const docItems = (documents ?? []).map(d => {
    const tool = getToolById(d.tool_id)
    return {
      key:        `doc-${d.id}`,
      icon:       tool?.icon ?? '📄',
      title:      d.title || tool?.name || 'Untitled document',
      subtitle:   tool?.name ?? d.tool_id,
      href:       d.tool_id ? `/documents?tool=${encodeURIComponent(d.tool_id)}` : '/documents',
      created_at: d.created_at,
    }
  })

  const checkinItems = (checkins ?? []).map(c => ({
    key:        `checkin-${c.id}`,
    icon:       '📝',
    title:      truncate(c.win) || truncate(c.revenue_update) || checkinTitleFallback(c),
    subtitle:   'Check-in',
    href:       '/checkins',
    created_at: c.created_at,
  }))

  return [...docItems, ...checkinItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

function checkinTitleFallback(c) {
  const d = new Date(c.created_at)
  return `Check-in · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

function truncate(s, max = 60) {
  if (!s) return null
  const str = String(s).trim()
  if (!str) return null
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

function formatRelative(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / (1000 * 60))
  if (mins < 1)  return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7)  return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`
  return `${Math.floor(days / 30)}mo`
}
