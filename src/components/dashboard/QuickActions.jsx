import { useState } from 'react'
import { Link } from 'react-router-dom'

const ALL_DESTINATIONS = [
  { key: 'advisor',      to: '/advisor',      icon: '🤖', title: 'Solomon',             blurb: 'AI business advisor'     },
  { key: 'roadmap',      to: '/roadmap',      icon: '🗺️', title: 'Roadmap',             blurb: 'Milestones & pace'       },
  { key: 'calendar',     to: '/calendar',     icon: '📅', title: 'Calendar',            blurb: 'Daily work planner'      },
  { key: 'board',        to: '/board',        icon: '📋', title: 'Work Board',          blurb: 'Tasks & work orders'     },
  { key: 'checkins',     to: '/checkins',     icon: '📝', title: 'Check-in',            blurb: 'Log daily progress'      },
  { key: 'library',      to: '/documents',    icon: '📚', title: 'Library',             blurb: 'Documents & files'       },
  { key: 'cfo',          to: '/tools/cfo',    icon: '💼', title: 'CFO Dashboard',       blurb: 'Cash flow & financials'  },
  { key: 'safety',       to: '/tools/safety', icon: '🛡️', title: 'Safety',              blurb: 'WCB, licences & docs'    },
  { key: 'trajectories', to: '/trajectories', icon: '📈', title: 'Trajectories',        blurb: 'Revenue projection'      },
  { key: 'settings',     to: '/settings',     icon: '⚙️', title: 'Settings',            blurb: 'Account & team'          },
]

const DEST_MAP     = Object.fromEntries(ALL_DESTINATIONS.map(d => [d.key, d]))
const DEFAULT_KEYS = ['advisor', 'roadmap', 'board', 'calendar']
const STORAGE_KEY  = 'growthos:quickActions'
const MAX          = 4

function loadKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (Array.isArray(saved) && saved.length > 0 && saved.every(k => DEST_MAP[k])) {
      return saved.slice(0, MAX)
    }
  } catch { /* ignore */ }
  return DEFAULT_KEYS
}

export default function QuickActions() {
  const [selectedKeys, setSelectedKeys] = useState(loadKeys)
  const [editing, setEditing]           = useState(false)
  const [draft,   setDraft]             = useState(selectedKeys)

  function openEditor() { setDraft(selectedKeys); setEditing(true) }
  function cancel()     { setEditing(false) }

  function toggleDraft(key) {
    setDraft(prev => {
      if (prev.includes(key)) return prev.length <= 1 ? prev : prev.filter(k => k !== key)
      if (prev.length >= MAX) return prev
      return [...prev, key]
    })
  }

  function save() {
    setSelectedKeys(draft)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)) } catch { /* ignore */ }
    setEditing(false)
  }

  const tiles = selectedKeys.map(k => DEST_MAP[k]).filter(Boolean)

  if (editing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-ink-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-ink-900">Choose your quick links</p>
            <p className="text-xs text-ink-400 mt-0.5">Pick up to 4 — they'll appear on your dashboard.</p>
          </div>
          <button type="button" onClick={cancel}
            className="text-xs text-ink-400 hover:text-ink-700 font-medium transition-colors">
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ALL_DESTINATIONS.map(d => {
            const isSelected = draft.includes(d.key)
            const isFull     = !isSelected && draft.length >= MAX
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => !isFull && toggleDraft(d.key)}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-300'
                    : isFull
                      ? 'border-ink-100 bg-ink-50/50 opacity-40 cursor-not-allowed'
                      : 'border-ink-200 hover:border-brand-200 hover:bg-ink-50 cursor-pointer'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-brand-500 flex items-center justify-center">
                    <svg className="w-2 h-2" fill="none" viewBox="0 0 8 8" stroke="white" strokeWidth="2.5">
                      <polyline points="1,4 3,6 7,2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
                <span className="text-2xl">{d.icon}</span>
                <span className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-brand-800' : 'text-ink-700'}`}>
                  {d.title}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-[11px] text-ink-400">
            {draft.length}/{MAX} selected
            {draft.length >= MAX && <span className="text-brand-500 font-semibold"> — deselect one to swap</span>}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={draft.length === 0}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-bold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {tiles.map(a => (
        <Link
          key={a.key}
          to={a.to}
          className="group relative bg-white rounded-2xl shadow-sm border border-ink-100 p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 hover:border-brand-200 transition-all duration-150"
        >
          <span className="text-3xl flex-shrink-0">{a.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900 group-hover:text-brand-700 transition-colors leading-tight">
              {a.title}
            </p>
            <p className="text-[11px] text-ink-400 mt-0.5 leading-tight">{a.blurb}</p>
          </div>
        </Link>
      ))}

      {/* Edit button — floated as a ghost tile */}
      <button
        type="button"
        onClick={openEditor}
        className="col-span-4 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-ink-400 hover:text-ink-700 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8">
          <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Customise shortcuts
      </button>
    </div>
  )
}
