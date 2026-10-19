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
 *
 * ⚠️ 18 Oct: on a phone the two halves were each ~195px wide, so a row read
 * "Ca… / Cash / Flow / Oct / 18". Below md it is two tabs over one column;
 * both panels stay mounted so the counts still arrive. "Made in the app"
 * opens first, which is where Solomon's artifact chips land.
 */
export default function Documents() {
  const [genCount, setGenCount] = useState(null)
  const [upCount,  setUpCount]  = useState(null)
  const [side, setSide] = useState('made')   // phone only
  const tab = (key, label, count) => (
    <button
      type="button"
      onClick={() => setSide(key)}
      className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${side === key ? 'border-brand-600 text-ink-900' : 'border-transparent text-ink-500'}`}
    >
      {label}{count !== null && <span className="ml-1.5 text-xs text-ink-500">{count}</span>}
    </button>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── Slim dark header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-ink-100 flex-shrink-0">
        <div className="px-5 md:px-8 py-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink-900 leading-tight">Library</h1>
            <p className="hidden md:block text-xs text-ink-500 mt-0.5">
              Left: everything made in the app. Right: the files you added.
            </p>
            <p className="md:hidden text-[13px] text-ink-600 mt-0.5">
              Everything made in the app, and the files you added.
            </p>
          </div>
        </div>
      </div>

      {/* ── Phone: tabs ──────────────────────────────────────────────────── */}
      <div className="md:hidden flex bg-white border-b border-ink-100 flex-shrink-0">
        {tab('made', 'Made in the app', genCount)}
        {tab('files', 'Your files', upCount)}
      </div>

      {/* ── Split panels ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — Generated (40%) */}
        <div className={`${side === 'made' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-1/2 md:border-r border-ink-100 overflow-hidden`}>
          {/* Column header */}
          <div className="hidden md:flex bg-white border-b border-ink-100 px-6 py-3 flex-shrink-0 items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Made in the app</span>
            {genCount !== null && (
              <span className="text-[10px] font-semibold bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-full">
                {genCount}
              </span>
            )}
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            <GeneratedTab onCountChange={setGenCount} />
          </div>
        </div>

        {/* Right — Uploaded (60%) */}
        <div className={`${side === 'files' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-1/2 overflow-hidden`}>
          {/* Column header */}
          <div className="hidden md:flex bg-white border-b border-ink-100 px-6 py-3 flex-shrink-0 items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">Your files</span>
            {upCount !== null && (
              <span className="text-[10px] font-semibold bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-full">
                {upCount}
              </span>
            )}
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            <UploadedTab onCountChange={setUpCount} />
          </div>
        </div>

      </div>
    </div>
  )
}
