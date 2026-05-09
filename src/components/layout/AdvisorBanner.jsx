import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * AdvisorBanner — persistent strip shown whenever an advisor is viewing a
 * client workspace. Sits above all page content inside AppLayout.
 *
 * Shows:
 *   - Company name they're currently viewing
 *   - "Read-only" badge so they don't accidentally try to edit
 *   - "Exit" button → exitClient() + navigate back to /advisor portal
 *
 * Hidden completely for regular owners (activeClientId === null).
 */
export default function AdvisorBanner() {
  const { activeClientId, exitClient, company } = useAuth()
  const navigate = useNavigate()

  if (!activeClientId) return null

  function handleExit() {
    exitClient()
    navigate('/advisor')
  }

  return (
    <div className="bg-brand-600 px-5 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-100 bg-brand-700/50 px-2 py-0.5 rounded-full">
          Advisor view
        </span>
        <span className="text-sm font-semibold text-white">
          {company?.name ?? 'Client workspace'}
        </span>
        <span className="text-[11px] text-brand-200">
          · read-only
        </span>
      </div>
      <button
        type="button"
        onClick={handleExit}
        className="text-xs font-semibold text-brand-100 hover:text-white bg-brand-700/40 hover:bg-brand-700/60 px-3 py-1.5 rounded-lg transition-colors"
      >
        ← Exit to your clients
      </button>
    </div>
  )
}
