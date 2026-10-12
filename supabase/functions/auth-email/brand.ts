/**
 * Which product an auth email belongs to, read off the link it will send
 * somebody back to.
 *
 * 🔴 ONE SUPABASE PROJECT SERVES TWO PRODUCTS, SO ONE SENDER SERVED BOTH. Every
 * reset went out from Supabase's built in mailer as "Supabase Auth". A family
 * tester, 9 Oct: "kinda looks like a spam email. opened it anyways." Somebody
 * arriving at Unstuck in a bad week will not open it anyways.
 *
 * ⭐ THE HOST IS PARSED, NEVER SUBSTRING MATCHED. `getunstuckmap.com.evil.io`
 * contains the right words and is somebody else's server. The /wayout prefix
 * only counts on a host that is ours, because that is the only place it means
 * the second product (see WAYOUT_BASE in src/lib/wayout/brand.js).
 *
 * ⚠️ Pure: no Deno APIs, so vitest imports it directly.
 */

export type AuthBrand = 'unstuck' | 'eliv8'

const UNSTUCK_HOSTS = ['getunstuckmap.com', 'www.getunstuckmap.com']
const ELIV8_HOSTS = ['eliv8os.com', 'www.eliv8os.com', 'localhost', '127.0.0.1']

export function brandFor(redirectTo: string | null | undefined): AuthBrand {
  if (!redirectTo) return 'eliv8'
  let url: URL
  try { url = new URL(redirectTo) } catch { return 'eliv8' }
  const host = url.hostname.toLowerCase()
  if (UNSTUCK_HOSTS.includes(host)) return 'unstuck'
  if (ELIV8_HOSTS.includes(host) && /^\/wayout(\/|$)/.test(url.pathname)) return 'unstuck'
  return 'eliv8'
}

/**
 * Where the link in the email points. On our own domains it goes through the
 * site (worker/index.js hands /auth/v1/verify on to Supabase), so the address
 * in the email matches the sender.
 *
 * 🔴 12 Oct: a sign in link from hello@getunstuckmap.com that pointed at
 * <ref>.supabase.co landed in Hotmail's junk. A sender on one domain with a
 * link on another is what a phishing email looks like.
 *
 * ⚠️ Anything else (localhost, a preview, a host we do not know) keeps the
 * direct address, because nothing is there to pass the link on.
 */
const OWN_HOSTS: Record<string, string> = {
  'getunstuckmap.com': 'https://getunstuckmap.com',
  'www.getunstuckmap.com': 'https://getunstuckmap.com',
  'eliv8os.com': 'https://eliv8os.com',
  'www.eliv8os.com': 'https://eliv8os.com',
}

export function linkBaseFor(redirectTo: string | null | undefined, fallback: string): string {
  if (!redirectTo) return fallback
  let url: URL
  try { url = new URL(redirectTo) } catch { return fallback }
  if (url.protocol !== 'https:') return fallback
  return OWN_HOSTS[url.hostname.toLowerCase()] ?? fallback
}
