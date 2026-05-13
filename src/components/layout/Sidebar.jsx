import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toolsNavItems } from '../../lib/tools'
import DailyQuote from './DailyQuote'

// ── Morning opener indicator ──────────────────────────────────────────────────
// Returns true if the advisor's morning opener hasn't been triggered today,
// so we can show a subtle pulse dot on the Advisor link to draw owners in.

function advisorHasOpener(userId) {
  if (!userId) return false
  try {
    const d = new Date()
    const date = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
    return !localStorage.getItem(`gos_morning_${userId}_${date}`)
  } catch { return false }
}

// ── SVG icon set ──────────────────────────────────────────────────────────────

function Icon({ name, className = 'w-[18px] h-[18px]' }) {
  const base = `${className} flex-shrink-0`
  const props = { viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', stroke: 'currentColor' }

  switch (name) {
    case 'dashboard': return (
      <svg className={base} {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    )
    case 'roadmap': return (
      <svg className={base} {...props}>
        <polyline points="3 17 9 11 13 15 21 7"/>
        <polyline points="15 7 21 7 21 13"/>
      </svg>
    )
    case 'calendar': return (
      <svg className={base} {...props}>
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )
    case 'advisor': return (
      <svg className={base} {...props}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        <line x1="9" y1="10" x2="9" y2="10" strokeWidth="2.5"/>
        <line x1="12" y1="10" x2="12" y2="10" strokeWidth="2.5"/>
        <line x1="15" y1="10" x2="15" y2="10" strokeWidth="2.5"/>
      </svg>
    )
    case 'checkins': return (
      <svg className={base} {...props}>
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    )
    case 'library': return (
      <svg className={base} {...props}>
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
      </svg>
    )
    case 'settings': return (
      <svg className={base} {...props}>
        <line x1="4" y1="6" x2="20" y2="6"/>
        <line x1="4" y1="12" x2="20" y2="12"/>
        <line x1="4" y1="18" x2="20" y2="18"/>
        <circle cx="8"  cy="6"  r="2" fill="currentColor" stroke="none"/>
        <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
        <circle cx="8"  cy="18" r="2" fill="currentColor" stroke="none"/>
      </svg>
    )
    case 'help': return (
      <svg className={base} {...props}>
        <circle cx="12" cy="12" r="9"/>
        <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 2-2.5 3.5"/>
        <line x1="12" y1="17" x2="12" y2="17.01" strokeWidth="2.5"/>
      </svg>
    )
    case 'trajectories': return (
      <svg className={base} {...props}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    )
    case 'board': return (
      <svg className={base} {...props}>
        <rect x="3" y="3" width="5" height="18" rx="1.5"/>
        <rect x="9.5" y="3" width="5" height="12" rx="1.5"/>
        <rect x="16" y="3" width="5" height="15" rx="1.5"/>
      </svg>
    )
    case 'playbooks': return (
      <svg className={base} {...props}>
        {/* Clipboard with checklist lines — reads as "process / SOP" at small size */}
        <rect x="5" y="4" width="14" height="17" rx="2"/>
        <rect x="9" y="2.5" width="6" height="3.5" rx="1"/>
        <line x1="8.5" y1="11" x2="15.5" y2="11"/>
        <line x1="8.5" y1="14.5" x2="15.5" y2="14.5"/>
        <line x1="8.5" y1="18" x2="13" y2="18"/>
      </svg>
    )
    case 'analytics': return (
      <svg className={base} {...props}>
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    )
    case 'cfo': return (
      <svg className={base} {...props}>
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    )
    case 'safety': return (
      <svg className={base} {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    )
    case 'tools': return (
      <svg className={base} {...props}>
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    )
    default: return null
  }
}

// ── Nav config ────────────────────────────────────────────────────────────────

const mainNav = [
  { to: '/dashboard',    label: 'Dashboard',           icon: 'dashboard'    },
  { to: '/advisor',      label: 'Solomon',             sublabel: 'Your Advisor', icon: 'advisor'      },
  { to: '/roadmap',      label: 'Roadmap',             icon: 'roadmap'      },
  { to: '/calendar',     label: 'Calendar',            icon: 'calendar'     },
  { to: '/documents',    label: 'Library',             icon: 'library'      },
  { to: '/tools/cfo',    label: 'CFO Dashboard',       icon: 'cfo'          },
  { to: '/tools/safety', label: 'Safety & Compliance', icon: 'safety'       },
  { to: '/trajectories', label: 'Growth Trajectories',  icon: 'trajectories' },
  { to: '/board',        label: 'Work Board',          icon: 'board'        },
  { to: '/playbooks',    label: 'Playbooks',           sublabel: 'Reusable checklists', icon: 'playbooks'    },
  { to: '/analytics',   label: 'Analytics',           icon: 'analytics'    },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [hasOpener, setHasOpener] = useState(false)

  // Check if advisor morning opener is waiting — re-check every time this
  // renders (e.g. after navigating away from the Advisor page).
  useEffect(() => {
    setHasOpener(advisorHasOpener(profile?.id))
  })

  // CFO and Safety live in the main nav — exclude them from the tools section
  const MAIN_NAV_TOOL_ROUTES = new Set(['/tools/cfo', '/tools/safety'])
  const toolsNav = [
    { to: '/tools', label: 'All tools', end: true },
    ...toolsNavItems().filter(t => !MAIN_NAV_TOOL_ROUTES.has(t.to)),
  ]

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside className="hidden lg:flex w-60 shrink-0 bg-ink-900 flex-col h-screen sticky top-0 border-r border-ink-800">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-ink-800">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-lg font-black tracking-tight">
            <span className="text-white">Growth</span>
            <span className="text-brand-400">OS</span>
          </span>
        </div>
        <p className="text-[10px] font-semibold text-ink-600 uppercase tracking-widest">
          Business Command Center
        </p>
      </div>

      {/* Daily quote — sits just above the nav links */}
      <DailyQuote />

      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-3 py-4 space-y-6">

        {/* Main nav */}
        <div className="space-y-0.5">
          {mainNav.map(({ to, label, sublabel, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/8 text-white'
                    : 'text-ink-400 hover:bg-white/5 hover:text-ink-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-brand-400' : 'text-ink-500'}>
                    <Icon name={icon} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{label}</span>
                    {sublabel && <span className="block text-[10px] text-ink-600 leading-tight mt-0.5">{sublabel}</span>}
                  </span>

                  {/* Advisor morning opener indicator — amber pulse dot */}
                  {icon === 'advisor' && hasOpener && !isActive && (
                    <span className="relative flex-shrink-0" title="Morning brief ready">
                      <span className="w-2 h-2 rounded-full bg-amber-400 block animate-pulse" />
                    </span>
                  )}

                  {/* Active dot */}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Tools section */}
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold text-ink-600 uppercase tracking-widest flex items-center gap-2">
            <Icon name="tools" className="w-3 h-3" />
            Tools
          </p>
          <div className="space-y-0.5">
            {toolsNav.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `block px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    isActive ? 'text-brand-400 bg-white/5' : 'text-ink-500 hover:text-ink-200 hover:bg-white/5'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Help + Settings — pinned above user section */}
      <div className="px-3 pb-1 space-y-0.5">
        <NavLink
          to="/help"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-white/8 text-white'
                : 'text-ink-400 hover:bg-white/5 hover:text-ink-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={isActive ? 'text-brand-400' : 'text-ink-500'}>
                <Icon name="help" />
              </span>
              <span className="flex-1">Help</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-white/8 text-white'
                : 'text-ink-400 hover:bg-white/5 hover:text-ink-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={isActive ? 'text-brand-400' : 'text-ink-500'}>
                <Icon name="settings" />
              </span>
              <span className="flex-1">Settings</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />}
            </>
          )}
        </NavLink>
      </div>

      {/* User section + sign out */}
      <div className="px-3 py-4 border-t border-ink-800">
        {profile?.name && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-black text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink-200 truncate">{profile.name}</p>
              {profile.company_id && (
                <p className="text-[10px] text-ink-600 truncate">Owner</p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-ink-500 hover:bg-white/5 hover:text-ink-300 transition-all duration-150"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
