import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toolsNavItems } from '../../lib/tools'

/**
 * MobileNav — shown only on small screens (lg:hidden).
 *
 * Two parts:
 *   1. Top bar        — GrowthOS logo + hamburger button
 *   2. Bottom tab bar — 5 key destinations always visible
 *   3. Slide-in drawer — full nav, opens from the "More" tab or hamburger
 */

// ── Bottom tab items (always visible) ────────────────────────────────────────

const TABS = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    to: '/advisor',
    label: 'Solomon',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        <line x1="9" y1="10" x2="9" y2="10" strokeWidth="2.5"/>
        <line x1="12" y1="10" x2="12" y2="10" strokeWidth="2.5"/>
        <line x1="15" y1="10" x2="15" y2="10" strokeWidth="2.5"/>
      </svg>
    ),
  },
  {
    to: '/roadmap',
    label: 'Roadmap',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="3 17 9 11 13 15 21 7"/>
        <polyline points="15 7 21 7 21 13"/>
      </svg>
    ),
  },
  {
    to: '/board',
    label: 'Board',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="5" height="18" rx="1.5"/>
        <rect x="9.5" y="3" width="5" height="12" rx="1.5"/>
        <rect x="16" y="3" width="5" height="15" rx="1.5"/>
      </svg>
    ),
  },
]

// ── Full nav (mirrors desktop sidebar) ───────────────────────────────────────

const MAIN_NAV = [
  { to: '/dashboard',    label: 'Dashboard'           },
  { to: '/advisor',      label: 'Solomon'              },
  { to: '/roadmap',      label: 'Roadmap'              },
  { to: '/calendar',     label: 'Calendar'             },
  { to: '/checkins',     label: 'Check-ins'            },
  { to: '/documents',    label: 'Library'              },
  { to: '/trajectories', label: 'Growth Trajectories'  },
  { to: '/board',        label: 'Work Board'           },
  { to: '/tools/cfo',    label: 'CFO Dashboard'        },
  { to: '/tools/safety', label: 'Safety & Compliance'  },
  { to: '/analytics',    label: 'Analytics'            },
]

function advisorHasOpener(userId) {
  if (!userId) return false
  try {
    const d    = new Date()
    const date = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
    return !localStorage.getItem(`gos_morning_${userId}_${date}`)
  } catch { return false }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileNav() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()
  const [open, setOpen]         = useState(false)
  const [hasOpener, setHasOpener] = useState(false)

  useEffect(() => { setHasOpener(advisorHasOpener(profile?.id)) })

  // Close drawer on navigation
  useEffect(() => { setOpen(false) }, [location.pathname])

  const MAIN_NAV_TOOL_ROUTES = new Set(['/tools/cfo', '/tools/safety'])
  const toolsNav = [
    { to: '/tools', label: 'All tools' },
    ...toolsNavItems().filter(t => !MAIN_NAV_TOOL_ROUTES.has(t.to)),
  ]

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-ink-900 border-b border-ink-800 flex-shrink-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight">
            <span className="text-white">Growth</span>
            <span className="text-brand-400">OS</span>
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-400 hover:text-white hover:bg-white/8 transition-colors"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </header>

      {/* ── Bottom tab bar ─────────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-ink-900 border-t border-ink-800 flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map(tab => {
          const isActive = location.pathname === tab.to || (tab.to !== '/' && location.pathname.startsWith(tab.to))
          const showDot  = tab.to === '/advisor' && hasOpener && !isActive
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative"
            >
              <span className={`transition-colors ${isActive ? 'text-brand-400' : 'text-ink-500'}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-brand-300' : 'text-ink-600'}`}>
                {tab.label}
              </span>
              {showDot && (
                <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand-400" />
              )}
            </NavLink>
          )
        })}

        {/* More tab — opens full drawer */}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-ink-500"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="w-5 h-5">
            <circle cx="12" cy="5"  r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
          <span className="text-[10px] font-semibold text-ink-600">More</span>
        </button>
      </nav>

      {/* ── Slide-in drawer ────────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Panel */}
      <div className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-ink-900 flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-ink-800">
          <span className="text-base font-black tracking-tight">
            <span className="text-white">Growth</span>
            <span className="text-brand-400">OS</span>
          </span>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-400 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-hide">

          {/* Main nav */}
          <div className="space-y-0.5">
            {MAIN_NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive ? 'bg-white/8 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-ink-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex-1">{label}</span>
                    {to === '/advisor' && hasOpener && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Tools section */}
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold text-ink-600 uppercase tracking-widest">Tools</p>
            <div className="space-y-0.5">
              {toolsNav.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
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
        </div>

        {/* User + sign out */}
        <div className="px-3 py-4 border-t border-ink-800">
          {profile?.name && (
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-black text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink-200 truncate">{profile.name}</p>
                <p className="text-[10px] text-ink-600">Owner</p>
              </div>
            </div>
          )}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1 ${
                isActive ? 'bg-white/8 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-ink-200'
              }`
            }
          >
            Settings
          </NavLink>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-ink-500 hover:bg-white/5 hover:text-ink-300 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
