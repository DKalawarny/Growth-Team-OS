import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { callClaude, HAIKU } from '../../lib/anthropic'
import { isDemoCompany } from '../../lib/demo'

/**
 * Ask Solomon first; a person second.
 *
 * ⚠️ 10 Oct, Daniel: "we should have an ask Solomon first and make it so he can
 * answer questions for this, and if not then email." This sat where a mailto
 * to support@eliv8os.com used to be, and that address has no mailbox behind it:
 * every message sent there was lost. So the fallback here is NOT a mailto. An
 * unanswered question is saved (support_requests) and emailed to Daniel by the
 * database, with the sender as reply-to.
 *
 * Solomon answers ONLY from the help text passed in. He is told to say he does
 * not know when it is not covered, because a confident wrong answer about where
 * a button is costs more than no answer.
 */
const STOP = new Set('the a an and or of to in on for is are do does how i my me can what where when why with it this that be have has you your we our from at as if not'.split(' '))
const words = t => String(t ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))

// How the app is laid out TODAY. The FAQ and guides below it were written
// earlier and some wording in them is older; this block is the current truth
// and Solomon is told it wins. Keep it current when a page moves or is renamed.
const LAYOUT = `
THE SIDEBAR, TOP TO BOTTOM: Home, Solomon, Roadmap, SOPs, Tasks, Daily logs, Finances, Documents, Succession, Tools, Help, Settings.
HOME: what needs you today. The milestone in flight with its steps and who has each, tasks in motion with who is on them, and the latest daily logs from the crew.
SOLOMON: the advisor. Ask anything about the business. He reads your plan, numbers, documents and daily logs first.
ROADMAP: your milestones. The card at the top is your focus right now. "How fast do you want to go?" lets you pick a pace; every date moves with it and nothing is saved until you click Lock in this pace. Timeline and List are two views of the same milestones. "Something come up?" at the bottom adds a new thing to the roadmap. To put a person on a step, open a milestone, hover a step and click + Task.
SOPs: write down a job you repeat, one step per line. "Ask Solomon what we're missing" names SOPs worth writing. "Create a task from this SOP" starts a task with the steps attached. You can print an SOP or save it as a PDF.
TASKS: one card per piece of work. Add a task, pick one or more people, and move it across Not started, In progress, Review, Done by dragging or with the arrows. Open a task to attach files (up to 50MB each) and to enter what it was quoted, what it cost and what was invoiced.
DAILY LOGS: what the crew wrote at the end of each day, with your own notes in a panel on the right. You can also write a note under any one log; the crew sees it unless you untick that. "Send a job and files to the crew" at the top right creates a job with a start date, an optional end date, people and files. "Crew and reminders" at the bottom of the page is where you add crew, set which days and what time they are reminded, and click "Open their page" to see what a crew member sees.
CREW: crew members do not log in. Each has their own page, opened from a link that is emailed to them.
FINANCES: your financial read. "Run a new period" builds a new one.
DOCUMENTS: two shelves. "Made in the app" is everything a tool or Solomon wrote. "Your files" is what you uploaded: use Upload a file, or bring files in from Google Drive or OneDrive. Solomon reads uploaded files before he answers.
SUCCESSION: how ready the business is to run without you.
TOOLS: Forecast cash further out (Cash flow), Price check, Think through a hire (Hiring planner), Plan the team (Org chart), Draft an update for the team (Team newsletter), Work through a decision, Set this quarter's priorities (Rocks), Check a safety rule (Safety).
QUARTERLY PRIORITIES (ROCKS): pick three to five milestones from your roadmap for the quarter and tick their steps as they get done. Marking one finished marks it finished on the roadmap.
PRICE CHECK: enter a price, hours, labour cost per hour and materials to see what you keep and how that compares with your finished jobs.
SETTINGS: your business profile, your team and what each person can see, connecting QuickBooks, and billing.
`.trim()

export default function HelpAsk({ faq = [], guides = [] }) {
  const { profile, company } = useAuth()
  const demo = isDemoCompany(company)
  const startAsProblem = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('report') === '1'

  const [q, setQ]           = useState('')
  const [asked, setAsked]   = useState(null)   // the question that was asked
  const [busy, setBusy]     = useState(false)
  const [answer, setAnswer] = useState(null)   // { text } | { none: true }
  const [sent, setSent]     = useState(null)   // 'ok' | 'demo' | error text
  const [sending, setSending] = useState(false)

  const corpus = useMemo(() => [
    ...faq.map(f => ({ title: f.q, body: f.a })),
    ...guides.map(g => ({ title: g.name, body: [g.short, ...(g.steps ?? [])].join(' ') })),
  ], [faq, guides])

  // The closest help entries by shared words. Shown at once, with or without Solomon.
  const matches = useMemo(() => {
    if (!asked) return []
    const want = new Set(words(asked))
    if (want.size === 0) return []
    return corpus
      .map(c => ({ ...c, score: words(c.title).filter(w => want.has(w)).length * 2 + words(c.body).filter(w => want.has(w)).length }))
      .filter(c => c.score >= 2).sort((a, b) => b.score - a.score).slice(0, 2)
  }, [asked, corpus])

  async function ask(e) {
    e?.preventDefault()
    const text = q.trim()
    if (!text || busy) return
    setAsked(text); setAnswer(null); setSent(null)
    if (demo) { setAnswer({ off: true }); return }
    setBusy(true)
    try {
      const help = `${LAYOUT}\n\nOLDER HELP ENTRIES (if one disagrees with the layout above, the layout above is right):\n${corpus.map(c => `Q: ${c.title}\nA: ${c.body}`).join('\n\n')}`
      const raw = await callClaude({
        model: HAIKU,
        maxTokens: 500,
        temperature: 0.2,
        systemPrompt: `You are Solomon, answering a question about HOW TO USE the Eliv8 OS app. Answer only from the HELP TEXT below.\n\nRules:\n- If the help text covers it, answer in two to five short sentences. Say where to click, using the exact names of pages and buttons from the help text.\n- If the help text does not cover it, or you are not sure, reply with exactly NOT_COVERED and nothing else. Never guess where something is.\n- If the question is about the owner's business and not about using the app, say in one sentence that this is a question for the Solomon page in the sidebar.\n- Plain words. No dashes. No lists unless the steps need an order.\n\nHELP TEXT:\n${help}`,
        messages: [{ role: 'user', content: text }],
      })
      const out = String(raw ?? '').trim()
      setAnswer(!out || /NOT_COVERED/.test(out) ? { none: true } : { text: out })
    } catch {
      setAnswer({ none: true, failed: true })
    }
    setBusy(false)
  }

  async function sendToPerson(kind = 'question') {
    if (sending) return
    if (demo) { setSent('demo'); return }
    setSending(true)
    const { error } = await supabase.from('support_requests').insert({
      company_id: profile.company_id, user_id: profile.id, kind,
      question: (asked ?? q).trim().slice(0, 4000),
      solomon_answer: answer?.text ?? null,
      page: typeof document !== 'undefined' ? document.referrer || window.location.pathname : null,
    })
    setSending(false)
    setSent(error ? `That did not send: ${error.message}` : 'ok')
  }

  return (
    <section id="ask" className="mb-10 rounded-xl border border-ink-200 bg-white overflow-hidden">
      <div className="bg-ink-900 text-white px-5 sm:px-6 py-4">
        <h2 className="text-lg font-bold">{startAsProblem ? 'Tell us what is not right' : 'Ask Solomon how something works'}</h2>
        <p className="text-sm text-white/80 leading-relaxed mt-0.5">
          {startAsProblem
            ? 'Describe what happened. Solomon checks whether this is something he can explain. If he cannot, your message goes to a person.'
            : 'Type your question the way you would say it. If Solomon cannot answer, send it to a person with one click.'}
        </p>
      </div>

      <form onSubmit={ask} className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          autoFocus={startAsProblem}
          placeholder={startAsProblem ? 'What went wrong, and what were you trying to do?' : 'e.g. How do I send plans to my foreman?'}
          className="flex-1 rounded-lg border border-ink-200 px-4 py-3 text-base text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button
          type="submit"
          disabled={!q.trim() || busy}
          className="px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-base font-bold transition-colors"
        >
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </form>

      {asked && (
        <div className="px-5 sm:px-6 pb-5 space-y-4">
          {busy && <p className="text-sm text-ink-600">Solomon is reading the help pages…</p>}

          {answer?.text && (
            <div className="rounded-lg bg-brand-50 border border-brand-200 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-800 mb-1">Solomon</p>
              <p className="text-[15px] text-ink-900 leading-relaxed whitespace-pre-wrap">{answer.text}</p>
            </div>
          )}
          {answer?.none && (
            <p className="text-[15px] text-ink-900 leading-relaxed">
              {answer.failed ? 'Solomon could not be reached just now.' : 'Solomon does not have an answer to that one.'} Send it to a person below.
            </p>
          )}
          {answer?.off && (
            <p className="text-[15px] text-ink-900 leading-relaxed">
              Solomon is switched off in this demo. In your own account he answers here. The closest help pages are below.
            </p>
          )}

          {matches.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-700 mb-1.5">From the help pages</p>
              <ul className="space-y-2">
                {matches.map(m => (
                  <li key={m.title} className="rounded-lg border border-ink-100 px-4 py-3">
                    <p className="text-sm font-semibold text-ink-900">{m.title}</p>
                    <p className="text-sm text-ink-700 leading-relaxed mt-0.5">{m.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!busy && answer && sent !== 'ok' && (
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => sendToPerson(startAsProblem ? 'problem' : 'question')}
                disabled={sending}
                className="px-4 py-2.5 rounded-lg border border-ink-200 bg-white text-sm font-semibold text-ink-900 disabled:opacity-50"
              >
                {sending ? 'Sending…' : answer.text ? 'Still stuck? Send this to a person' : 'Send this to a person'}
              </button>
              <span className="text-sm text-ink-600">Your question goes to Daniel with your email, and he replies to you directly.</span>
            </div>
          )}
          {sent === 'ok' && (
            <p className="text-[15px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              Sent. Daniel has your question and replies to {profile?.email || 'the email on your account'}.
            </p>
          )}
          {sent === 'demo' && (
            <p className="text-sm text-ink-700">Nothing is sent from the demo. In your own account this reaches a person.</p>
          )}
          {sent && sent !== 'ok' && sent !== 'demo' && <p className="text-sm text-red-700">{sent}</p>}
        </div>
      )}
    </section>
  )
}
