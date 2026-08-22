import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  uploadKnowledgeFile,
  validateFile,
  KIND_OPTIONS,
  MAX_MB,
} from '../../lib/knowledgeFiles'
import CloudImportModal from './CloudImportModal'

/**
 * UploadDialog — modal for adding a knowledge file.
 *
 * Flow:
 *   1. Owner drops / selects a file (MVP: one at a time — multi-file later)
 *   2. We validate client-side (size, type) and show any rejection inline
 *   3. Owner fills in title (default = filename), kind (default = General),
 *      optional notes, then hits Upload
 *   4. We show a progress bar: 5 → 25 (uploaded) → 70 (extracted) → 100 (saved)
 *   5. On success, parent re-queries + closes the modal
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

export default function UploadDialog({ onClose, onUploaded }) {
  const { profile }         = useAuth()
  const [file, setFile]     = useState(null)
  const [showCloud, setShowCloud] = useState(false)
  const [title, setTitle]   = useState('')
  const [kind, setKind]     = useState('general')
  const [notes, setNotes]   = useState('')
  const [dragOver, setDrag] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [progress, setPg]   = useState(0)
  const [error, setError]   = useState(null)
  const [showHints, setShowHints] = useState(false)
  const inputRef            = useRef(null)

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const pickFile = (f) => {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError(null)
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) pickFile(f)
  }

  const upload = async () => {
    if (!file || busy) return
    setBusy(true)
    setError(null)
    setPg(0)
    try {
      const row = await uploadKnowledgeFile(file, {
        companyId:  profile.company_id,
        userId:     profile.id,
        title:      title.trim(),
        kind,
        notes:      notes.trim(),
        onProgress: setPg,
      })
      onUploaded(row)
    } catch (err) {
      setError(err.message || 'Upload failed.')
      setBusy(false)
    }
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
            <h2 className="text-base font-bold text-white">Upload a document</h2>
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
          {!file ? (
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
                  Drop a file here, or click to browse
                </div>
                <div className="text-xs text-ink-400 mt-1">
                  PDF, Word, Excel, CSV, TXT, Markdown · up to {MAX_MB} MB
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md,.markdown,.csv,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => pickFile(e.target.files?.[0])}
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
            <div className="rounded-xl border border-ink-100 bg-white p-3 flex items-center gap-3 shadow-sm">
              <div className="text-2xl" aria-hidden>
                {file.type.includes('pdf') ? '📕' : file.type.startsWith('text/') ? '📝' : '📄'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink-900 truncate">{file.name}</div>
                <div className="text-xs text-ink-400">
                  {(file.size / 1024).toFixed(0)} KB
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setTitle(''); setError(null) }}
                disabled={busy}
                className="text-xs text-ink-400 hover:text-ink-700 disabled:opacity-50 transition-colors"
              >
                Change
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Metadata */}
          {file && (
            <>
              <Field label="Title">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={busy}
                  placeholder={file.name}
                />
              </Field>

              <Field label="What kind of document is this?">
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
              <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                <span>{progressLabel(progress)}</span>
                <span>{progress}%</span>
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
            type="button" onClick={upload} disabled={!file || busy}
            className="px-5 py-2.5 rounded-lg bg-gold-gradient text-white text-sm font-bold tracking-wide glow-gold-sm hover:glow-gold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {busy ? 'Uploading…' : 'Upload →'}
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
