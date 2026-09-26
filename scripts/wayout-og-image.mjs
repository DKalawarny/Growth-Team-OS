/**
 * Render the Unstuck Map link-preview image.
 *
 * ⭐⭐ WHY IT HAS TO EXIST. index.html carries a full set of Open Graph tags for
 * Eliv8 OS, and react-helmet-async only manages what it DECLARES. So before
 * this, texting somebody getunstuckmap.com previewed as "Eliv8 OS — an advisor
 * for owners who care how it's run", with Eliv8's description and Eliv8's
 * image — the exact confusion the separate name exists to prevent, delivered
 * before anybody has clicked anything.
 *
 * ⚠️ AND POINTING og:image AT A FILE THAT DOES NOT EXIST IS WORSE THAN
 * INHERITING ONE. A broken image renders as an empty grey card in iMessage and
 * Slack, which reads as a dead link. Overriding the tag and not shipping the
 * file would have traded a wrong preview for no preview.
 *
 * ⚠️ Built from the product's OWN tokens — the paper, the grain, the pinned
 * note, the highlight — rather than a generic card, so the preview and the page
 * are recognisably the same thing.
 *
 *   node scripts/wayout-og-image.mjs
 */
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'

const NAME = 'Unstuck Map'
const LINE = 'You know your situation.\nLet’s sort out the order.'

const page = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;700;800&family=Caveat:wght@700&display=block">
<style>
  html,body{margin:0}
  body{
    width:1200px;height:630px;overflow:hidden;position:relative;
    background:#FFFDF8;
    font-family:Figtree,system-ui,sans-serif;color:#23301F;
  }
  /* The same grain the product uses — one feTurbulence tile at very low
     opacity. It is the difference between a surface and a colour. */
  .grain{position:absolute;inset:0;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.035'/%3E%3C/svg%3E");}
  .wrap{position:relative;padding:78px 86px;height:100%;box-sizing:border-box;
    display:flex;flex-direction:column;justify-content:space-between}
  .mark{display:flex;align-items:center;gap:14px;font-size:27px;font-weight:800;letter-spacing:-.01em}
  .dot{width:17px;height:17px;border-radius:50%;background:#FFB43A}
  h1{font-size:74px;line-height:1.1;font-weight:800;letter-spacing:-.025em;margin:0;max-width:17ch;white-space:pre-line}
  mark{background:linear-gradient(transparent 56%,#FFE566 56%,#FFE566 93%,transparent 93%);
       color:inherit;padding:0 3px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
  .foot{display:flex;align-items:flex-end;justify-content:space-between}
  .foot p{margin:0;font-size:22px;font-weight:600;color:#6B7561}
  /* One pinned note, tilted — the board is the product's whole visual idea. */
  .note{position:absolute;right:74px;bottom:96px;width:250px;padding:22px 22px 26px;
    background:#FFF8E1;transform:rotate(-2.4deg);
    box-shadow:0 10px 26px rgba(35,48,31,.16),0 1px 2px rgba(35,48,31,.2)}
  .note b{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
    color:#6B7561;font-weight:800;margin-bottom:9px}
  .note p{margin:0;font-size:20px;font-weight:700;line-height:1.3}
  .pin{position:absolute;top:-13px;left:50%;margin-left:-13px;width:26px;height:26px;border-radius:50%;
    background:#FFB43A;box-shadow:0 3px 7px rgba(0,0,0,.3),inset 0 -3px 4px rgba(0,0,0,.16)}
</style>
<div class="grain"></div>
<div class="wrap">
  <div class="mark"><span class="dot"></span>${NAME}</div>
  <h1>You know your situation.
<mark>Let’s sort out the order.</mark></h1>
  <div class="foot"><p>getunstuckmap.com</p></div>
</div>
<div class="note"><span class="pin"></span><b>Move 1 · this week</b><p>The one you can start today.</p></div>`

const out = path.resolve(
  path.dirname(new URL(import.meta.url).pathname), '../public/unstuckmap-og.png',
)
fs.writeFileSync('/tmp/og.html', page)

const b = await puppeteer.launch({ headless: 'new' })
const p = await b.newPage()
// ⚠️ 1200x630 at 1x. Facebook, Slack and iMessage all downscale; a 2x render
// doubles the bytes on every preview fetch for no visible gain.
await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
await p.goto('file:///tmp/og.html', { waitUntil: 'networkidle0' })
await p.evaluate(() => document.fonts.ready)
await new Promise(r => setTimeout(r, 400))
await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } })
await b.close()

console.log(`→ ${out}  (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`)
