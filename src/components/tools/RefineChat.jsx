import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { isDemoCompany } from '../../lib/demo'

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
 *   title        — section heading, defaults to "Want something changed?"
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
  title       = 'Want something changed?',
  hint        = 'Say what to change and the result above updates.',
  placeholder = 'What would you like to change?',
  bare        = false,  // true when the page already wraps it in a card
}) {
  const [draft, setDraft] = useState('')
  // In the demo Solomon is switched off, so a change request can only fail,
  // and it failed as "Couldn't apply that. Try rephrasing." (Daniel, 10 Oct:
  // "that's a weird response"). The honest answer is that he is off here.
  const { company } = useAuth()
  const demo = isDemoCompany(company)
  const [demoAsked, setDemoAsked] = useState(null)
  const endRef            = useRef(null)

  // Keep the chat pinned to the newest message so long threads don't hide it,
  // but NOT on first mount: the tool pages now render a saved result on open,
  // and scrolling on mount yanked the whole page down to this box (Daniel,
  // 8 Oct: "every section opens to the middle"). Only scroll once a refine
  // actually happens.
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages.length, refining])

  const send = (text) => {
    const value = (text ?? draft).trim()
    if (!value || refining) return
    setDraft('')
    if (demo) { setDemoAsked(value); return }
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

  // ⚠️ 9 Oct, Daniel: "this is messy looking clean it up, it's on other pages
  // too." It was a boxed chat with a grey header strip, a greeting bubble
  // sitting in an empty thread, five long chips and then the input. Now: one
  // line of heading, the input, and at most three quiet suggestions under it.
  // The thread only appears once the owner has actually said something, so
  // the canned opening line never shows on its own.
  const thread = userTurnCount > 0 ? messages.slice(messages.findIndex(m => m.role === 'user')) : []

  return (
    <section className={bare ? '' : 'bg-white border border-gray-200 rounded-xl px-4 py-4'}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>

      {(thread.length > 0 || refining) && (
        <div className="mb-3 space-y-2.5 max-h-72 overflow-y-auto">
          {thread.map((m, i) => <ChatBubble key={i} message={m} />)}
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
      )}

      {demoAsked && (
        <p className="mb-3 text-sm text-ink-800 bg-ink-50 border border-ink-100 rounded-lg px-3 py-2.5 leading-relaxed">
          You asked: "{demoAsked}". Solomon is switched off in this demo, so nothing changed.
          In your own account he rewrites the result above to match.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={refining ? 'Updating…' : placeholder}
          disabled={refining}
          className="flex-1 resize-none px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
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

      {/* Suggestions: only before the first turn, three at most, as plain
          text links so they read as examples and not as a wall of buttons. */}
      {suggestions.length > 0 && userTurnCount === 0 && !refining && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>Or try:</span>
          {suggestions.slice(0, 3).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-brand-700 hover:text-brand-800 hover:underline underline-offset-2 text-left"
            >
              {s}
            </button>
          ))}
        </div>
      )}
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
