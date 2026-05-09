/**
 * OAuth state token — signed payload used to carry user context through the
 * Intuit redirect dance.
 *
 * Why we need this:
 *   1. Browser calls qbo-oauth-start with a Supabase JWT (we know who they are).
 *   2. qbo-oauth-start redirects the owner to Intuit's authorize page with a
 *      `state` query param.
 *   3. Owner authorises. Intuit redirects to our callback URL with `code` +
 *      `state`. The callback gets NO Supabase JWT — it's just a public
 *      redirect from intuit.com.
 *   4. We need to recover the user context from `state`. We can't trust
 *      anything in `state` unless we signed it ourselves.
 *
 * Format: base64url(JSON payload) + '.' + base64url(HMAC-SHA256(payload)).
 *   payload = { uid, cid, exp } — user_id, company_id, unix expiry.
 *
 * Signed with a shared secret stored in the `QBO_OAUTH_STATE_SECRET` env var
 * on the Supabase project. The secret never leaves the server.
 *
 * Short TTL (10 min) caps replay attacks — even if a state token leaks, it
 * expires before it's useful.
 */

const STATE_TTL_SECONDS = 60 * 10   // 10 minutes

interface StatePayload {
  uid: string   // user_id (auth.users.id)
  cid: string   // company_id
  exp: number   // unix seconds
}

function getSecret(): string {
  const s = Deno.env.get('QBO_OAUTH_STATE_SECRET')
  if (!s || s.length < 32) {
    throw new Error('QBO_OAUTH_STATE_SECRET env var missing or too short (need 32+ chars)')
  }
  return s
}

// ---- base64url ----
// OAuth state gets URL-encoded; we use base64url (not standard base64) to
// avoid '+' / '/' / '=' surviving through an escape-and-reparse cycle.

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ---- HMAC ----

async function importKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function hmac(secret: string, data: Uint8Array): Promise<Uint8Array> {
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, data)
  return new Uint8Array(sig)
}

async function hmacVerify(secret: string, data: Uint8Array, sig: Uint8Array): Promise<boolean> {
  const key = await importKey(secret)
  return await crypto.subtle.verify('HMAC', key, sig, data)
}

// ---- sign / verify ----

/**
 * Mint a signed state token for the given user + company. Valid for
 * STATE_TTL_SECONDS from now.
 */
export async function signState(uid: string, cid: string): Promise<string> {
  const secret = getSecret()
  const payload: StatePayload = {
    uid,
    cid,
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  }
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
  const sig = await hmac(secret, payloadBytes)
  return `${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`
}

/**
 * Verify a state token. Returns the payload on success, throws on failure.
 *
 * Throws are intentional — a bad state token is a hard error; the caller
 * should stop processing and surface it. Callers should never ignore a
 * verifyState failure, so we don't provide a "soft" null-on-fail version.
 */
export async function verifyState(token: string): Promise<StatePayload> {
  const secret = getSecret()
  const [payloadPart, sigPart] = token.split('.')
  if (!payloadPart || !sigPart) {
    throw new Error('state: malformed token')
  }

  const payloadBytes = b64urlDecode(payloadPart)
  const sigBytes     = b64urlDecode(sigPart)

  const valid = await hmacVerify(secret, payloadBytes, sigBytes)
  if (!valid) {
    throw new Error('state: signature mismatch')
  }

  let payload: StatePayload
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes))
  } catch {
    throw new Error('state: payload not JSON')
  }

  if (!payload.uid || !payload.cid || !payload.exp) {
    throw new Error('state: payload missing fields')
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('state: token expired')
  }

  return payload
}
