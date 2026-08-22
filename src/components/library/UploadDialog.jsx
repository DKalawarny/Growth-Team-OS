import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  uploadKnowledgeFile,
  validateFile,
  expandDroppedItems,
  KIND_OPTIONS,
  MAX_MB,
} from '../../lib/knowledgeFiles'
import CloudImportModal from './CloudImportModal'

/**
 * UploadDialog — modal for adding knowledge files.
 *
 * Flow:
 *   1. Owner drops / selects one or more files (or a whole folder)
 *   2. We validate each client-side (size, type) and list any rejections
 *      inline, by name, without discarding the ones that passed
 *   3. Owner sets kind (default = General) and optional notes for the batch,
 *      plus a title when there is exactly one file
 *   4. We upload sequentially, showing "3 of 7 · service-call-sop.md"
 *   5. Each success is handed to the parent as it lands; the dialog closes
 *      itself when the batch finishes
 *
 * ⭐ MULTI-FILE, DELIBERATELY. This was one-at-a-time, and the cost only shows
 * up with real usage: an owner's documents arrive as a folder of eight, and
 * eight trips through a modal with a metadata form each time is enough
 * friction that the library stays empty — which is the one thing that makes
 * Solomon generic. The metadata is per-batch rather than per-file for the same
 * reason: asking eight times for a field most people leave alone buys nothing.
 *
 * ⚠️ Sequential, not Promise.all. Extraction runs client-side (pdf.js on the
 * main thread), so eight parallel extractions freeze the tab and race for the
 * same memory. One at a time is slower on paper and finishes sooner in fact.
 */

// ---- What to upload hints — shown in a collapsible helper panel ----
const UPLOAD_HINTS = [
  { label: 'P&L or balance sheet',      icon: '📊' },
  { label: 'Pricing / rate sheet',       icon: '💲' },
  { label: 'SOPs or checklists',         icon: '⚙️'  },
  { label: 'Employee handbook',          icon: '📋' },
  { label: 'Past proposals',             icon: '📝' },
  { label: 'Marketing materials',        icon: '📣' },
  { label: 'Business or growth plan',    icon: '🎯' },
  { label: 'Customer survey results',    icon: '🌟' },
]

/** Filename without its extension — the default title for a document. */
const stem = (name) => name.replace(/\.[^.]+$/, '')

/**
 * Split a set of files into what we can take and what we cannot.
 *
 * ⭐ Rejections are collected BY NAME alongside the accepted files rather than
 * replacing them. Dropping a folder of six good documents and one .pages file
 * should queue the six and say which one was skipped — the old single-error
 * path threw the whole drop away and named only the first problem.
 */
function partitionFiles(incoming) {
  const accepted = []
  const rejected = []
  for (const f of incoming ?? []) {
    const err = validateFile(f)
    if (err) rejected.push({ name: f.name, reason: err })
    else accepted.push(f)
  }
  return { accepted, rejected }
}

export default function UploadDialog({ onClose, onUploaded, initialFiles = [] }) {
  const { profile }         = useAuth()
  // ⚠️ Files dropped on the card that opened this dialog are seeded as INITIAL
  // state, not applied in an effect. An effect would render the dialog empty
  // for a frame and then fill it, and React rightly flags setState in an
  // effect body; a lazy initialiser runs once, before the first paint.
  const [seed] = useState(() => partitionFiles(initialFiles))
  const [files, setFiles]   = useState(seed.accepted)
  const [rejected, setRej]  = useState(seed.rejected)
  const [showCloud, setShowCloud] = useState(false)
  const [title, setTitle]   = useState(
    seed.accepted.length === 1 ? stem(seed.accepted[0].name) : ''
  )
  const [kind, setKind]     = useState('general')
  const [notes, setNotes]   = useState('')
  const [dragOver, setDrag] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [progress, setPg]   = useState(0)
  const [doneCount, setDone] = useState(0)
  const [current, setCurrent] = useState(null)
  const [error, setError]   = useState(null)
  const [showHints, setShowHints] = useState(false)
  const inputRef            = useRef(null)

  const single = files.length === 1

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  /**
   * Add files to the batch. Rejections are listed BY NAME alongside the
   * accepted ones rather than replacing them — dropping a folder that holds
   * six good documents and one .pages file should queue the six, not throw
   * the whole drop away with a single error message.
   */
  const addFiles = (incoming) => {
    const { accepted, rejected: bad } = partitionFiles(incoming)
    // Dedupe on name+size — dropping the same folder twice is a common slip.
    const seen = new Set(files.map(f => `${f.name}:${f.size}`))
    const merged = [...files]
    for (const f of accepted) {
      const key = `${f.name}:${f.size}`
      if (!seen.has(key)) { seen.add(key); merged.push(f) }
    }
    setRej(bad)
    setError(null)
    setFiles(merged)
    if (merged.length === 1 && !title.trim()) setTitle(stem(merged[0].name))
  }

  const onDrop = async (e) => {
    e.preventDefault()
    setDrag(false)
    // expandDroppedItems must be handed the dataTransfer before we await —
    // it snapshots .items synchronously for exactly this reason.
    const dropped = await expandDroppedItems(e.dataTransfer)
    if (dropped.length) addFiles(dropped)
  }

  const removeAt = (i) => setFiles(prev => {
    const next = prev.filter((_, idx) => idx !== i)
    if (next.length !== 1) setTitle('')
    return next
  })

  const upload = async () => {
    if (!files.length || busy) return
    setBusy(true)
    setError(null)
    setPg(0)
    setDone(0)

    const failures = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      setCurrent(f.name)
      try {
        const row = await uploadKnowledgeFile(f, {
          companyId:  profile.company_id,
          userId:     profile.id,
          // Only honour the typed title in the single-file case; for a batch
          // each file keeps its own name, which is the only thing that can
          // tell them apart in the library afterwards.
          title:      single ? title.trim() : f.name.replace(/\.[^.]+$/, ''),
          kind,
          notes:      notes.trim(),
          onProgress: setPg,
        })
        // Hand each row up as it lands so the list fills in visibly, but hold
        // the library re-analysis until the last one — otherwise a batch of
        // seven kicks off seven analyses of a library that is still changing.
        onUploaded(row, { analyze: i === files.length - 1 })
        setDone(i + 1)
      } catch (err) {
        failures.push({ name: f.name, reason: err.message || 'Upload failed.' })
      }
    }

    setCurrent(null)
    if (failures.length) {
      // Keep the dialog open on partial failure — closing it would report
      // success for a batch that was not fully successful.
      //
      // ⭐ Keep the FAILED files queued and drop the ones that landed, so
      // pressing Upload again retries exactly what is missing. Clearing the
      // list outright (the first version of this) made a partial failure worse
      // than a total one: the owner had to find and re-pick every file,
      // including the ones already safely in the library.
      const failedNames = new Set(failures.map(f => f.name))
      setRej(failures)
      setFiles(prev => prev.filter(f => failedNames.has(f.name)))
      setDone(0)
      setError(
        failures.length === files.length
          ? `None of the ${files.length} files could be uploaded.`
          : `${failures.length} of ${files.length} could not be uploaded — the rest are in your library. Press Upload to retry these.`
      )
      setBusy(false)
      return
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-ink-100 overflow-hidden"
        role="dialog" aria-modal="true"
      >
        {/* Dark header */}
        <div className="bg-ink-900 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-brand-400 font-semibold mb-0.5">
              Knowledge Library
            </div>
            <h2 className="text-base font-bold text-white">
              {files.length > 1 ? `Upload ${files.length} documents` : 'Upload a document'}
            </h2>
          </div>
          <button
            type="button" onClick={onClose} disabled={busy}
            aria-label="Close"
            className="text-ink-400 hover:text-white text-2xl leading-none disabled:opacity-50 transition-colors"
          >
            ×
          </button>
        </div>

        {/* What to upload hint bar — collapsible */}
        <button
          type="button"
          onClick={() => setShowHints(h => !h)}
          className="w-full flex items-center justify-between px-5 py-2.5 border-b border-ink-100 bg-ink-50 hover:bg-ink-100 transition-colors"
        >
          <span className="text-[10.5px] font-semibold uppercase tracking-widest text-ink-500">
            💡 What's worth uploading?
          </span>
          <span className="text-ink-400 text-xs">{showHints ? '▲' : '▼'}</span>
        </button>

        {showHints && (
          <div className="px-5 py-3 border-b border-ink-100 bg-ink-50/60">
            <div className="grid grid-cols-2 gap-1.5">
              {UPLOAD_HINTS.map((h) => (
                <div key={h.label} className="flex items-center gap-1.5 text-xs text-ink-600">
                  <span aria-hidden>{h.icon}</span>
                  <span>{h.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-ink-400 mt-2.5 leading-relaxed">
              Solomon reads everything together — the more context you give it, the more specific its advice becomes.
            </p>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Drop zone / file picker */}
          {!files.length ? (
            <div className="space-y-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-ink-200 bg-ink-50/50 hover:border-ink-300'
                }`}
              >
                <div className="text-3xl mb-2" aria-hidden>📥</div>
                <div className="text-sm font-semibold text-ink-900">
                  Drop files or a folder here, or click to browse
                </div>
                <div className="text-xs text-ink-400 mt-1">
                  PDF, Word, Excel, CSV, text, Markdown or a photo · up to {MAX_MB} MB each
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md,.markdown,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,image/*,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = '' }}
                />
              </div>

              {/* Cloud import shortcut */}
              <button
                type="button"
                onClick={() => setShowCloud(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/20 text-sm text-ink-600 font-medium transition-colors"
              >
                <span aria-hidden>☁️</span>
                Import from Google Drive or OneDrive
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                  {files.length} {files.length === 1 ? 'file' : 'files'} ready
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
                >
                  + Add more
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md,.markdown,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,image/*,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = '' }}
                />
              </div>

              <div className="rounded-xl border border-ink-100 bg-white shadow-sm max-h-52 overflow-y-auto divide-y divide-ink-50">
                {files.map((f, i) => (
                  <div key={`${f.name}:${f.size}`} className="p-2.5 flex items-center gap-2.5">
                    <div className="text-lg shrink-0" aria-hidden>
                      {f.type.includes('pdf') ? '📕' : f.type.startsWith('image/') ? '🖼️' : f.type.startsWith('text/') ? '📝' : '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-900 truncate">{f.name}</div>
                      <div className="text-xs text-ink-400">{(f.size / 1024).toFixed(0)} KB</div>
                    </div>
                    {busy && i < doneCount && (
                      <span className="text-xs text-brand-600 font-semibold shrink-0" aria-label="Uploaded">✓</span>
                    )}
                    {!busy && (
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        aria-label={`Remove ${f.name}`}
                        className="text-ink-300 hover:text-ink-700 text-lg leading-none shrink-0 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files the batch could not take — named, so the owner knows which */}
          {rejected.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
              <div className="text-xs font-semibold text-amber-900">
                {rejected.length === 1 ? 'One file was skipped' : `${rejected.length} files were skipped`}
              </div>
              {/* ⚠️ Name the file. validateFile's messages already embed the
                  filename, but a server-side failure's does not — six files
                  failing the same way rendered as six identical sentences with
                  nothing to say which file each one was about. */}
              {rejected.map(r => (
                <div key={r.name} className="text-xs text-amber-800 leading-relaxed">
                  {r.reason.includes(r.name) ? r.reason : `${r.name} — ${r.reason}`}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Metadata */}
          {files.length > 0 && (
            <>
              {/* One file gets a title field. A batch does not: each file keeps
                  its own name, which is what distinguishes them in the library,
                  and one title applied to seven documents would erase that. */}
              {single && (
                <Field label="Title">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={busy}
                    placeholder={files[0].name}
                  />
                </Field>
              )}

              <Field label={single ? 'What kind of document is this?' : 'What kind of documents are these?'}>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  disabled={busy}
                >
                  {KIND_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Notes (optional)"
                hint='E.g. "Our 2025 employee handbook, updated after the restructure."'
              >
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={busy}
                  rows={2}
                  placeholder=""
                />
              </Field>
            </>
          )}

          {/* Progress */}
          {busy && (
            <div>
              <div className="flex items-center justify-between text-xs text-ink-500 mb-1 gap-3">
                <span className="truncate">
                  {files.length > 1 && (
                    <span className="font-semibold text-ink-700">
                      {Math.min(doneCount + 1, files.length)} of {files.length} ·{' '}
                    </span>
                  )}
                  {current ? `${progressLabel(progress)} ${current}` : progressLabel(progress)}
                </span>
                <span className="shrink-0">{progress}%</span>
              </div>
              <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-gradient transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ink-100 bg-ink-50/40 flex items-center justify-end gap-2">
          <button
            type="button" onClick={onClose} disabled={busy}
            className="px-4 py-2 rounded-lg border border-ink-200 bg-white hover:bg-ink-50 text-sm text-ink-700 font-medium disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button" onClick={upload} disabled={!files.length || busy}
            className="px-5 py-2.5 rounded-lg bg-gold-gradient text-white text-sm font-bold tracking-wide glow-gold-sm hover:glow-gold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {busy
              ? 'Uploading…'
              : files.length > 1 ? `Upload ${files.length} files →` : 'Upload →'}
          </button>
        </div>
      </div>

      {/* Cloud import modal — opens on top of this dialog */}
      {showCloud && (
        <CloudImportModal
          companyId={profile?.company_id}
          userId={profile?.id}
          onClose={() => setShowCloud(false)}
          onUploaded={(row) => { onUploaded(row); setShowCloud(false); onClose() }}
        />
      )}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-ink-800 mb-1">{label}</div>
      {children}
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </label>
  )
}

function progressLabel(p) {
  if (p < 25)  return 'Uploading file…'
  if (p < 70)  return 'Reading contents…'
  if (p < 100) return 'Saving to your library…'
  return 'Done'
}
