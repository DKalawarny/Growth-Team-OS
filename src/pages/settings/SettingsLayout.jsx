import { NavLink, Outlet } from 'react-router-dom'

/**
 * SettingsLayout — left-sidebar nav + content panel for the /settings tree.
 *
 * This is the pattern every adjacent SaaS uses for settings (Stripe, Linear,
 * Jobber, Housecall Pro, Notion): one top-level destination, with sub-sections
 * accessed via a left rail. URLs are sub-routes so links are shareable and
 * the browser back button works between sections.
 *
 *   /settings              → redirects to /settings/business
 *   /settings/business     → profile + credit/liquidity (the AI inputs)
 *   /settings/billing      → plan, payment, this-month usage
 *   /settings/team         → staff + advisor access
 *   /settings/integrations → QuickBooks etc.
 *   /settings/danger       → regenerate roadmap, future delete account
 *
 * The /help destination is deliberately NOT a settings tab — it's its own
 * top-level page so users can reach it from the main sidebar without
 * digging through settings.
 */

const SECTIONS = [
  { to: 'business',     label: 'Business',     description: 'Profile, goals, credit',   icon: 'business' },
  { to: 'billing',      label: 'Billing & usage', description: 'Plan, payment, usage', icon: 'billing'  },
  { to: 'team',         label: 'Team & access', description: 'Staff and advisors',     icon: 'team'     },
  { to: 'integrations', label: 'Integrations', description: 'Connected apps',           icon: 'plug'     },
  { to: 'danger',       label: 'Danger zone',  description: 'Regenerate, delete',       icon: 'danger'   },
]

export default function SettingsLayout() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">Settings</h1>
        <p className="text-sm text-ink-400 mt-1">
          Manage your workspace, billing, team, and integrations.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        {/* ── Sub-nav: sidebar on desktop, scrollable tabs on mobile ─────── */}
        <aside className="lg:w-60 lg:flex-shrink-0">
          {/* Mobile: horizontal scroll tabs */}
          <nav
            className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1"
            aria-label="Settings sections"
          >
            {SECTIONS.map(s => (
              <NavLink
                key={s.to}
                to={s.to}
                className={({ isActive }) =>
                  `flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-ink-900 text-white border-ink-900'
                      : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300'
                  }`
                }
              >
                {s.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop: vertical sub-nav */}
          <nav className="hidden lg:block sticky top-6" aria-label="Settings sections">
            <ul className="space-y-0.5">
              {SECTIONS.map(s => (
                <li key={s.to}>
                  <NavLink
                    to={s.to}
                    className={({ isActive }) =>
                      `flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-ink-900 text-white'
                          : 'text-ink-700 hover:bg-ink-50'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`mt-0.5 ${isActive ? 'text-brand-400' : 'text-ink-400'}`}>
                          <SubNavIcon name={s.icon} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold">{s.label}</span>
                          <span className={`block text-[11px] mt-0.5 ${isActive ? 'text-ink-300' : 'text-ink-400'}`}>
                            {s.description}
                          </span>
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function SubNavIcon({ name }) {
  const props = {
    viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.75,
    strokeLinecap: 'round', strokeLinejoin: 'round', stroke: 'currentColor',
    className: 'w-[18px] h-[18px]',
  }
  switch (name) {
    case 'business': return (
      <svg {...props}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
    )
    case 'billing': return (
      <svg {...props}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    )
    case 'team': return (
      <svg {...props}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-1a5 5 0 015-5h2a5 5 0 015 5v1" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M15 21v-1a4 4 0 014-4h.5" />
      </svg>
    )
    case 'plug': return (
      <svg {...props}>
        <path d="M9 2v6" />
        <path d="M15 2v6" />
        <path d="M6 8h12v3a6 6 0 11-12 0V8z" />
        <path d="M12 17v5" />
      </svg>
    )
    case 'danger': return (
      <svg {...props}>
        <path d="M12 3l10 18H2L12 3z" />
        <line x1="12" y1="10" x2="12" y2="14" />
        <line x1="12" y1="17" x2="12" y2="17.01" strokeWidth="2.5" />
      </svg>
    )
    default: return null
  }
}
