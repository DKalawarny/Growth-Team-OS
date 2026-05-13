import { useState } from 'react'
import { useAuth }  from '../hooks/useAuth'
import { backfillChatHistory } from '../lib/rag/backfill'

/**
 * One-time admin page for backfilling chat history into the RAG memory system.
 * Navigate to /admin/backfill while logged in.
 *
 * This page is intentionally minimal — it's a dev/admin tool, not a client-facing
 * feature. Once you've run the backfill you won't need to come back here.
 */
export default function AdminBackfill() {
  const { profile } = useAuth()

  const [status,   setStatus]   = useState('idle')   // idle | running | done | error
  const [progress, setProgress] = useState({ done: 0, total: 0, status: '' })
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)

  async function handleRun() {
    if (!profile?.company_id || !profile?.id) {
      setError('Not logged in — open the app first, then navigate here.')
      return
    }

    setStatus('running')
    setError(null)
    setResult(null)

    try {
      const res = await backfillChatHistory({
        companyId:  profile.company_id,
        userId:     profile.id,
        onProgress: ({ done, total, status: s }) =>
          setProgress({ done, total, status: s }),
      })
      setResult(res)
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const pct = progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-8">
      <div className="w-full max-w-lg bg-white border border-ink-100 rounded-xl shadow-sm p-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-ink-900">Backfill Chat Memory</h1>
          <p className="mt-1 text-sm text-ink-500">
            One-time setup — indexes all your existing Advisor conversations so
            Solomon can recall them when relevant.
          </p>
        </div>

        {/* What it does */}
        <div className="bg-ink-50 rounded-lg p-4 space-y-2 text-sm text-ink-600">
          <p className="font-medium text-ink-800">What this does:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Reads every past conversation with Solomon</li>
            <li>Pairs each question with the answer that followed it</li>
            <li>Generates an embedding for each Q&A pair</li>
            <li>Stores them so Solomon can search across your full history</li>
          </ul>
          <p className="text-ink-400 text-xs pt-1">
            Requires your OpenAI key to be set in .env.local. Safe to run more
            than once — it resets and re-indexes cleanly each time.
          </p>
        </div>

        {/* Progress */}
        {status === 'running' && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-ink-600">{progress.status}</span>
              <span className="text-ink-400 font-mono">{pct}%</span>
            </div>
            <div className="w-full bg-ink-100 rounded-full h-2">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            {progress.total > 0 && (
              <p className="text-xs text-ink-400 text-center">
                {progress.done} of {progress.total} conversations
              </p>
            )}
          </div>
        )}

        {/* Result */}
        {status === 'done' && result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
            <p className="text-sm font-semibold text-green-800">Backfill complete</p>
            <p className="text-sm text-green-700">
              {result.pairs} conversation{result.pairs !== 1 ? 's' : ''} indexed
              {result.skipped > 0 ? ` (${result.skipped} skipped — no embedding generated)` : ''}
            </p>
            <p className="text-xs text-green-600 pt-1">
              Solomon can now recall your full conversation history. You won't need to run this again.
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800">Something went wrong</p>
            <p className="text-sm text-red-600 mt-1 font-mono break-all">{error}</p>
            <p className="text-xs text-red-500 mt-2">
              Most likely cause: VITE_OPENAI_API_KEY is missing or invalid in .env.local
            </p>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={status === 'running'}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {status === 'running'  ? 'Running…'        :
           status === 'done'     ? 'Run Again'        :
           'Start Backfill'}
        </button>

        {/* Nav back */}
        <p className="text-center text-xs text-ink-400">
          <a href="/settings" className="hover:text-ink-600 underline">Back to Settings</a>
        </p>

      </div>
    </div>
  )
}
