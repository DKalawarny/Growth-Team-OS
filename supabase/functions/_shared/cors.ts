/**
 * CORS helpers for browser-origin calls to our Edge Functions.
 *
 * We're not running behind a proxy, so the function itself has to handle the
 * preflight OPTIONS request and echo back the right Allow headers.
 *
 * Permissive by design — these are authenticated Edge Functions; auth is
 * enforced by verifying the Supabase JWT inside the handler, not by origin.
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

/**
 * Short-circuit OPTIONS preflights before the real handler runs.
 * Call this at the top of every Edge Function:
 *   if (req.method === 'OPTIONS') return preflight()
 */
export function preflight(): Response {
  return new Response('ok', { headers: corsHeaders })
}

/**
 * Wrap a JSON body in a standard response (status + CORS + content-type).
 * Keeps every function's success/error paths symmetric.
 */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
