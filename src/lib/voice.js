/**
 * Talking to Solomon, and Solomon talking back.
 *
 * Two unrelated halves that happen to sit next to each other:
 *
 *   speak()      text → ElevenLabs, via the `tts` edge function. Costs money
 *                per character, so it only ever runs when the owner presses
 *                Listen. Falls back to the device voice when the plan is out
 *                of credits — degraded, never broken. That exact failure took
 *                kinwove's audio down on 1 Aug, so it is designed for here.
 *
 *   listen()     microphone → text, using the browser's own speech
 *                recognition. Free, no new billing relationship, works today.
 *                ⚠️ On Chrome this ships the audio to Google for
 *                transcription — which is a data processor, and /privacy and
 *                /security both claim their vendor lists are complete.
 */

import { supabase } from './supabase'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// ── Solomon speaking ──────────────────────────────────────────────────────────

let currentAudio = null

/** True while something is playing, so the UI can offer Stop. */
export function isSpeaking() {
  return !!currentAudio && !currentAudio.paused
}

export function stopSpeaking() {
  try { currentAudio?.pause() } catch { /* already gone */ }
  if (currentAudio?.src?.startsWith('blob:')) URL.revokeObjectURL(currentAudio.src)
  currentAudio = null
  try { window.speechSynthesis?.cancel() } catch { /* not supported */ }
}

/**
 * Read `text` aloud.
 *
 * @returns {Promise<'eleven'|'device'|'none'>} which voice actually spoke, so
 *   the caller can be honest in the UI rather than pretending.
 */
export async function speak(text, { onEnd } = {}) {
  stopSpeaking()
  const clean = String(text ?? '').trim()
  if (!clean) return 'none'

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
        'apikey':        SUPABASE_ANON_KEY,
        'content-type':  'application/json',
      },
      body: JSON.stringify({ text: clean }),
    })

    if (res.ok) {
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudio = audio
      audio.onended = () => { stopSpeaking(); onEnd?.() }
      await audio.play()
      return 'eleven'
    }

    // 503 = no key, or the plan is out of credits. Not an error the owner
    // should have to read about — just a lesser voice.
    console.warn('[voice] tts unavailable:', res.status)
  } catch (err) {
    console.warn('[voice] tts failed:', err)
  }

  return speakWithDevice(clean, onEnd) ? 'device' : 'none'
}

/**
 * The fallback. Every modern browser has a built-in voice; it is worse, and it
 * is free, and it means the feature never simply stops working.
 */
function speakWithDevice(text, onEnd) {
  if (!('speechSynthesis' in window)) return false
  try {
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate  = 1.0
    utter.pitch = 1.0
    utter.onend = () => onEnd?.()
    window.speechSynthesis.speak(utter)
    return true
  } catch {
    return false
  }
}

// ── The owner speaking ────────────────────────────────────────────────────────

/**
 * Is dictation available at all? Safari and Chrome expose it under different
 * names, and Firefox does not expose it — so the button has to be able to hide
 * rather than sit there doing nothing.
 */
export function dictationSupported() {
  return typeof window !== 'undefined'
    && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/**
 * Start dictating. Returns a stop() function.
 *
 * ⚠️ `interimResults` is on so the composer fills in as he speaks — without it
 * you stare at an empty box wondering whether the microphone is on, which is
 * the difference between a feature people use and one they try once.
 *
 * @param {(text: string, isFinal: boolean) => void} onText
 * @param {(err: string) => void} [onError]
 */
export function listen(onText, onError) {
  const Impl = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Impl) { onError?.('This browser cannot do dictation.'); return () => {} }

  const rec = new Impl()
  rec.lang           = 'en-CA'
  rec.continuous     = true
  rec.interimResults = true

  let finalText = ''

  rec.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript
      if (event.results[i].isFinal) finalText += chunk
      else interim += chunk
    }
    onText(`${finalText}${interim}`.trim(), false)
  }

  rec.onerror = (event) => {
    // 'no-speech' and 'aborted' are ordinary — he paused, or pressed stop.
    // Reporting those as errors trains people to ignore the error line.
    if (event.error === 'no-speech' || event.error === 'aborted') return
    onError?.(
      event.error === 'not-allowed'
        ? 'Microphone access was blocked. Allow it in your browser and try again.'
        : `Dictation stopped: ${event.error}`,
    )
  }

  rec.onend = () => onText(finalText.trim(), true)

  try { rec.start() } catch { /* already running */ }

  return () => { try { rec.stop() } catch { /* already stopped */ } }
}
