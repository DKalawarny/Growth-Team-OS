import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABEL } from '../../lib/access'

/**
 * Shown while the owner is viewing the app as a teammate. Says plainly what the
 * preview is: the menus and pages that role can open. The figures on screen are
 * still the owner's own, so it says that too rather than implying otherwise.
 */
export default function PreviewBanner() {
  const { preview, endPreview } = useAuth()
  const navigate = useNavigate()
  if (!preview) return null
  return (
    <div className="bg-ink-900 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-900 bg-white px-2 py-0.5 rounded-full">
          Viewing as
        </span>
        <span className="text-sm font-semibold text-white">
          {preview.name ? `${preview.name}, ` : ''}{ROLE_LABEL[preview.role] ?? preview.role}
        </span>
        <span className="text-[11px] text-ink-300">
          These are the menus and pages they can open. Figures shown are still yours.
        </span>
      </div>
      <button
        type="button"
        onClick={() => { endPreview(); navigate('/settings/team') }}
        className="text-xs font-semibold text-ink-900 bg-white hover:bg-ink-100 px-3 py-1.5 rounded-lg"
      >
        Exit preview
      </button>
    </div>
  )
}
