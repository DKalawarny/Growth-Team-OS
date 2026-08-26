import { useCallback, useMemo, useRef, useState } from 'react'
import { uploadKnowledgeFile, expandDroppedItems, validateFile, MAX_MB } from '../../lib/knowledgeFiles'
import { runLibraryAnalysis } from '../../lib/libraryAnalysis'
import { startOAuthFlow } from '../../lib/quickbooks'

/**
 * "Show him the business" — the last screen of onboarding.
 *
 * ⭐ WHY THIS EXISTS
 *
 * Onboarding asked five pages of questions and never once asked for a document,
 * so Solomon met every new owner knowing what they had typed about the business
 * and nothing the business had actually produced. Uploads are the single
 * biggest source of true things about a company, and they were reachable only
 * from a Library page a new owner has no reason to open.
 *
 * ⚠️ THE PROBLEM IS NOT THAT THE PAGE WASN'T PRETTY ENOUGH.
 *
 * "Upload your documents" is an unbounded ask with an invisible payoff, made at
 * the exact moment trust is lowest: minute three, free pilot, a stranger asking
 * a business owner for their books. Three things move that number, and none of
 * them is an animation:
 *
 *   1. Make the ask SPECIFIC and small.  "Your last P&L", not "your documents".
 *   2. Make the payoff IMMEDIATE.        Each file says something back.
 *   3. Make the trade EXPLICIT.          This answer becomes possible.
 *
 * So the page is a list of what Solomon CANNOT tell you yet, each item naming
 * the one document that unlocks it. That is the honest version of the same
 * motivation a completeness score would fake — and a score would also be a
 * promise we cannot keep, because "100%" would imply the advice is right.
 *
 * The framing comes from the product's own tone rule, in Daniel's words:
 * "he works from what you give him, so his answer is only as good as what he
 * can see." State the limit; never apologise for the product.
 *
 * ⚠️ Skipping is FIRST CLASS. Most owners have nothing to hand at minute three,
 * and a screen that punishes them for it is a wall, not a door. "I'll do this
 * later" is a plain link, not a greyed-out afterthought, and the Library is
 * always there.
 */

// What Solomon cannot answer yet, and the one thing that changes each.
//
// ⚠️ Keep these to answers the product genuinely produces — cash flow, hiring,
// pricing and the owner's own written procedures all map to real tools. Adding
// an item we cannot actually deliver would make the whole list a lie.
const GAPS = [
  {
    id:      'financials',
    locked:  'Whether you can afford the next hire',
    unlock:  'A P&L, or a payroll summary',
    match:   /p\s?(&|and)\s?l|profit|loss|income|payroll|wage|salary|balance.?sheet|financial/i,
  },
  {
    id:      'cash',
    locked:  'Where cash gets tight in the next thirteen weeks',
    unlock:  'A bank statement — or connect QuickBooks',
    match:   /bank|statement|cash|ledger|transactions|reconcil/i,
  },
  {
    id:      'pricing',
    locked:  'Whether your pricing is leaving money behind',
    unlock:  'A quote, an estimate, or your price list',
    match:   /quote|estimate|pricing|price|rate|bid|proposal|invoice/i,
  },
  {
    id:      'process',
    locked:  'What your own procedures actually say',
    unlock:  'An SOP, a handbook, or a checklist',
    match:   /sop|procedure|process|handbook|manual|checklist|policy|training/i,
  },
]

// Which gap a file satisfies. Filename only — deliberately. The alternative is
// waiting for extraction to finish before the list can respond, which would
// leave the owner watching a spinner at the exact moment the page is supposed
// to be showing its work.
function gapsFor(filename) {
  const name = filename || ''
  return GAPS.filter(g => g.match.test(name)).map(g => g.id)
}

export default function ShowHimTheBusiness({ companyId, userId, onDone }) {
  const [queue,    setQueue]    = useState([])   // [{ id, name, state, note }]
  const [busy,     setBusy]     = useState(false)
  const [dragging, setDragging] = useState(false)
  const [analysis, setAnalysis] = useState(null) // library intelligence result
  const [analyzing, setAnalyzing] = useState(false)
  const [error,    setError]    = useState(null)
  const inputRef = useRef(null)

  // A gap is met once any file that matched it has finished. Derived rather
  // than stored so a failed upload cannot leave a tick behind.
  const met = useMemo(() => {
    const s = new Set()
    for (const item of queue) {
      if (item.state !== 'done') continue
      for (const id of item.gaps) s.add(id)
    }
    return s
  }, [queue])

  const addFiles = useCallback(async (files) => {
    const incoming = Array.from(files || [])
    if (!incoming.length) return
    setError(null)

    // Validate up front so a rejected file never looks like it was accepted.
    const accepted = []
    const rejected = []
    for (const f of incoming) {
      const problem = validateFile(f)
      if (problem) rejected.push(problem)
      else accepted.push(f)
    }
    if (rejected.length) setError(rejected[0])
    if (!accepted.length) return

    const items = accepted.map(f => ({
      id:    `${f.name}-${f.size}-${Math.round(f.lastModified || 0)}`,
      file:  f,
      name:  f.name,
      gaps:  gapsFor(f.name),
      state: 'waiting',
      note:  null,
    }))
    setQueue(prev => [...prev, ...items])

    setBusy(true)
    // ⚠️ SEQUENTIAL, not Promise.all. Extraction is client-side pdf.js on the
    // main thread — firing five at once makes the whole page stutter and the
    // per-file progress meaningless. Same reason the Library uploader is
    // sequential.
    for (const item of items) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, state: 'reading' } : q))
      try {
        const row = await uploadKnowledgeFile(item.file, {
          companyId,
          userId,
          title: item.file.name,
          kind:  item.gaps.includes('financials') || item.gaps.includes('cash') ? 'financial'
               : item.gaps.includes('process')    ? 'sop'
               : 'general',
        })
        setQueue(prev => prev.map(q => q.id === item.id
          ? {
              ...q,
              state: 'done',
              // Honest about the one case that looks like success and isn't:
              // uploaded fine, nothing readable inside.
              note: row.status === 'ready' ? null : 'Stored, but he could not read this one',
            }
          : q))
      } catch (err) {
        setQueue(prev => prev.map(q => q.id === item.id
          ? { ...q, state: 'failed', note: err.message || 'Could not be saved' }
          : q))
      }
    }
    setBusy(false)

    // One analysis pass at the end, across everything — not one per file.
    setAnalyzing(true)
    try {
      const result = await runLibraryAnalysis(companyId)
      setAnalysis(result)
    } catch {
      // Non-fatal. The files are saved and indexed either way; the summary is
      // the flourish, not the substance.
    } finally {
      setAnalyzing(false)
    }
  }, [companyId, userId])

  async function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    // Snapshot .items synchronously — it empties the moment the handler yields.
    const expanded = await expandDroppedItems(e.dataTransfer).catch(() => null)
    if (expanded?.length) return addFiles(expanded)
    addFiles(e.dataTransfer.files)
  }

  const anyDone = queue.some(q => q.state === 'done')

  return (
    <div className="min-h-screen flex">
      {/* Left panel — matches GeneratingScreen so the last two screens of
          onboarding read as one moment rather than two products. */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] bg-ink-gradient flex-col justify-center p-12 relative overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(20,166,123,0.14) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <span className="text-white font-bold text-base tracking-tight">GrowthOS</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Your roadmap is built.
          </h2>
          <p className="text-ink-300 text-sm leading-relaxed">
            It is built from what you told him. Everything you show him from here
            makes the next answer less of an assumption and more of a reading.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-ink-50 overflow-y-auto">
        <div className="w-full max-w-lg">

          <h1 className="text-2xl font-bold text-ink-900 mb-2 tracking-tight">
            Show him the business.
          </h1>
          <p className="text-sm text-ink-500 leading-relaxed mb-8">
            He works from what you give him, so his answer is only as good as what
            he can see. Here is what he cannot tell you yet.
          </p>

          {/* The gap list — the whole argument of this page */}
          <ul className="space-y-2.5 mb-8">
            {GAPS.map(gap => {
              const done = met.has(gap.id)
              return (
                <li
                  key={gap.id}
                  className="flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors"
                  style={{
                    background:  done ? 'rgba(20,166,123,0.06)' : '#fff',
                    borderColor: done ? 'rgba(20,166,123,0.30)' : 'rgba(13,20,19,0.09)',
                  }}
                >
                  <span
                    className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold"
                    style={{
                      borderColor: done ? '#14a67b' : 'rgba(13,20,19,0.20)',
                      background:  done ? '#14a67b' : 'transparent',
                      color:       '#fff',
                    }}
                  >
                    {done ? '✓' : ''}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[13.5px] leading-snug ${done ? 'text-ink-500 line-through' : 'text-ink-900 font-medium'}`}>
                      {gap.locked}
                    </p>
                    {!done && (
                      <p className="text-[12px] text-ink-400 mt-0.5">{gap.unlock}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors"
            style={{
              borderColor: dragging ? '#14a67b' : 'rgba(13,20,19,0.14)',
              background:  dragging ? 'rgba(20,166,123,0.05)' : '#fff',
            }}
          >
            <p className="text-sm font-semibold text-ink-900">
              Drop files here, or choose them
            </p>
            <p className="text-[12px] text-ink-400 mt-1.5 leading-relaxed">
              PDFs, spreadsheets, documents, or a photo of something on paper.
              Up to {MAX_MB}MB each. A folder works too.
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = '' }}
            />
          </div>

          {error && (
            <p className="mt-3 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Per-file progress. No fake percentage — the states are real. */}
          {queue.length > 0 && (
            <ul className="mt-5 space-y-1.5">
              {queue.map(item => (
                <li key={item.id} className="flex items-center gap-2.5 text-[12.5px]">
                  <span className="flex-shrink-0 w-4 text-center">
                    {item.state === 'done'    ? <span className="text-brand-600">✓</span>
                   : item.state === 'failed'  ? <span className="text-red-500">✕</span>
                   : item.state === 'reading' ? <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                   :                            <span className="text-ink-300">·</span>}
                  </span>
                  <span className="truncate text-ink-600">{item.name}</span>
                  <span className="ml-auto flex-shrink-0 text-ink-400">
                    {item.state === 'reading' ? 'reading…'
                   : item.note                ? item.note
                   : item.state === 'done'    ? 'read'
                   : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* What he found — the payoff, and it is real output, not a flourish */}
          {analyzing && (
            <p className="mt-6 text-[12.5px] text-ink-400">Reading everything together…</p>
          )}
          {analysis?.summary && (
            <div className="mt-6 rounded-2xl border border-ink-100 bg-white px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 mb-2">
                What he took from that
              </p>
              <p className="font-serif text-[15.5px] leading-[1.6] text-ink-800">
                {analysis.summary}
              </p>
            </div>
          )}

          {/* QuickBooks — one click beats ten drags for the money half.
              ⚠️ This LEAVES the page: startOAuthFlow navigates to Intuit and the
              callback lands in Settings. That is acceptable here only because
              onboarding is already complete by this screen — the profile is
              saved and the roadmap is built, so nothing is lost. Do not move
              this earlier in the flow. */}
          <button
            type="button"
            onClick={() => startOAuthFlow().catch(err => setError(err.message))}
            className="mt-6 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50 transition-colors"
          >
            Connect QuickBooks instead — one click, real numbers
          </button>
          <p className="text-[11px] text-ink-400 mt-1.5 text-center">
            Takes you to Intuit and back. You can also do this any time from Settings.
          </p>

          {/* Where it goes. The trust question is the real barrier here, and it
              deserves a plain sentence rather than a padlock icon. */}
          <p className="mt-6 text-[11.5px] text-ink-400 leading-relaxed text-center">
            Your files are private to your workspace and are used to answer your
            questions. Nobody else&rsquo;s Solomon can see them.
          </p>

          <div className="mt-7 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onDone}
              className="text-sm font-medium text-ink-400 hover:text-ink-700 transition-colors"
            >
              I&rsquo;ll do this later
            </button>
            <button
              type="button"
              onClick={onDone}
              disabled={busy}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40 transition-opacity"
              style={{ background: '#14a67b' }}
            >
              {anyDone ? 'Go to Solomon' : 'Skip for now'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
