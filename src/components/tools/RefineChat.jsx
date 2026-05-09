import { useEffect, useRef, useState } from 'react'

/**
 * RefineChat — conversational tweak panel shared across tool pages.
 *
 * Mental model: the artefact above this panel (scorecard, report, etc.) is
 * what the user is shaping. Every user message in this panel triggers a
 * regeneration; the assistant reply is a short note on what changed (the
 * full artefact updates above, not in the chat thread, to avoid visual
 * duplication).
 *
 * Suggested-prompt chips sit just above the input to lower the blank-page
 * problem — owners often know something feels off but can't articulate
 * what. Pass tool-specific suggestions via the `suggestions` prop so each
 * tool can offer its own starting points.
 *
 * Props:
 *   messages     — [{ role, content, error? }]
 *   refining     — boolean, shows typing dots + disables send
 *   onSend       — (text: string) => void
 *   suggestions  — string[], suggested prompts shown before first user turn
 *   title        — section heading, defaults to "Tweak it"
 *   hint         — small subheading under the title
 *   placeholder  — input placeholder when idle
 *
 * Why a separate component: two tools (Hiring, Exit Readiness) now use the
 * exact same refinement chat UX. Any future tool that produces a structured
 * artefact (Offer Builder, Org Chart, etc.) can drop this in and only care
 * about prompts + state.
 */
export default function RefineChat({
  messages,
  refining,
  onSend,
  suggestions = [],
  title       = 'Tweak it',
  hint        = 'Tell me what to change — the result above updates each time.',
  placeholder = 'What would you like to change?',
}) {
  const [draft, setDraft] = useState('')
  const endRef            = useRef(null)

  // Keep the chat pinned to the newest message so long threads don't hide it.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages.length, refining])

  const send = (text) => {
    const value = (text ?? draft).trim()
    if (!value || refining) return
    setDraft('')
    onSend(value)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    send()
  }

  const handleKey = (e) => {
    // Enter sends, Shift+Enter inserts a newline. Mirrors the Advisor chat.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const userTurnCount = messages.filter(m => m.role === 'user').length

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>

      <div className="px-4 py-4 space-y-3 max-h-80 overflow-y-auto">
        {messages.map((m, i) => <ChatBubble key={i} message={m} />)}
        {refining && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gray-100 text-sm text-gray-500">
              <Dot delay={0} />
              <Dot delay={150} />
              <Dot delay={300} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggested prompts — shown only before the first user turn to avoid
          clutter. Clicking fills and sends. */}
      {suggestions.length > 0 && userTurnCount === 0 && !refining && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-white hover:border-brand-300 hover:text-brand-700 text-gray-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-gray-100 p-3">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={refining ? 'Updating…' : placeholder}
          disabled={refining}
          className="flex-1 resize-none px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
          style={{ maxHeight: '8rem' }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || refining}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </section>
  )
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  const tone = isUser
    ? 'bg-brand-600 text-white'
    : message.error
      ? 'bg-red-50 text-red-800 border border-red-200'
      : 'bg-gray-100 text-gray-800'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${tone}`}>
        {message.content}
      </div>
    </div>
  )
}

function Dot({ delay }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  )
}
