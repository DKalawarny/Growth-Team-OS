/**
 * embed — server-side embedding proxy.
 *
 * WHY THIS EXISTS
 *
 * `src/lib/rag/embeddings.js` read `import.meta.env.VITE_OPENAI_API_KEY` and
 * called api.openai.com straight from the browser. Any VITE_ variable is
 * inlined into the bundle at build time, so setting that key would have
 * shipped it to every visitor and printed it in their network tab — the exact
 * failure that retired VITE_ANTHROPIC_API_KEY from this repo. Because the key
 * was never set, embeddings silently returned null and the whole RAG layer
 * (document search, chat-history recall) has been dead in production.
 *
 * So the key lives here as a Supabase secret and never reaches a browser.
 *
 * Request body:
 *   { texts: string[] }           // 1..128 strings
 *
 * Response 200:
 *   { embeddings: (number[]|null)[] }   // same order as input
 *
 * 401 auth failure · 400 bad input · 503 key not configured · 502 upstream
 *
 * Deploy:
 *   supabase secrets set OPENAI_API_KEY=sk-...
 *   supabase functions deploy embed
 */

// deno-lint-ignore-file no-external-import

import { json, preflight } from '../_shared/cors.ts'
import { authedUser }      from '../_shared/supabase.ts'

const MODEL             = 'text-embedding-3-small'
const MAX_CHARS         = 30_000   // ~8k tokens; the model's ceiling with room to spare
const MAX_INPUTS        = 128      // matches the client's batch size
const UPSTREAM_TIMEOUT  = 30_000

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()

  // Authenticated only. Embeddings cost money per call, so an open endpoint
  // is somebody else's free API.
  try {
    await authedUser(req)
  } catch {
    return json({ error: 'unauthorized' }, 401)
  }

  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) {
    // Distinct from a failure: callers treat this as "retrieval is off" and
    // carry on, exactly as they did when the browser key was missing.
    return json({ error: 'not_configured' }, 503)
  }

  let texts: unknown
  try {
    texts = (await req.json())?.texts
  } catch {
    return json({ error: 'bad_json' }, 400)
  }

  if (!Array.isArray(texts) || texts.length === 0) {
    return json({ error: 'texts must be a non-empty array' }, 400)
  }
  if (texts.length > MAX_INPUTS) {
    return json({ error: `at most ${MAX_INPUTS} inputs per call` }, 400)
  }

  const input = texts.map(t => String(t ?? '').slice(0, MAX_CHARS))

  const ctl = setTimeout(() => {}, 0)
  clearTimeout(ctl)

  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/embeddings', {
      method:  'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model: MODEL, input }),
      signal:  AbortSignal.timeout(UPSTREAM_TIMEOUT),
    })
  } catch (e) {
    return json({ error: 'upstream_unreachable', detail: String(e).slice(0, 200) }, 502)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return json({ error: 'upstream_error', status: res.status, detail: body.slice(0, 300) }, 502)
  }

  const data = await res.json()
  // OpenAI may return results out of order; `index` is authoritative.
  const embeddings: (number[] | null)[] = new Array(input.length).fill(null)
  for (const row of data?.data ?? []) {
    if (typeof row?.index === 'number') embeddings[row.index] = row.embedding
  }

  return json({ embeddings })
})
