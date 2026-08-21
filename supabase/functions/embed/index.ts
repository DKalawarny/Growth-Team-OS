/**
 * embed — text embeddings, generated in this function, with no vendor.
 *
 * WHAT CHANGED AND WHY
 *
 * This started as an OpenAI proxy, written because
 * `src/lib/rag/embeddings.js` read import.meta.env.VITE_OPENAI_API_KEY and
 * called api.openai.com straight from the browser — Vite inlines VITE_ vars,
 * so that key would have shipped to every visitor. Moving it server-side
 * fixed the leak but kept the vendor.
 *
 * Supabase runs `gte-small` inside the Edge Runtime itself, so the vendor
 * goes too: no API key, no outbound request, no billing relationship, no
 * account tied to an email that is about to change hands. Embedding runs on
 * CPU time already being paid for.
 *
 * The tradeoff, stated plainly: gte-small is 384 dimensions against
 * text-embedding-3-small's 1536 — a smaller, older model. For one business's
 * document library, tens of files rather than millions, that difference is
 * unlikely to be visible. It was worth switching now because nothing had ever
 * been embedded, so there was no corpus to redo. See migration 029.
 *
 * Request body:
 *   { texts: string[] }                    // 1..128 strings
 *
 * Response 200:
 *   { embeddings: (number[]|null)[] }      // 384-dim, input order preserved
 *
 * 401 auth failure · 400 bad input · 500 inference failure
 *
 * Deploy:
 *   supabase functions deploy embed
 *
 * No secret required. If OPENAI_API_KEY is still set from before, it is now
 * unused and should be removed:  supabase secrets unset OPENAI_API_KEY
 */

// deno-lint-ignore-file no-external-import

import { json, preflight } from '../_shared/cors.ts'
import { authedUser }      from '../_shared/supabase.ts'

const MAX_CHARS  = 8_000   // gte-small handles ~512 tokens; the chunker stays well under
const MAX_INPUTS = 128

// One session reused across invocations. Constructing it per request would
// pay model start-up on every call.
const session = new Supabase.ai.Session('gte-small')

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight()

  // Authenticated only. Inference is CPU time on a shared runtime, so an open
  // endpoint is somebody else's compute budget.
  try {
    await authedUser(req)
  } catch {
    return json({ error: 'unauthorized' }, 401)
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

  const inputs = texts.map(t => String(t ?? '').slice(0, MAX_CHARS))

  try {
    // Sequential on purpose. These run on the function's own CPU, so firing
    // 128 at once competes with itself rather than going faster.
    //
    // mean_pool + normalize give a unit-length vector, which is what cosine
    // distance in Postgres expects — the `<=>` operator and the thresholds in
    // the search RPCs both assume normalised input.
    const embeddings: (number[] | null)[] = []
    for (const input of inputs) {
      if (!input.trim()) { embeddings.push(null); continue }
      const vec = await session.run(input, { mean_pool: true, normalize: true })
      embeddings.push(vec as number[])
    }
    return json({ embeddings })
  } catch (e) {
    return json({ error: 'inference_failed', detail: String(e).slice(0, 300) }, 500)
  }
})
