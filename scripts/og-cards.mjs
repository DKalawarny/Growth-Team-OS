/**
 * ⭐ A LINK-PREVIEW IMAGE FOR EVERY QUESTION PAGE.
 *
 * Before this, every /stuck page and every Eliv8 answer shared with the same
 * site-wide card, so a link to "Should I sell my house to pay off debt?" in a
 * text, a post or under a video previewed as the home page. Now each previews
 * as its own question, which is the whole reason anybody would tap it.
 *
 * GENERATED, never hand-kept, for the same reason as the sitemap: a page added
 * to the content file and forgotten here would share as a grey box. Runs in
 * `npm run build` before vite, writes public/og/ (git-ignored).
 *
 * ⚠️ The look is each product's own: Unstuck's paper and pinned note
 * (scripts/wayout-og-image.mjs), Eliv8's dark card (public/og-default.png).
 * ⚠️ No dashes in anything drawn here (Daniel), and the only words are the
 * page's own question and its own first sentence, so a card can never say
 * something the page does not.
 *
 *   node scripts/og-cards.mjs            all cards
 *   node scripts/og-cards.mjs --sample   three of each, for a look
 */
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import { SITUATIONS } from '../src/content/unstuckSituations.js'
import { ANSWERS } from '../src/content/answers.js'
import { leadLine } from '../src/lib/shareLine.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(ROOT, 'public/og')
const sample = process.argv.includes('--sample')

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')


const FIGTREE = fs.readFileSync(path.join(ROOT, 'scripts/fonts/Figtree[wght].ttf')).toString('base64')
const FONTS = `<style>@font-face{font-family:Figtree;font-weight:300 900;src:url(data:font/ttf;base64,${FIGTREE}) format('truetype')}</style>`
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.035'/%3E%3C/svg%3E")`

const unstuckCard = (q, line) => `<!doctype html><meta charset="utf-8">${FONTS}<style>
  html,body{margin:0}body{width:1200px;height:630px;overflow:hidden;position:relative;background:#FFFDF8;font-family:Figtree,sans-serif;color:#23301F}
  .grain{position:absolute;inset:0;background-image:${GRAIN}}
  .wrap{position:relative;padding:70px 86px 64px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between}
  .mark{display:flex;align-items:center;gap:14px;font-size:27px;font-weight:800}
  .dot{width:17px;height:17px;border-radius:50%;background:#FFB43A}
  h1{font-size:72px;line-height:1.08;font-weight:800;letter-spacing:-.025em;margin:0;max-width:${line ? 700 : 1000}px}
  .foot p{margin:0;font-size:22px;font-weight:600;color:#6B7561}
  .note{position:absolute;right:70px;top:50%;margin-top:-40px;width:290px;padding:24px 24px 28px;background:#FFF8E1;transform:rotate(-2.4deg) translateY(-50%);box-shadow:0 10px 26px rgba(35,48,31,.16),0 1px 2px rgba(35,48,31,.2)}
  .note b{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6B7561;font-weight:800;margin-bottom:10px}
  .note p{margin:0;font-size:23px;font-weight:700;line-height:1.3}
  .pin{position:absolute;top:-13px;left:50%;margin-left:-13px;width:26px;height:26px;border-radius:50%;background:#FFB43A;box-shadow:0 3px 7px rgba(0,0,0,.3),inset 0 -3px 4px rgba(0,0,0,.16)}
</style><div class="grain"></div>
<div class="wrap"><div class="mark"><span class="dot"></span>Unstuck Map</div><h1>${esc(q)}</h1><div class="foot"><p>getunstuckmap.com · free</p></div></div>
${line ? `<div class="note"><span class="pin"></span><b>The short answer</b><p>${esc(line)}</p></div>` : ''}`

const eliv8Card = (q, line) => `<!doctype html><meta charset="utf-8">${FONTS}<style>
  html,body{margin:0}body{width:1200px;height:630px;overflow:hidden;position:relative;font-family:Figtree,sans-serif;color:#F4F6F5;
    background:radial-gradient(900px 500px at 0% 100%,#10261d 0%,transparent 70%),#0d1413}
  .wrap{position:relative;padding:70px 82px 64px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between}
  .mark{font-size:27px;font-weight:700;letter-spacing:.12em}.mark i{font-style:normal;color:#3fb48a}
  .bar{width:64px;height:3px;background:#3fb48a;margin:0 0 30px}
  h1{font-size:66px;line-height:1.1;font-weight:800;letter-spacing:-.02em;margin:0;max-width:1030px}
  h1 span{display:block;color:#8a9290;font-size:.62em;font-weight:700;line-height:1.25;margin-top:22px;letter-spacing:-.01em}
  .foot{margin:0;font-size:22px;font-weight:600;color:#8a9290}
</style><div class="wrap"><div class="mark">ELIV<i>8</i> OS</div>
<div><div class="bar"></div><h1>${esc(q)}${line ? `<span>${esc(line)}</span>` : ''}</h1></div><p class="foot">eliv8os.com/answers</p></div>`

const jobs = [
  ...SITUATIONS.map(s => ({ file: `stuck/${s.slug}.png`, html: unstuckCard(s.question, leadLine(s.answer)) })),
  ...ANSWERS.map(a => ({ file: `answers/${a.slug}.png`, html: eliv8Card(a.question, leadLine(a.answer, 110)) })),
]
const pick = sample ? [...jobs.slice(0, 3), ...jobs.filter(j => j.file.startsWith('answers/')).slice(0, 3)] : jobs

fs.mkdirSync(path.join(OUT, 'stuck'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'answers'), { recursive: true })
const b = await puppeteer.launch({ headless: 'new' })
const p = await b.newPage()
// 1x on purpose: every app that shows a preview downscales it anyway.
await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
for (const j of pick) {
  await p.setContent(j.html, { waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  // Shrink the question until the card holds it: long questions must still fit.
  await p.evaluate(() => {
    const h = document.querySelector('h1'), wrap = document.querySelector('.wrap')
    let size = parseFloat(getComputedStyle(h).fontSize)
    while (wrap.scrollHeight > 630 && size > 34) { size -= 2; h.style.fontSize = size + 'px' }
  })
  await p.screenshot({ path: path.join(OUT, j.file), clip: { x: 0, y: 0, width: 1200, height: 630 } })
}
await b.close()
console.log(`[og] ${pick.length} cards → public/og/`)
