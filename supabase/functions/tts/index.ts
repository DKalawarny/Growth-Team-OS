/**
 * tts — Solomon's voice, via ElevenLabs.
 *
 * Mirrors the proven shape from kinwove's /api/tts (server.js), because that
 * one has already survived the failure this one will eventually hit: on 1 Aug
 * a batch job drained the ElevenLabs quota and every "Listen" in kinwove fell
 * back to the device's robot voice. Degraded, never broken. Same here.
 *
 * ⚠️ SEPARATE ELEVENLABS ACCOUNT FROM KINWOVE. Two products sharing one credit
 * pool means Eliv8 OS usage silently eats kinwove's Bible narration, and the
 * product you are not looking at is the one that breaks. This function must be
 * given its own key.
 *
 * ⚠️ ELEVENLABS FREE TIER DOES NOT PERMIT COMMERCIAL USE — Starter ($6/mo,
 * 30k credits) is the first tier with a commercial licence. Free is fine while
 * building; it is not fine once a paying or pilot user can hear it.
 *
 * Budget reality, so nobody is surprised: 30k credits is ~30k characters, and a
 * Solomon reply runs about 550. That is roughly 54 spoken replies A MONTH across
 * every user. Hence a Listen button the owner presses, never auto-speak.
 *
 * Env:
 *   ELEVENLABS_API_KEY   required — its own account, not kinwove's
 *   TTS_MONTHLY_CAP      optional — request ceiling per calendar month
 *   TTS_VOICE_ID         optional — override the default voice
 */

// deno-lint-ignore-file no-external-import
import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser } from '../_shared/supabase.ts'

const ELEVEN_KEY = Deno.env.get('ELEVENLABS_API_KEY') ?? ''

// ⭐ NOT kinwove's James. That voice is "deep, cinematic" — right for reading
// scripture, wrong for a man telling you your cash is tight in week nine. The
// prompt spent real effort making Solomon sound like someone fifteen years down
// the road who still runs a business; a narrator voice would undo it.
// Override with TTS_VOICE_ID without a redeploy.
const DEFAULT_VOICE_ID = Deno.env.get('TTS_VOICE_ID') ?? 'pqHfZKP75CvOlQylNhV4' // Bill — warm, grounded, mature male

// Turbo: cheaper per character and fast enough that the reply starts speaking
// while the owner is still looking at it.
const MODEL_ID = 'eleven_turbo_v2_5'

// Requests per calendar month. In-memory, so it resets on redeploy — a coarse
// backstop against a runaway loop, NOT the real budget. The real budget is the
// ElevenLabs plan itself, which returns 401/429 when it runs out.
const MONTHLY_CAP = parseInt(Deno.env.get('TTS_MONTHLY_CAP') ?? '400', 10)
let capMonth = ''
let capCount = 0

// ElevenLabs bills per character, so what we send is what we pay for. Markdown
// is not just noise to a listener — "**" read aloud is gibberish — and it is
// billable gibberish.
const MAX_CHARS = 4000

function speakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')       // code fences: never read aloud
    .replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/_{1,2}/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')          // list markers, not the numbers in a sentence
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/—/g, ', ')
    .replace(/…/g, '.')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\.(\s*\.)+/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST')    return json({ error: 'POST only' }, 405)

  try {
    // Authenticated only. An open TTS endpoint is a stranger spending your
    // ElevenLabs credits, and the bill arrives before the alert does.
    await authedUser(req)

    if (!ELEVEN_KEY) {
      // 503 rather than 500: the client treats this as "voice unavailable" and
      // falls back to the device voice instead of showing an error.
      return json({ error: 'Voice is not configured yet.' }, 503)
    }

    const month = new Date().toISOString().slice(0, 7)
    if (month !== capMonth) { capMonth = month; capCount = 0 }
    if (capCount >= MONTHLY_CAP) {
      return json({ error: 'Monthly voice limit reached.', code: 'tts_cap' }, 429)
    }

    const body = await req.json().catch(() => ({})) as { text?: string; voiceId?: string }
    const text = speakable(String(body.text ?? ''))
    if (!text) return json({ error: 'Nothing to read.' }, 400)

    capCount++

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(body.voiceId || DEFAULT_VOICE_ID)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key':   ELEVEN_KEY,
          'content-type': 'application/json',
          'accept':       'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: {
            // Steady rather than theatrical. He is talking, not performing.
            stability:         0.5,
            similarity_boost:  0.75,
            style:             0.0,
            use_speaker_boost: true,
          },
        }),
      },
    )

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '')
      console.error('[tts] elevenlabs', upstream.status, detail.slice(0, 300))
      // 401/429 from ElevenLabs means the plan is out of credits or the key is
      // wrong. Both are "voice unavailable", not "the app is broken".
      const outOfCredit = upstream.status === 401 || upstream.status === 429
      return json(
        { error: outOfCredit ? 'Voice is unavailable right now.' : `Voice error ${upstream.status}`, code: outOfCredit ? 'tts_unavailable' : 'tts_error' },
        outOfCredit ? 503 : 502,
      )
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type':  'audio/mpeg',
        'cache-control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tts]', message)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401 : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
