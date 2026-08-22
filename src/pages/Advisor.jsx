import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { callClaude, streamClaude, SONNET, HAIKU } from '../lib/anthropic'
import { pickAdvisorModel, explainModelChoice } from '../lib/advisorCascade'
import { assertWithinSpendCap, isSpendCapExceeded, getMonthlyUsageSummary, DEFAULT_SPEND_CAP_USD } from '../lib/usage'
import SpendCapBanner from '../components/tools/SpendCapBanner'
import { buildAdvisorContext } from '../lib/advisorContext'
import { indexChatExchange } from '../lib/rag/chatIndexer'
import SolomonLauncher from '../components/advisor/SolomonLauncher'
import { rememberFromExchange } from '../lib/memory'

/**
 * Advisor — the owner's daily AI coaching chat.
 *
 * This is a unified experience: the Advisor IS the daily check-in.
 * On the first open of each day, Claude reads the owner's full business
 * context — overdue milestones, last check-in challenge, roadmap status,
 * day of week — and sends a personalised morning opener. The owner replies
 * naturally and the conversation continues from there.
 *
 * Why this works:
 *   - No generic "how are you doing?" — Claude opens with something specific
 *   - Every reply is grounded in the owner's actual situation right now
 *   - The daily habit (open Advisor first thing) is built organically
 *   - Historical context accumulates: Claude can reference what you said last Monday
 *
 * Morning opener logic:
 *   - Checks localStorage key `gos_morning_<userId>_<date>` on load
 *   - If not sent today: generates a short opener from Claude (200 tokens)
 *     saved to chat_messages so it persists in history
 *   - If already sent today: loads normally (opener already in DB history)
 */

const HISTORY_TURNS_SENT = 20

// ── localStorage helper for morning opener tracking ──────────────────────────

function todayDate() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// Detect touch-only devices (phones / tablets). On these, Enter must produce
// a newline — sending happens only via the Send button. On desktop, Enter
// sends and Shift+Enter is a newline (the long-standing chat convention).
function isTouchDevice() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: coarse)').matches
}

const OPENER_VERSION = 'v2'
function morningKey(userId)    { return `gos_morning_${userId}_${todayDate()}`                   }
function openerTextKey(userId) { return `gos_opener_text_${OPENER_VERSION}_${userId}_${todayDate()}` }

function hasOpenedToday(userId) {
  try { return !!localStorage.getItem(morningKey(userId)) }
  catch { return false }
}

// Check if the Dashboard already generated and cached the opener text.
// If so, Advisor should skip re-generating to avoid a duplicate DB entry.
function dashboardAlreadyGeneratedOpener(userId) {
  try { return !!localStorage.getItem(openerTextKey(userId)) }
  catch { return false }
}

function markOpenedToday(userId) {
  try { localStorage.setItem(morningKey(userId), '1') }
  catch { /* storage blocked */ }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Advisor() {
  const { profile, company } = useAuth()
  const [messages,        setMessages]        = useState([])
  const [input,           setInput]           = useState('')
  const [loading,         setLoading]         = useState(true)
  const [sending,         setSending]         = useState(false)
  const [generatingOpen,  setGeneratingOpen]  = useState(false) // morning opener in flight
  const [error,           setError]           = useState(null)
  const [spendInfo,       setSpendInfo]       = useState(null)  // { used, cap }

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // ── Fetch monthly spend for the header budget indicator ──────────────────

  useEffect(() => {
    if (!profile?.company_id) return
    getMonthlyUsageSummary(profile.company_id).then(summary => {
      setSpendInfo({ used: summary.totalCost, cap: summary.cap ?? DEFAULT_SPEND_CAP_USD })
    }).catch(() => {})
  }, [profile?.company_id])

  // ── Generate and save the morning opener ──────────────────────────────────

  const generateMorningOpener = useCallback(async () => {
    if (!profile?.company_id || !profile?.id) return
    setGeneratingOpen(true)
    try {
      const context = await buildAdvisorContext(profile.company_id, { userId: profile.id })

      // Lightweight prompt — 200 tokens max. Reads context, asks one specific question.
      const openerContext = context
        ? `\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`
        : ''

      const h = new Date().getHours()
      const tod = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
      const dayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', hour12: true })
      const ownerFirst = profile?.name?.split(' ')[0] ?? 'there'
      const opener = await callClaude({
        model: HAIKU,
        promptKey:     'MORNING_OPENER_PROMPT',
        stableContext: openerContext,
        messages: [{ role: 'user', content: `Open the check-in. The owner's name is ${ownerFirst} — use ONLY this name in your greeting, no other names. Time context: ${tod} — ${dayStr}.` }],
        maxTokens: 120,
      })

      if (!opener) return

      // Save to DB so it's part of permanent conversation history.
      const { data: row, error: err } = await supabase
        .from('chat_messages')
        .insert({
          company_id: profile.company_id,
          user_id:    profile.id,
          chat_type:  'advisor',
          role:       'assistant',
          content:    opener,
        })
        .select()
        .single()

      if (!err && row) {
        setMessages(prev => [...prev, row])
      }
    } catch {
      // Non-fatal — opener failed, user can still chat normally
    } finally {
      setGeneratingOpen(false)
    }
  }, [profile?.company_id, profile?.id])

  // ── Load history + trigger morning opener ────────────────────────────────

  useEffect(() => {
    if (!profile?.company_id || !profile?.id) return
    let cancelled = false

    ;(async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('company_id', profile.company_id)
        .eq('user_id', profile.id)
        .eq('chat_type', 'advisor')
        .order('created_at', { ascending: true })

      if (cancelled) return

      const history = data ?? []
      setMessages(history)
      setLoading(false)

      // Don't stack greetings. The only gate used to be "first open today", so
      // an owner who didn't reply collected one unanswered hello per day — the
      // live thread had four in a row, which reads as an app talking to itself.
      //
      // An unanswered opener is the last message, from the assistant, and
      // short. A real answer runs much longer, so the length test separates
      // "he greeted me and I ignored it" from "he answered me properly".
      // Imperfect, but it fails in the safe direction: worst case one greeting
      // is skipped, which costs nothing.
      const last = history[history.length - 1]
      const greetingLeftHanging =
        last && last.role === 'assistant' && (last.content ?? '').length < 400

      if (!hasOpenedToday(profile.id) && !dashboardAlreadyGeneratedOpener(profile.id) && !greetingLeftHanging) {
        markOpenedToday(profile.id)
        generateMorningOpener()
      } else {
        // Dashboard already handled it — just mark as opened so the sidebar
        // pulse dot clears correctly.
        markOpenedToday(profile.id)
      }
    })()

    return () => { cancelled = true }
  }, [profile?.company_id, profile?.id, generateMorningOpener])

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, sending, generatingOpen])

  // ── Send message ──────────────────────────────────────────────────────────

  async function handleSend(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending || !profile?.company_id) return

    setError(null)
    setSending(true)

    // 0. Spend cap check — block before any DB write or Claude call.
    try {
      await assertWithinSpendCap(profile.company_id)
    } catch (err) {
      // Store the full error object for spend cap — Composer renders SpendCapBanner.
      setError(isSpendCapExceeded(err) ? err : 'Could not verify usage limits. Please try again.')
      setSending(false)
      return
    }

    // 1. Persist user turn.
    const { data: userRow, error: userErr } = await supabase
      .from('chat_messages')
      .insert({
        company_id: profile.company_id,
        user_id:    profile.id,
        chat_type:  'advisor',
        role:       'user',
        content:    text,
      })
      .select()
      .single()

    if (userErr) {
      setError(`Could not save your message: ${userErr.message}`)
      setSending(false)
      return
    }

    const nextMessages = [...messages, userRow]
    setMessages(nextMessages)
    setInput('')

    // Streaming placeholder — shown while Claude streams the reply.
    // We render it as a special 'streaming' message so the bubble updates live.
    const STREAM_ID = '__streaming__'
    setMessages(prev => [...prev, { id: STREAM_ID, role: 'assistant', content: '' }])

    try {
      // 2. Fresh context — RAG mode when query provided.
      const context = await buildAdvisorContext(profile.company_id, { userId: profile.id, query: text })

      // 3. Build system prompt with context + long-term memory.
      const historySlice = nextMessages.slice(-HISTORY_TURNS_SENT).map(m => ({
        role:    m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))
      const ownerFirst  = profile?.name?.split(' ')[0] ?? 'there'

      // Split the system payload so prompt caching can actually hit.
      //
      // Everything up to and including the cache marker has to be
      // byte-identical between turns or the entry is missed. Semantic search
      // hits, the safety brief and recalled conversations all change with the
      // QUESTION, so folding them in with the instructions — which is what
      // this did — meant a guaranteed miss on every message while the code
      // claimed a 90% saving. Stable material first, per-question material
      // strictly after.
      const {
        knowledge_files: volKnowledge,
        safety_context:  volSafety,
        past_conversations: volPast,
        today_pulse:     volPulse,
        today:           volToday,
        ...stableContext
      } = context ?? {}

      const stableBlock = context
        ? `\n\nOWNER: You are speaking with ${ownerFirst}. Always use this name when addressing them — never use any other person's name from the business context.\n\nBUSINESS_CONTEXT:\n${JSON.stringify(stableContext, null, 2)}`
        : `\n\nOWNER: You are speaking with ${ownerFirst}. Always use this name when addressing them.`

      const volatileParts = []
      // `today` goes here, not in the stable block. It changes daily, and the
      // cache key is the exact stable text — parking it there would throw away
      // the cached prefix every midnight for a value that costs nothing to
      // resend. It leads the volatile section because a date is useless if the
      // model has stopped reading by the time it arrives.
      if (volToday)     volatileParts.push(`TODAY: ${volToday.weekday}, ${volToday.date}`)
      if (volPast)      volatileParts.push(String(volPast))
      if (volPulse)     volatileParts.push(`TODAY_PULSE:\n${JSON.stringify(volPulse, null, 2)}`)
      if (volKnowledge) volatileParts.push(`RELEVANT_FROM_YOUR_LIBRARY:\n${JSON.stringify(volKnowledge, null, 2)}`)
      if (volSafety)    volatileParts.push(`SAFETY_CONTEXT:\n${JSON.stringify(volSafety, null, 2)}`)

      // ⭐ The prompt is no longer sent — only its KEY. ADVISOR_SYSTEM_PROMPT is
      // 21k characters of Solomon and it used to ship to the browser, where
      // anyone could fetch it unauthenticated. The edge function resolves the
      // key and prepends the text to stableContext, so the cached block is the
      // same string it always was and the ~90% caching saving is unchanged.
      const systemVolatile = volatileParts.length ? `\n\n${volatileParts.join('\n\n')}` : undefined

      // 4. Stream the reply — update the placeholder bubble on every chunk.
      //
      // Model choice: cascade router picks Haiku for retrieval-grounded
      // factual lookups (safety_context populated + lookup-style question),
      // Sonnet for everything else. Default bias is Sonnet — strategy
      // questions never get downgraded. See lib/advisorCascade.js.
      const choice = explainModelChoice(text, context)
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(`[advisor] model=${choice.model.split('-')[1]} reason=${choice.reason}`)
      }
      const reply = await streamClaude({
        model:     choice.model,
        promptKey:     'ADVISOR_SYSTEM_PROMPT',
        stableContext: stableBlock,
        systemVolatile,
        messages:  historySlice,
        maxTokens: 2000,
        onChunk: (_chunk, fullText) => {
          setMessages(prev => prev.map(m =>
            m.id === STREAM_ID ? { ...m, content: fullText } : m
          ))
        },
      })

      if (!reply) throw new Error('Empty response from Claude.')

      // 4b. Write down anything durable from this exchange.
      //
      // Deliberately NOT awaited: memory is a background concern and must
      // never sit between the owner and their reply. A failure in here is
      // logged and swallowed — a missed fact is a small loss, a blocked
      // conversation is not.
      rememberFromExchange({
        companyId:        profile.company_id,
        userId:           profile.id,
        userMessage:      text,
        assistantMessage: reply,
      })

      // 5. Persist the completed reply, swap placeholder with the real DB row.
      const { data: assistantRow, error: asstErr } = await supabase
        .from('chat_messages')
        .insert({
          company_id: profile.company_id,
          user_id:    profile.id,
          chat_type:  'advisor',
          role:       'assistant',
          content:    reply,
        })
        .select()
        .single()

      if (asstErr) throw new Error(asstErr.message)
      setMessages(prev => prev.map(m => m.id === STREAM_ID ? assistantRow : m))

      // Index for long-term memory (background, non-blocking).
      indexChatExchange({
        companyId:      profile.company_id,
        userId:         profile.id,
        userMessage:    text,
        assistantReply: reply,
        occurredAt:     new Date(),
      }).catch(() => {})
    } catch (err) {
      // Remove the streaming placeholder on error.
      setMessages(prev => prev.filter(m => m.id !== STREAM_ID))
      setError(isSpendCapExceeded(err) ? err : (err.message ?? 'Something went wrong.'))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function handleSaveMessage(content) {
    if (!profile?.company_id) return
    const title = content.replace(/\s+/g, ' ').trim().slice(0, 80) + (content.length > 80 ? '…' : '')
    await supabase.from('documents').insert({
      company_id:  profile.company_id,
      user_id:     profile.id,
      tool_id:     'solomon',
      title,
      output_data: { content },
    })
  }

  function handleKeyDown(e) {
    // On touch devices, never send via Enter — Enter must always add a newline.
    // Mobile keyboards have no Shift+Enter shortcut, so the desktop pattern
    // would make typing multi-line replies impossible.
    if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice()) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen" style={{ background: '#F6F8F8' }}>
      <Header companyName={company?.name} spendInfo={spendInfo} />

      <div className="flex-1 min-h-0 flex">
       <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {loading ? (
            <LoadingHistory />
          ) : messages.length === 0 && !generatingOpen ? (
            <WelcomeBlock profile={profile} onPick={q => { setInput(q); inputRef.current?.focus() }} />
          ) : (
            <div className="space-y-1.5">
              {messages.map(m => (
                <Bubble key={m.id} role={m.role} content={m.content} streaming={m.id === '__streaming__'} onSave={handleSaveMessage} />
              ))}
              {generatingOpen && <MorningThinkingBubble />}
              {/* ThinkingBubble only shows before first chunk arrives */}
              {sending && !messages.some(m => m.id === '__streaming__' && m.content) && <ThinkingBubble />}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
       </div>

       {/* Everything Solomon can do stays visible; clicking seeds the
           conversation rather than opening another form page. */}
       <SolomonLauncher
         onPick={seed => { setInput(seed); inputRef.current?.focus() }}
       />
      </div>

      <Composer
        ref={inputRef}
        value={input}
        onChange={setInput}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        disabled={sending || generatingOpen}
        error={error}
      />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Header({ companyName, spendInfo }) {
  const dayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  // Budget pill — only show once data is loaded and there's meaningful spend
  const budgetPill = spendInfo ? (() => {
    const pct     = Math.min(spendInfo.used / spendInfo.cap, 1)
    const remaining = Math.max(spendInfo.cap - spendInfo.used, 0)
    const isNearCap = pct >= 0.8
    const color = isNearCap ? 'rgba(251,191,36,0.7)' : 'rgba(13,20,19,0.25)'
    return (
      <div
        className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium"
        style={{ background: 'rgba(13,20,19,0.04)', border: '1px solid rgba(13,20,19,0.09)', color }}
        title={`$${spendInfo.used.toFixed(2)} of $${spendInfo.cap.toFixed(0)} monthly budget used`}
      >
        <span style={{ color }}>
          ${remaining.toFixed(2)} left
        </span>
      </div>
    )
  })() : null

  return (
    <header className="px-4 sm:px-6 py-3 sm:py-3.5 flex-shrink-0" style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(13,20,19,0.08)' }}>
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <span className="text-sm" aria-hidden>💡</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-ink-900 leading-tight">Solomon</h1>
            <p className="text-[11px] text-ink-300 truncate">
              {dayLabel}{companyName ? ` · ${companyName}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {budgetPill}
          <Link
            to="/checkins"
            aria-label="Log check-in"
            className="flex items-center gap-1.5 text-xs font-medium transition-colors px-2.5 sm:px-3 py-1.5 rounded-lg"
            style={{ color: 'rgba(13,20,19,0.45)', background: 'rgba(13,20,19,0.05)', border: '1px solid rgba(13,20,19,0.10)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#0D1413'; e.currentTarget.style.background = 'rgba(13,20,19,0.10)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(13,20,19,0.45)'; e.currentTarget.style.background = 'rgba(13,20,19,0.05)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M8 2v4l2.5 2.5"/>
              <circle cx="8" cy="8" r="6"/>
            </svg>
            <span className="hidden sm:inline">Log check-in</span>
          </Link>
          {/* Online indicator hidden on mobile to keep header tight */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600" aria-hidden />
            <span className="text-xs text-green-700 font-medium">Online</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function LoadingHistory() {
  return (
    <div className="space-y-2 pt-4">
      {[1, 2, 3].map(i => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div
            className="h-12 rounded-2xl animate-pulse"
            style={{
              width: i % 2 === 0 ? '48%' : '62%',
              background: i % 2 === 0 ? 'rgba(180,83,9,0.3)' : 'rgba(13,20,19,0.05)',
            }}
          />
        </div>
      ))}
    </div>
  )
}

function WelcomeBlock({ profile, onPick }) {
  const firstName = profile?.name?.split(' ')[0] ?? 'there'
  const allStarters = [
    "What's the single biggest lever I can pull this quarter?",
    "Walk me through my most important milestone in detail.",
    "Is my pricing leaving money on the table?",
    "What's a risk in my plan I'm probably not seeing?",
    "How do I know if I'm ready to hire another tech?",
    "Where is my cash flow most exposed right now?",
    "What would you cut first if I needed to drop overhead by 15%?",
    "Am I growing fast enough, or just staying busy?",
    "How should I be thinking about my slow season?",
    "What does a $2M version of my business look like?",
  ]
  // Pick 4 fresh starters per session using the day as a seed for variety
  const dayIndex = new Date().getDate() % allStarters.length
  const starters = [...allStarters.slice(dayIndex), ...allStarters.slice(0, dayIndex)].slice(0, 4)
  return (
    <div className="pt-10">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="text-2xl" aria-hidden>💡</span>
        </div>
        <h2 className="text-xl font-bold text-ink-900">Hey {firstName}.</h2>
        <p className="text-sm mt-1 max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(13,20,19,0.45)' }}>
          I know your business, your roadmap, and your goals.
          Ask me anything — or I'll kick things off when you come back tomorrow.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {starters.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(s)}
            className="text-left text-sm transition-colors rounded-xl px-4 py-3"
            style={{ background: 'rgba(13,20,19,0.04)', border: '1px solid rgba(13,20,19,0.09)', color: 'rgba(13,20,19,0.50)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(13,20,19,0.09)'; e.currentTarget.style.color = '#0D1413' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(13,20,19,0.04)'; e.currentTarget.style.color = 'rgba(13,20,19,0.50)' }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function Bubble({ role, content, streaming = false, onSave }) {
  const isUser = role === 'user'
  const [saved, setSaved] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleSave = () => {
    if (saved) return
    setSaved(true)
    onSave?.(content)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative max-w-[78%]">
        {/* Solomon answers in the serif, the owner types in the sans.
            Counsel should look considered rather than look like chat — it is
            the one typographic decision carrying the whole positioning, and a
            reply set in the same face as the input reads as a chatbot. Size
            and line-height are bumped with it, because Instrument Serif runs
            small and needs the air. */}
        <div
          className={`px-4 py-2.5 rounded-[18px] ${
            isUser
              ? 'text-sm leading-relaxed'
              : 'font-serif text-[16.5px] leading-[1.62]'
          }`}
          style={isUser
            ? { background: '#0d1413', color: '#fff', borderBottomRightRadius: '4px' }
            : { background: '#FFFFFF', border: '1px solid rgba(13,20,19,0.09)', color: '#1B2422', borderBottomLeftRadius: '4px' }
          }
        >
          {isUser
            ? <span className="whitespace-pre-wrap">{content}</span>
            : <MarkdownContent text={content} streaming={streaming} />
          }
        </div>
        {/* Save button — only on assistant messages, not while streaming */}
        {!isUser && !streaming && content && (
          <button
            type="button"
            onClick={handleSave}
            title="Save to Documents"
            className="absolute -bottom-5 right-1 flex items-center gap-1 text-[10px] font-medium transition-opacity px-1.5 py-0.5 rounded"
            style={{
              opacity: (hovered || saved) ? 1 : 0,
              color: saved ? '#4ade80' : 'rgba(13,20,19,0.35)',
              pointerEvents: hovered || saved ? 'auto' : 'none',
            }}
          >
            {saved ? (
              <>
                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor"><path d="M13.28 4.22a.75.75 0 010 1.06l-6.5 6.5a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06l2.47 2.47 5.97-5.97a.75.75 0 011.06 0z"/></svg>
                Saved
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2h8l4 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M11 2v4H5V2"/><path d="M5 10h6"/></svg>
                Save
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Lightweight markdown renderer for assistant messages.
 * Handles the patterns Claude actually uses: bold, bullets, numbered lists,
 * headers, inline code, code blocks, and paragraph breaks.
 * No external dependency — keeps the bundle lean.
 */
function MarkdownContent({ text, streaming }) {
  if (!text) {
    return streaming
      ? <span className="inline-block w-2 h-4 bg-white/40 rounded-sm animate-pulse" />
      : null
  }

  const lines   = text.split('\n')
  const nodes   = []
  let i         = 0
  let paraLines = []

  function flushPara() {
    if (!paraLines.length) return
    const joined = paraLines.join(' ')
    nodes.push(<p key={nodes.length} className="mb-2 last:mb-0">{inlineRender(joined)}</p>)
    paraLines = []
  }

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.trim().startsWith('```')) {
      flushPara()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      nodes.push(
        <pre key={nodes.length} className="my-2 px-3 py-2 rounded-lg text-xs font-mono overflow-x-auto"
          style={{ background: 'rgba(13,20,19,0.05)', color: '#1B2422' }}>
          {codeLines.join('\n')}
        </pre>
      )
      i++
      continue
    }

    // H1 / H2 / H3
    const hMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (hMatch) {
      flushPara()
      const level = hMatch[1].length
      const Tag   = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4'
      const cls   = level === 1 ? 'text-base font-bold mt-3 mb-1' : 'text-sm font-bold mt-2 mb-1'
      nodes.push(<Tag key={nodes.length} className={cls} style={{ color: '#0D1413' }}>{inlineRender(hMatch[2])}</Tag>)
      i++
      continue
    }

    // Bullet list item
    const bulletMatch = line.match(/^(\s*[-*+])\s+(.+)/)
    if (bulletMatch) {
      flushPara()
      const items = []
      while (i < lines.length && lines[i].match(/^(\s*[-*+])\s+(.+)/)) {
        const m = lines[i].match(/^(\s*[-*+])\s+(.+)/)
        items.push(<li key={i} className="mb-0.5">{inlineRender(m[2])}</li>)
        i++
      }
      nodes.push(<ul key={nodes.length} className="list-disc list-inside my-1.5 space-y-0.5 text-sm" style={{ color: '#1B2422' }}>{items}</ul>)
      continue
    }

    // Numbered list item
    const numMatch = line.match(/^\d+\.\s+(.+)/)
    if (numMatch) {
      flushPara()
      const items = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+(.+)/)) {
        const m = lines[i].match(/^\d+\.\s+(.+)/)
        items.push(<li key={i} className="mb-0.5">{inlineRender(m[1])}</li>)
        i++
      }
      nodes.push(<ol key={nodes.length} className="list-decimal list-inside my-1.5 space-y-0.5 text-sm" style={{ color: '#1B2422' }}>{items}</ol>)
      continue
    }

    // Blank line — flush paragraph
    if (line.trim() === '') {
      flushPara()
      i++
      continue
    }

    // Normal text — accumulate into paragraph
    paraLines.push(line)
    i++
  }

  flushPara()

  return (
    <div className="prose-invert">
      {nodes}
      {streaming && <span className="inline-block w-1.5 h-3.5 bg-white/50 rounded-sm animate-pulse ml-0.5 align-middle" />}
    </div>
  )
}

/** Render inline markdown: **bold**, *italic*, `code` */
function inlineRender(text) {
  const parts = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
  let last = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2])      parts.push(<strong key={m.index} className="font-bold" style={{ color: '#0D1413' }}>{m[2]}</strong>)
    else if (m[3]) parts.push(<em key={m.index} className="italic">{m[3]}</em>)
    else if (m[4]) parts.push(<code key={m.index} className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: 'rgba(13,20,19,0.06)', color: '#6fd4ae' }}>{m[4]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
}

function MorningThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-[18px] px-4 py-3 flex items-center gap-2"
        style={{ background: 'rgba(13,20,19,0.05)', border: '1px solid rgba(13,20,19,0.09)', borderBottomLeftRadius: '4px' }}
      >
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'rgba(13,20,19,0.30)', animationDelay: `${d}ms` }} />
          ))}
        </div>
        <span className="text-xs" style={{ color: 'rgba(13,20,19,0.30)' }}>Reading your context…</span>
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-[18px] px-4 py-3"
        style={{ background: 'rgba(13,20,19,0.05)', border: '1px solid rgba(13,20,19,0.09)', borderBottomLeftRadius: '4px' }}
      >
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'rgba(13,20,19,0.30)', animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const Composer = forwardRef(function Composer(
  { value, onChange, onKeyDown, onSend, disabled, error },
  ref,
) {
  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0" style={{ background: '#FFFFFF', borderTop: '1px solid rgba(13,20,19,0.08)' }}>
      <div className="max-w-3xl mx-auto">
        {error && (
          typeof error === 'object' && error.code === 'spend_cap_exceeded'
            ? <div className="mb-2"><SpendCapBanner err={error} /></div>
            : (
              <div className="mb-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c' }}>
                {typeof error === 'string' ? error : error.message}
              </div>
            )
        )}
        <form onSubmit={onSend} className="flex items-end gap-2">
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder="Reply to your advisor…"
            className="flex-1 rounded-xl px-4 py-2.5 text-base sm:text-sm resize-none focus:outline-none transition-colors disabled:opacity-50"
            style={{
              minHeight: '44px',
              maxHeight: '160px',
              background: 'rgba(13,20,19,0.04)',
              border: '1px solid rgba(13,20,19,0.10)',
              color: '#0D1413',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
            }}
          />
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Send"
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-ink-900 disabled:opacity-30 transition-opacity flex-shrink-0 min-h-[44px]"
            style={{ background: '#14a67b' }}
          >
            Send
          </button>
        </form>
        {/* Hint: only show desktop shortcut hint on devices with a real keyboard */}
        {/* ⭐ The persistent line — the "Claude can make mistakes" equivalent.
            The per-tool disclaimers in lib/toolDisclaimers.js only ride on tool
            OUTPUTS. Solomon in conversation had nothing, and conversation is
            where someone asks about a termination or a price. Deliberately
            always-on and deliberately dull: it is the constant backdrop, while
            prompts.js handles the sharp, contextual warning on the answers that
            actually carry money. */}
        <p className="text-[10px] mt-2 text-center leading-relaxed" style={{ color: 'rgba(13,20,19,0.32)' }}>
          Solomon works from what you give him. Not professional advice — confirm anything costly.
          <span className="hidden sm:inline"> · Enter to send, Shift+Enter for a new line</span>
        </p>
      </div>
    </div>
  )
})
