/**
 * DashboardChat — embedded advisor chat panel on the Dashboard.
 *
 * A full chat interface (bubbles, auto-scroll, voice input, live AI replies)
 * surfaced directly on the dashboard so the owner never has to navigate away
 * to start their day. "Full chat →" in the header opens /advisor for the
 * complete conversation history.
 *
 * On first load each day Claude generates a personalised morning opener based
 * on the owner's full business context. After that it's a normal back-and-forth.
 * All messages are saved to chat_messages so everything shows in /advisor too.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { callClaude, HAIKU } from '../../lib/anthropic'
import { ADVISOR_SYSTEM_PROMPT, MORNING_OPENER_PROMPT } from '../../lib/prompts'
import { buildAdvisorContext } from '../../lib/advisorContext'

// ── localStorage helpers ──────────────────────────────────────────────────────

function todayDate() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}
const OPENER_VERSION = 'v2'   // bump to invalidate cached openers across all users
const morningKey    = uid => `gos_morning_${uid}_${todayDate()}`
const openerTextKey = uid => `gos_opener_text_${OPENER_VERSION}_${uid}_${todayDate()}`

const hasOpenedToday      = uid => { try { return !!localStorage.getItem(morningKey(uid))    } catch { return false } }
const markOpenedToday     = uid => { try { localStorage.setItem(morningKey(uid), '1')        } catch {} }
const getCachedOpenerText = uid => { try { return localStorage.getItem(openerTextKey(uid))   } catch { return null  } }
const setCachedOpenerText = (uid, t) => { try { localStorage.setItem(openerTextKey(uid), t) } catch {} }

// ── Greeting ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
function dayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

const HISTORY_TURNS = 10   // messages sent to Claude for context
const MAX_SHOWN    = 30    // messages rendered in the panel

export default function DashboardChat({ userId, companyId, firstName }) {
  const navigate = useNavigate()

  const [messages,       setMessages]       = useState([])
  const [input,          setInput]          = useState('')
  const [loading,        setLoading]        = useState(true)
  const [generatingOpen, setGeneratingOpen] = useState(false)
  const [sending,        setSending]        = useState(false)
  const [listening,      setListening]      = useState(false)
  const [hasSpeech,      setHasSpeech]      = useState(false)

  const bottomRef      = useRef(null)
  const textareaRef    = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    setHasSpeech(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  // ── Generate morning opener ─────────────────────────────────────────────────

  const generateOpener = useCallback(async () => {
    if (!companyId || !userId) return
    setGeneratingOpen(true)
    try {
      const context = await buildAdvisorContext(companyId, { userId })
      const systemPrompt = context
        ? `${MORNING_OPENER_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`
        : MORNING_OPENER_PROMPT

      const timeOfDay = new Date().toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', hour12: true })
      const opener = await callClaude({
        model: HAIKU,
        systemPrompt,
        messages: [{ role: 'user', content: `Open the check-in. Time context: ${greeting()} — ${timeOfDay}.` }],
        maxTokens: 120,
      })
      if (!opener) return

      const { data: row } = await supabase
        .from('chat_messages')
        .insert({ company_id: companyId, user_id: userId, chat_type: 'advisor', role: 'assistant', content: opener })
        .select().single()

      if (row) {
        setCachedOpenerText(userId, opener)
        setMessages(prev => [...prev, row])
      }
    } catch { /* non-fatal */ } finally {
      setGeneratingOpen(false)
    }
  }, [companyId, userId])

  // ── Load today's messages ───────────────────────────────────────────────────

  useEffect(() => {
    if (!companyId || !userId) return
    let cancelled = false

    ;(async () => {
      // Fetch recent advisor messages — just enough for context, not the whole history
      const since = new Date()
      since.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .eq('chat_type', 'advisor')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })
        .limit(MAX_SHOWN)

      if (cancelled) return

      const todayMsgs = data ?? []
      setMessages(todayMsgs)
      setLoading(false)

      // Fire morning opener if not yet done today
      if (!hasOpenedToday(userId) && !getCachedOpenerText(userId)) {
        // No opener yet today — generate one regardless of existing messages
        // (user may have old messages from manual chat without an opener)
        markOpenedToday(userId)
        generateOpener()
      } else {
        markOpenedToday(userId)
      }
    })()

    return () => { cancelled = true }
  }, [companyId, userId, generateOpener])

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, sending, generatingOpen])

  // ── Send message ──────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !companyId || !userId) return
    setSending(true)
    setInput('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }

    // Save user message
    const { data: userRow } = await supabase
      .from('chat_messages')
      .insert({ company_id: companyId, user_id: userId, chat_type: 'advisor', role: 'user', content: text })
      .select().single()

    if (!userRow) { setSending(false); return }
    const nextMessages = [...messages, userRow]
    setMessages(nextMessages)

    try {
      const context = await buildAdvisorContext(companyId, { userId })
      const systemPrompt = context
        ? `${ADVISOR_SYSTEM_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`
        : ADVISOR_SYSTEM_PROMPT

      const historySlice = nextMessages.slice(-HISTORY_TURNS).map(m => ({
        role:    m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

      const reply = await callClaude({ model: HAIKU, systemPrompt, messages: historySlice, maxTokens: 600 })
      if (!reply) throw new Error('empty')

      const { data: asstRow } = await supabase
        .from('chat_messages')
        .insert({ company_id: companyId, user_id: userId, chat_type: 'advisor', role: 'assistant', content: reply })
        .select().single()

      if (asstRow) setMessages(prev => [...prev, asstRow])
    } catch { /* non-fatal */ } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Voice input ───────────────────────────────────────────────────────────

  function toggleMic() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false
    rec.onresult = e => {
      const t = e.results[0][0].transcript
      setInput(prev => prev ? `${prev} ${t}` : t)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
        }
      }, 0)
    }
    rec.onerror = () => setListening(false)
    rec.onend   = () => setListening(false)
    recognitionRef.current = rec
    rec.start(); setListening(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div /* gradient border wrapper — amber glow */
      className="rounded-2xl p-px flex flex-col"
      style={{
        height: '380px',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.7) 0%, rgba(217,119,6,0.4) 40%, rgba(120,113,108,0.2) 100%)',
        boxShadow: '0 0 40px rgba(245,158,11,0.12), 0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
    <div className="rounded-2xl overflow-hidden flex flex-col flex-1" style={{ background: '#0f1117' }}>

      {/* Header */}
      <div className="px-5 py-3.5 flex items-center gap-3 flex-shrink-0 border-b border-white/5">
        <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-400/40 flex items-center justify-center flex-shrink-0">
          <span className="text-sm" aria-hidden>💡</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Solomon</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400/70 font-medium">Online</span>
            </span>
          </div>
          <p className="text-[10px] text-white/30">
            {greeting()}{firstName ? `, ${firstName}` : ''} · {dayLabel()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/advisor')}
          className="text-xs font-semibold text-brand-400/60 hover:text-brand-400 transition-colors whitespace-nowrap"
        >
          Full chat →
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5" style={{ background: '#0f1117' }}>
        {loading ? (
          <LoadingBubbles />
        ) : messages.length === 0 && !generatingOpen ? (
          <EmptyState firstName={firstName} onPick={q => { setInput(q); textareaRef.current?.focus() }} />
        ) : (
          <>
            {messages.map(m => (
              <Bubble key={m.id} role={m.role} content={m.content} />
            ))}
            {generatingOpen && <ThinkingBubble label="Reading your business…" />}
            {sending        && <ThinkingBubble />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 flex-shrink-0 border-t border-white/5" style={{ background: '#161b22' }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={handleKeyDown}
            disabled={sending || generatingOpen}
            placeholder={listening ? 'Listening… speak now' : 'Reply to your advisor…'}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none transition-colors disabled:opacity-50 ${
              listening
                ? 'border border-red-400 ring-1 ring-red-400/30 bg-red-950/20 text-white placeholder-red-400/60'
                : 'border border-white/10 bg-white/5 text-white placeholder-white/25 focus:border-brand-500/40 focus:bg-white/8'
            }`}
            style={{ minHeight: '42px' }}
          />

          {/* Mic */}
          {hasSpeech && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={sending || generatingOpen}
              title={listening ? 'Stop' : 'Speak'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                listening ? 'bg-red-500 text-white' : 'bg-white/8 text-white/40 hover:bg-white/12 hover:text-white/70'
              }`}
            >
              <MicIcon active={listening} />
            </button>
          )}

          {/* Send */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending || generatingOpen}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white disabled:opacity-30 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#0b6b4e 0%,#0f8763 40%,#14a67b 100%)' }}
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
    </div>
  )
}

// Keep old export name for any stale imports
export { DashboardChat as AdvisorTeaser, DashboardChat as DailyPulse }

// ── Sub-components ────────────────────────────────────────────────────────────

function Bubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'text-white rounded-[18px] rounded-br-[4px]'
            : 'text-white/85 rounded-[18px] rounded-bl-[4px]'
        }`}
        style={isUser
          ? { background: 'linear-gradient(135deg,#0b6b4e 0%,#0f8763 40%,#14a67b 100%)' }
          : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }
        }
      >
        {content}
      </div>
    </div>
  )
}

function ThinkingBubble({ label }) {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-[18px] rounded-bl-[4px] px-3.5 py-2.5 flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
        {label && <span className="text-xs text-white/30">{label}</span>}
      </div>
    </div>
  )
}

function LoadingBubbles() {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex gap-2"><div className="h-14 w-64 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} /></div>
      <div className="flex justify-end"><div className="h-10 w-48 rounded-2xl animate-pulse" style={{ background: 'rgba(180,83,9,0.3)' }} /></div>
      <div className="flex gap-2"><div className="h-10 w-52 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} /></div>
    </div>
  )
}

const STARTERS = [
  "What's the single biggest lever I should pull this week?",
  "Walk me through my most important milestone right now.",
  "Where am I most likely falling behind without realising it?",
  "What's a risk in my plan I'm probably not seeing?",
]

function EmptyState({ firstName, onPick }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-4 text-center">
      <div className="w-10 h-10 rounded-full mb-3 flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
        <span className="text-base" aria-hidden>💡</span>
      </div>
      <p className="text-sm font-semibold text-white mb-0.5">Hey {firstName ?? 'there'}.</p>
      <p className="text-xs text-white/40 mb-4 max-w-xs">I know your business and your goals. Ask me anything to get started.</p>
      <div className="grid grid-cols-2 gap-1.5 w-full max-w-sm">
        {STARTERS.map((s, i) => (
          <button key={i} type="button" onClick={() => onPick(s)}
            className="text-left text-xs text-white/50 rounded-xl px-3 py-2.5 hover:text-white transition-colors leading-snug"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon({ active }) {
  const p = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' }
  return active
    ? <svg {...p}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></svg>
    : <svg {...p}><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10a7 7 0 01-14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}
