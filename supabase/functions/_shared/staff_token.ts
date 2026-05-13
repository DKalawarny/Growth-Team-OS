/**
 * Staff magic-link token — signed payload that authenticates a staff_member
 * via a URL parameter, no Supabase Auth required.
 *
 * Why this exists:
 *   Staff members are field crew. They aren't Supabase users — they don't
 *   sign up, don't have passwords, don't know what an OAuth flow is. They
 *   open a task-assigned email on their phone and want to tap one link to
 *   see their work, upload a photo, mark it done.
 *
 *   So every assignment email contains a URL like:
 *     https://growthos.app/staff/{token}
 *   The token is a signed JSON payload identifying { staff_id, company_id }.
 *   On every request we verify the signature, look up the staff_members row,
 *   confirm the company_id matches the token, and return the data.
 *
 * Format: base64url(payload).base64url(HMAC-SHA256(payload))
 *   payload = { sid, cid, iat }
 *     sid = staff_members.id
 *     cid = company_id (defense-in-depth: caught if a staff row gets moved
 *           between companies and the old token replays)
 *     iat = issued-at (unix seconds)
 *
 * No `exp` in the payload:
 *   Field crew open the same email weeks later. Forcing them to ask the
 *   owner for a "fresh link" every time would kill the UX. Instead,
 *   revocation is handled by:
 *     - Deleting the staff_members row (token verifies but the lookup
 *       returns null, /staff page shows "removed from team")
 *     - staff_members.tokens_valid_after timestamp: if set, ANY token with
 *       iat < tokens_valid_after is rejected. Lets an owner globally rotate
 *       a single staff member's links without deleting the row (useful if
 *       a phone is lost).
 *
 * Signed with STAFF_LINK_SECRET (32+ chars). Set via:
 *   supabase secrets set STAFF_LINK_SECRET=<random-string>
 *
 * Distinct from QBO_OAUTH_STATE_SECRET so a leak of one doesn't compromise
 * the other.
 */

const TOKEN_VERSION = 1  // bump if the payload shape changes

export interface StaffTokenPayload {
  sid: string   // staff_members.id
  cid: string   // company_id
  iat: number   // unix seconds — checked against staff_members.tokens_valid_after
}

function getSecret(): string {
  const s = Deno.env.get('STAFF_LINK_SECRET')
  if (!s || s.length < 32) {
    throw new Error('STAFF_LINK_SECRET env var missing or too short (need 32+ chars)')
  }
  return s
}

// ---- base64url ----
// URL-safe base64 — same helpers as _shared/state.ts. Could DRY into a
// shared util, but they're 8 lines each and inlining keeps each file
// independently auditable.

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
 * Mint a staff magic-link token for { staff_id, company_id }.
 *
 * The token has no built-in expiry. Revocation is enforced by the lookup
 * layer (see verifyStaffToken's expected use in the /staff/* routes).
 */
export async function signStaffToken(sid: string, cid: string): Promise<string> {
  const secret  = getSecret()
  const payload: StaffTokenPayload = {
    sid,
    cid,
    iat: Math.floor(Date.now() / 1000),
  }
  // Prepend a version byte so future payload shapes can be detected without
  // breaking old links. Lives outside the JSON so it's checkable before
  // parse.
  const json   = JSON.stringify(payload)
  const bytes  = new TextEncoder().encode(`v${TOKEN_VERSION}:${json}`)
  const sig    = await hmac(secret, bytes)
  return `${b64urlEncode(bytes)}.${b64urlEncode(sig)}`
}

/**
 * Verify a staff magic-link token. Returns the payload on success.
 *
 * Does NOT check revocation — that's the caller's job (look up the
 * staff_members row by `sid`, confirm it exists, confirm cid matches,
 * confirm payload.iat >= staff_members.tokens_valid_after). Doing it here
 * would couple the token helper to the DB and make it harder to unit-test.
 *
 * Throws on:
 *   - malformed token
 *   - bad signature
 *   - unknown token version (forward-compat guard)
 *   - missing payload fields
 *
 * Throws are loud on purpose — a tampered token is a hard error.
 */
export async function verifyStaffToken(token: string): Promise<StaffTokenPayload> {
  const secret = getSecret()
  const [payloadPart, sigPart] = token.split('.')
  if (!payloadPart || !sigPart) {
    throw new Error('staff-token: malformed')
  }

  const bodyBytes = b64urlDecode(payloadPart)
  const sigBytes  = b64urlDecode(sigPart)

  const valid = await hmacVerify(secret, bodyBytes, sigBytes)
  if (!valid) {
    throw new Error('staff-token: signature mismatch')
  }

  const body = new TextDecoder().decode(bodyBytes)
  // Expect "vN:{json}". Reject anything else — don't try to be clever about
  // unsigned legacy tokens (none exist) or alternate framing.
  const match = body.match(/^v(\d+):(.+)$/s)
  if (!match) throw new Error('staff-token: missing version prefix')
  const version = Number(match[1])
  if (version !== TOKEN_VERSION) {
    throw new Error(`staff-token: unsupported version ${version}`)
  }

  let payload: StaffTokenPayload
  try {
    payload = JSON.parse(match[2])
  } catch {
    throw new Error('staff-token: payload not JSON')
  }

  if (!payload.sid || !payload.cid || typeof payload.iat !== 'number') {
    throw new Error('staff-token: payload missing fields')
  }

  return payload
}
