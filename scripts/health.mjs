/**
 * health.mjs — check the things that are easy to get wrong by hand.
 *
 * ⚠️ WHY THIS EXISTS. On 2 Sep I told Daniel three things that were false, and
 * all three had the same shape: an empty or minimal result treated as an
 * answer. "I found nothing" reported as "there is nothing".
 *
 *   1. "/about is empty (41 chars)" — I curled without -L and measured the
 *      trailing-slash 301 stub. The page had 2,900 characters.
 *   2. "RESEND_API_KEY is missing" — inferred from a bare 401. It was set. The
 *      response BODY said "API key is invalid", which is a different problem
 *      with a different fix.
 *   3. "the domain is not verified in Resend" — I queried TXT on the apex.
 *      Resend puts DKIM on resend._domainkey.<domain>, so the apex is always
 *      empty. It had been verified for six days.
 *
 * A promise to be more careful does not survive the next tired hour. Encoding
 * the checks does: each one below follows redirects, reads bodies rather than
 * statuses, and queries the record that actually holds the answer.
 *
 * Run: node scripts/health.mjs
 */
import { PUBLIC_PAGES, SITE_URL } from '../src/lib/seo.js'
import { SHOW_PUBLIC_PRICE } from '../src/lib/pricing.js'

let failures = 0
const ok   = (m) => console.log(`  ok    ${m}`)
const bad  = (m) => { failures++; console.log(`  FAIL  ${m}`) }
const note = (m) => console.log(`  --    ${m}`)

// ⚠️ redirect: 'follow' is not optional. The site 301s to trailing slashes, so
// anything that does not follow is measuring a redirect stub.
async function get(url, headers = {}) {
  const res  = await fetch(url, { redirect: 'follow', headers })
  const body = await res.text()
  return { status: res.status, type: res.headers.get('content-type') ?? '', body }
}

console.log('\n── pages ──────────────────────────────────────────────')
for (const p of PUBLIC_PAGES) {
  const url = `${SITE_URL}${p.path}`
  try {
    const { status, body } = await get(url)
    if (status !== 200) { bad(`${p.path} → ${status}`); continue }
    // ⚠️ Prerendering is the point: a page whose text only appears after React
    // mounts is invisible to every assistant that does not run JavaScript.
    // Strip tags and check there is real prose, not just an app shell.
    const text = body.replace(/<script[\s\S]*?<\/script>/gi, '')
                     .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text.length < 400) bad(`${p.path} → only ${text.length} chars of text (not prerendered?)`)
    else ok(`${p.path} (${text.length} chars)`)
  } catch (e) { bad(`${p.path} → ${e.message}`) }
}

console.log('\n── crawl files ────────────────────────────────────────')
{
  const sm = await get(`${SITE_URL}/sitemap.xml`)
  const locs = (sm.body.match(/<loc>/g) ?? []).length
  if (sm.status !== 200) bad(`sitemap.xml → ${sm.status}`)
  else if (!sm.type.includes('xml')) bad(`sitemap.xml served as ${sm.type}`)
  else if (locs !== PUBLIC_PAGES.length) bad(`sitemap has ${locs} urls, PUBLIC_PAGES has ${PUBLIC_PAGES.length}`)
  else ok(`sitemap.xml — ${locs} urls, matches PUBLIC_PAGES`)

  const rb = await get(`${SITE_URL}/robots.txt`)
  if (rb.status !== 200) bad(`robots.txt → ${rb.status}`)
  else if (!rb.body.includes('Sitemap:')) bad('robots.txt does not declare a Sitemap')
  else if (/Disallow: \/answers/.test(rb.body)) bad('robots.txt disallows /answers')
  else ok('robots.txt — sitemap declared, /answers crawlable')

  // ⚠️ llms.txt is what assistants read and repeat. It has been out of step
  // with the site twice: it kept identity targeting after the 29 Aug pass, and
  // on 2 Sep it was still quoting "$147/month" and a "14-day free trial" while
  // no price was published anywhere else.
  const lm = await get(`${SITE_URL}/llms.txt`)
  if (lm.status !== 200) bad(`llms.txt → ${lm.status}`)
  else {
    // ⚠️ Narrow on purpose. The first version matched "$500k–$15M annual
    // revenue" — which describes the CUSTOMER's turnover, not our price — and
    // a check that cries wolf gets ignored, which is worse than no check.
    // Match only price-shaped claims: a figure attached to a billing period,
    // or a trial length.
    const priced = /\$[\d,]+(\.\d+)?\s*(\/|per\s+)\s*(month|mo\b|year|yr\b)/i.test(lm.body)
                || /\d+[-\s]day free trial/i.test(lm.body)
    if (!SHOW_PUBLIC_PRICE && priced) bad('llms.txt quotes a price/trial while SHOW_PUBLIC_PRICE is false')
    else ok(`llms.txt — consistent with SHOW_PUBLIC_PRICE=${SHOW_PUBLIC_PRICE}`)
  }
}

// ⚠️ 2 Sep — /answers was orphaned: 19 prerendered pages, in the sitemap, and
// NOT ONE link to them from anywhere on the site. Orphaned content ranks badly
// however good it is, and an assistant following links off the homepage never
// reaches it. That failure is invisible — every page returns 200 — so it is
// checked here rather than trusted.
console.log('\n── internal links ─────────────────────────────────────')
{
  const home = await get(SITE_URL)
  const n = (home.body.match(/href="\/answers/g) ?? []).length
  n > 0 ? ok(`homepage links to /answers (${n})`) : bad('homepage does not link to /answers — orphaned')

  const trade = await get(`${SITE_URL}/for/plumbers`)
  const t = (trade.body.match(/href="\/answers/g) ?? []).length
  t > 0 ? ok(`/for/plumbers links to answers (${t})`) : bad('/for/plumbers does not link to answers')

  const ans = await get(`${SITE_URL}/answers/should-i-drop-my-price-to-win-a-job`)
  const b = (ans.body.match(/href="\/for\//g) ?? []).length
  b > 0 ? ok(`answer pages link back to trades (${b})`) : bad('answer pages are a cul-de-sac')
}

console.log('\n── crawlers ───────────────────────────────────────────')
for (const [name, ua] of [
  ['Googlebot',     'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
  ['GPTBot',        'GPTBot/1.0'],
  ['PerplexityBot', 'PerplexityBot/1.0'],
]) {
  const r = await get(`${SITE_URL}/answers`, { 'User-Agent': ua })
  r.status === 200 ? ok(`${name} can read /answers`) : bad(`${name} → ${r.status}`)
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`)
process.exit(failures === 0 ? 0 : 1)
