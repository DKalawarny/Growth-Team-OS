import { useState } from 'react'
import GeneratedTab from '../components/library/GeneratedTab'
import UploadedTab  from '../components/library/UploadedTab'

/**
 * Library — split-screen layout.
 *
 * Left panel  (40%) → Generated: all tool outputs (scorecards, plans, offers)
 * Right panel (60%) → Uploaded:  owner knowledge files + library intelligence
 *
 * Both panels are independently scrollable and always visible — no tabs,
 * no switching, no losing context.
 *
 * Count badges in column headers are fed via callbacks from the child tabs.
 */
export default function Documents() {
  const [genCount, setGenCount] = useState(null)
  const [upCount,  setUpCount]  = useState(null)

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── Slim dark header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-ink-100 flex-shrink-0">
        <div className="px-8 py-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink-900 leading-tight">Library</h1>
            <p className="text-xs text-ink-500 mt-0.5">
              Left: everything made in the app. Right: the files you added.
            </p>
          </div>
        </div>
      </div>

      {/* ── Split panels ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — Generated (40%) */}
        <div className="flex flex-col w-1/2 border-r border-ink-100 overflow-hidden">
          {/* Column header */}
          <div className="bg-white border-b border-ink-100 px-6 py-3 flex-shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Made in the app</span>
            {genCount !== null && (
              <span className="text-[10px] font-semibold bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-full">
                {genCount}
              </span>
            )}
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5">
            <GeneratedTab onCountChange={setGenCount} />
          </div>
        </div>

        {/* Right — Uploaded (60%) */}
        <div className="flex flex-col w-1/2 overflow-hidden">
          {/* Column header */}
          <div className="bg-white border-b border-ink-100 px-6 py-3 flex-shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Your files</span>
            {upCount !== null && (
              <span className="text-[10px] font-semibold bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-full">
                {upCount}
              </span>
            )}
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5">
            <UploadedTab onCountChange={setUpCount} />
          </div>
        </div>

      </div>
    </div>
  )
}
