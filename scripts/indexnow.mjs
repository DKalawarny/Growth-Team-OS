/**
 * Tell Bing (and the other IndexNow engines) every page we publish, right after
 * a deploy. ChatGPT search runs on Bing, and an assistant is the only channel
 * that has ever brought either product a stranger (18 Oct 2026).
 *
 * ⚠️ The key is not a secret: IndexNow proves ownership by fetching
 * https://<host>/<key>.txt and comparing. That file is public/<key>.txt.
 * ⚠️ Never fails a deploy. A ping that does not land is retried next deploy.
 *
 * Run: node scripts/indexnow.mjs   (npm run deploy runs it after upload)
 */
import fs from 'fs'

const KEY = '8cc28190803ba086f00246f5fc7ab890'
const SITES = [
  { host: 'getunstuckmap.com', sitemap: 'public/sitemap-unstuckmap.xml' },
  { host: 'eliv8os.com', sitemap: 'public/sitemap.xml' },
]

for (const { host, sitemap } of SITES) {
  try {
    const urls = [...fs.readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(m => m[1].trim())
      .filter(u => new URL(u).hostname === host)
    if (!urls.length) { console.log(`[indexnow] ${host}: no urls in ${sitemap}, skipped`); continue }
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: KEY, keyLocation: `https://${host}/${KEY}.txt`, urlList: urls }),
    })
    // 200 and 202 both mean received. 403 is a key the engine could not read.
    console.log(`[indexnow] ${host}: ${urls.length} urls → ${res.status} ${res.statusText}`)
  } catch (err) {
    console.log(`[indexnow] ${host}: not sent (${err.message})`)
  }
}
