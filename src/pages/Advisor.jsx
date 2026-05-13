import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { callClaude, streamClaude, SONNET, HAIKU } from '../lib/anthropic'
import { pickAdvisorModel, explainModelChoice } from '../lib/advisorCascade'
import { assertWithinSpendCap, isSpendCapExceeded } from '../lib/usage'
import SpendCapBanner from '../components/tools/SpendCapBanner'
import { ADVISOR_SYSTEM_PROMPT, MORNING_OPENER_PROMPT } from '../lib/prompts'
import { buildAdvisorContext } from '../lib/advisorContext'
import { indexChatExchange } from '../lib/rag/chatIndexer'

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

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // ── Generate and save the morning opener ──────────────────────────────────

  const generateMorningOpener = useCallback(async () => {
    if (!profile?.company_id || !profile?.id) return
    setGeneratingOpen(true)
    try {
      const context = await buildAdvisorContext(profile.company_id, { userId: profile.id })

      // Lightweight prompt — 200 tokens max. Reads context, asks one specific question.
      const systemPrompt = context
        ? `${MORNING_OPENER_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`
        : MORNING_OPENER_PROMPT

      const h = new Date().getHours()
      const tod = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
      const dayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', hour12: true })
      const ownerFirst = profile?.name?.split(' ')[0] ?? 'there'
      const opener = await callClaude({
        model: HAIKU,
        systemPrompt,
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

      // Send morning opener if this is the first open today AND the Dashboard
      // hasn't already generated one (the Dashboard card generates + saves it
      // to DB before navigating here, so we'd create a duplicate otherwise).
      if (!hasOpenedToday(profile.id) && !dashboardAlreadyGeneratedOpener(profile.id)) {
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
      const pastBlock   = context?.past_conversations ? `\n\n${context.past_conversations}` : ''
      const contextBlock = context
        ? `\n\nOWNER: You are speaking with ${ownerFirst}. Always use this name when addressing them — never use any other person's name from the business context.${pastBlock}\n\nBUSINESS_CONTEXT:\n${JSON.stringify({ ...context, past_conversations: undefined }, null, 2)}`
        : `\n\nOWNER: You are speaking with ${ownerFirst}. Always use this name when addressing them.`
      const systemPrompt = `${ADVISOR_SYSTEM_PROMPT}${contextBlock}`

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
        systemPrompt,
        messages:  historySlice,
        maxTokens: 2000,
        onChunk: (_chunk, fullText) => {
          setMessages(prev => prev.map(m =>
            m.id === STREAM_ID ? { ...m, content: fullText } : m
          ))
        },
      })

      if (!reply) throw new Error('Empty response from Claude.')

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
    <div className="flex flex-col h-screen" style={{ background: '#0f1117' }}>
      <Header companyName={company?.name} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {loading ? (
            <LoadingHistory />
          ) : messages.length === 0 && !generatingOpen ? (
            <WelcomeBlock profile={profile} onPick={q => { setInput(q); inputRef.current?.focus() }} />
          ) : (
            <div className="space-y-1.5">
              {messages.map(m => (
                <Bubble key={m.id} role={m.role} content={m.content} streaming={m.id === '__streaming__'} />
              ))}
              {generatingOpen && <MorningThinkingBubble />}
              {/* ThinkingBubble only shows before first chunk arrives */}
              {sending && !messages.some(m => m.id === '__streaming__' && m.content) && <ThinkingBubble />}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
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

function Header({ companyName }) {
  const dayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  return (
    <header className="px-4 sm:px-6 py-3 sm:py-3.5 flex-shrink-0" style={{ background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <span className="text-sm" aria-hidden>💡</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white leading-tight">Solomon</h1>
            <p className="text-[11px] text-white/30 truncate">
              {dayLabel}{companyName ? ` · ${companyName}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Link
            to="/checkins"
            aria-label="Log check-in"
            className="flex items-center gap-1.5 text-xs font-medium transition-colors px-2.5 sm:px-3 py-1.5 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M8 2v4l2.5 2.5"/>
              <circle cx="8" cy="8" r="6"/>
            </svg>
            <span className="hidden sm:inline">Log check-in</span>
          </Link>
          {/* Online indicator hidden on mobile to keep header tight */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden />
            <span className="text-xs text-green-400/70 font-medium">Online</span>
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
              background: i % 2 === 0 ? 'rgba(180,83,9,0.3)' : 'rgba(255,255,255,0.07)',
            }}
          />
        </div>
      ))}
    </div>
  )
}

function WelcomeBlock({ profile, onPick }) {
  const firstName = profile?.name?.split(' ')[0] ?? 'there'
  const starters = [
    "What's the single biggest lever I can pull this quarter?",
    "Walk me through my most important milestone in detail.",
    "Is my pricing leaving money on the table?",
    "What's a risk in my plan I'm probably not seeing?",
  ]
  return (
    <div className="pt-10">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="text-2xl" aria-hidden>💡</span>
        </div>
        <h2 className="text-xl font-bold text-white">Hey {firstName}.</h2>
        <p className="text-sm mt-1 max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function Bubble({ role, content, streaming = false }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[78%] px-4 py-2.5 text-sm leading-relaxed rounded-[18px]"
        style={isUser
          ? { background: 'linear-gradient(135deg,#92400e 0%,#b45309 40%,#d97706 100%)', color: '#fff', borderBottomRightRadius: '4px' }
          : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', borderBottomLeftRadius: '4px' }
        }
      >
        {isUser
          ? <span className="whitespace-pre-wrap">{content}</span>
          : <MarkdownContent text={content} streaming={streaming} />
        }
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
          style={{ background: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.8)' }}>
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
      nodes.push(<Tag key={nodes.length} className={cls} style={{ color: 'rgba(255,255,255,0.95)' }}>{inlineRender(hMatch[2])}</Tag>)
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
      nodes.push(<ul key={nodes.length} className="list-disc list-inside my-1.5 space-y-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{items}</ul>)
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
      nodes.push(<ol key={nodes.length} className="list-decimal list-inside my-1.5 space-y-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{items}</ol>)
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
    if (m[2])      parts.push(<strong key={m.index} className="font-bold" style={{ color: 'rgba(255,255,255,0.98)' }}>{m[2]}</strong>)
    else if (m[3]) parts.push(<em key={m.index} className="italic">{m[3]}</em>)
    else if (m[4]) parts.push(<code key={m.index} className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: 'rgba(0,0,0,0.3)', color: '#fbbf24' }}>{m[4]}</code>)
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
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderBottomLeftRadius: '4px' }}
      >
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'rgba(255,255,255,0.3)', animationDelay: `${d}ms` }} />
          ))}
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Reading your context…</span>
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-[18px] px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderBottomLeftRadius: '4px' }}
      >
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'rgba(255,255,255,0.3)', animationDelay: `${d}ms` }} />
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
    <div className="px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0" style={{ background: '#161b22', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-3xl mx-auto">
        {error && (
          typeof error === 'object' && error.code === 'spend_cap_exceeded'
            ? <div className="mb-2"><SpendCapBanner err={error} dark /></div>
            : (
              <div className="mb-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
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
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
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
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-30 transition-opacity flex-shrink-0 min-h-[44px]"
            style={{ background: 'linear-gradient(135deg,#92400e 0%,#b45309 40%,#d97706 100%)' }}
          >
            Send
          </button>
        </form>
        {/* Hint: only show desktop shortcut hint on devices with a real keyboard */}
        <p className="text-[10px] mt-2 text-center hidden sm:block" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  )
})
