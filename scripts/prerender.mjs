/**
 * scripts/prerender.mjs — post-build prerender for the public marketing routes.
 *
 * Why this exists:
 *   GrowthOS is a Vite SPA. Per-page <Helmet> meta and JSON-LD schemas only
 *   render after React mounts. Crawlers without JS execution (Slack/iMessage
 *   link previews, some AI training crawlers, legacy SEO audit tools) see
 *   only the fallback head in index.html. Prerendering closes that gap by
 *   producing a static HTML snapshot of each public marketing page after
 *   Helmet has finished writing meta + schemas to <head>.
 *
 * What it does:
 *   1. Spawns `vite preview` against ./dist
 *   2. Drives a real headless Chrome to each route
 *   3. Waits for react-helmet-async to flush its managed tags (data-rh="true")
 *   4. Writes the rendered HTML to dist/<route>/index.html
 *
 * Scope (deliberate):
 *   Only the three public, indexable routes from src/lib/seo.js → PUBLIC_PAGES.
 *   Auth-gated and noindex routes (/dashboard, /tools/*, /admin, /onboarding,
 *   /settings, /login, /signup) are NOT prerendered — they should never appear
 *   in a search index, and prerendering them would also try to talk to Supabase.
 */

import { spawn } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import puppeteer from 'puppeteer'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const PROJECT    = path.resolve(__dirname, '..')
const DIST       = path.join(PROJECT, 'dist')
const PORT       = 4173 // vite preview default
const HOST       = `http://127.0.0.1:${PORT}`

// Keep this in sync with PUBLIC_PAGES in src/lib/seo.js.
//
// Signal: every page sets a unique <title> via Helmet. We wait for
// document.title to contain `titleContains` before snapshotting. That's
// the most reliable "Helmet flushed for this page" signal because:
//   - title is a single element (not a list), so dedup ambiguity doesn't apply
//   - react-helmet-async always rewrites it via document.title = …
//   - no schema-shape coupling per route
const ROUTES = [
  { path: '/',                titleContains: 'AI advisor + business tools' },
  { path: '/pricing',         titleContains: 'Pricing — GrowthOS' },
  { path: '/crm',             titleContains: 'CRM for contractors' },
  { path: '/about',           titleContains: 'About GrowthOS' },
  { path: '/security',        titleContains: 'Security & data handling' },
  { path: '/privacy',         titleContains: 'Privacy policy' },
  { path: '/free-gbp-audit',  titleContains: 'Free Google Business Profile audit' },

  // Comparison pages
  { path: '/vs/knowify',        titleContains: 'GrowthOS vs Knowify' },
  { path: '/vs/jobber',         titleContains: 'GrowthOS vs Jobber' },
  { path: '/vs/housecall-pro',  titleContains: 'GrowthOS vs Housecall Pro' },
  { path: '/vs/buildertrend',   titleContains: 'GrowthOS vs Buildertrend' },

  // Trade-specific pages
  { path: '/for/plumbers',      titleContains: 'GrowthOS for plumbers' },
  { path: '/for/electricians',  titleContains: 'GrowthOS for electricians' },
  { path: '/for/hvac',          titleContains: 'GrowthOS for HVAC contractors' },
  { path: '/for/roofing',       titleContains: 'GrowthOS for roofers' },
  { path: '/for/demolition',    titleContains: 'GrowthOS for demolition contractors' },
  { path: '/for/landscaping',   titleContains: 'GrowthOS for landscaping contractors' },
]

async function waitForServer(url, maxMs = 30_000) {
  const start = Date.now()
  let lastErr
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(url, { method: 'GET' })
      if (r.ok || r.status === 404) return // any HTTP response means it's up
    } catch (err) {
      lastErr = err
    }
    await sleep(250)
  }
  throw new Error(`Preview server never came up at ${url}: ${lastErr?.message ?? 'timeout'}`)
}

async function main() {
  if (!existsSync(DIST)) {
    throw new Error(`dist/ not found at ${DIST} — run \`vite build\` before prerendering`)
  }

  console.log('[prerender] starting vite preview…')
  const preview = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: PROJECT, stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
  )
  preview.stdout.on('data', (d) => process.stdout.write(`[preview] ${d}`))
  preview.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`))

  // If preview dies before we're done, fail loudly.
  preview.on('exit', (code, signal) => {
    if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
      console.error(`[preview] exited unexpectedly (code=${code}, signal=${signal})`)
    }
  })

  let browser
  try {
    await waitForServer(HOST)

    console.log('[prerender] launching headless Chrome…')
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    for (const { path: route, titleContains } of ROUTES) {
      console.log(`[prerender] ${route}`)
      const page = await browser.newPage()

      // Surface page-side console errors so hydration mismatches don't slip
      // through silently.
      page.on('pageerror', (err) => console.error(`[page error] ${route} →`, err.message))
      page.on('console', (msg) => {
        if (msg.type() === 'error') console.error(`[page console] ${route} →`, msg.text())
      })

      await page.goto(HOST + route, { waitUntil: 'networkidle0', timeout: 60_000 })

      // Wait for Helmet to flush by polling document.title for the route's
      // signature substring. react-helmet-async rewrites the title in place
      // (document.title = ...), so this is a single, deterministic source
      // of truth for "the page-level Helmet has run."
      await page.waitForFunction(
        (needle) => document.title.includes(needle),
        { timeout: 20_000 },
        titleContains,
      )

      // One more rAF tick so any final Helmet flush settles before we serialize.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())))

      // De-dupe <head>. The static index.html ships a fallback head; Helmet
      // appends its own copy of every overridden tag, so a naive snapshot
      // contains both. Crawlers reading the first occurrence would see the
      // home-page meta on /pricing and /crm. Keep only the last instance of
      // each unique name/property/rel — that's the Helmet-injected (correct)
      // version. Title and JSON-LD scripts get the same treatment.
      await page.evaluate(() => {
        const head = document.head

        // <title>: keep only the FIRST. react-helmet-async sets document.title
        // (which mutates the existing static title element rather than creating
        // a new one), so the first <title> ends up with the page-specific text;
        // any later duplicates are stale carryover from the static head.
        const titles = head.querySelectorAll('title')
        for (let i = 1; i < titles.length; i++) titles[i].remove()

        // <link rel="canonical">: keep only the last
        const canonicals = head.querySelectorAll('link[rel="canonical"]')
        for (let i = 0; i < canonicals.length - 1; i++) canonicals[i].remove()

        // <meta name=… | property=…>: keep only the last per key.
        // Skips charset / viewport / non-keyed meta which we never duplicate.
        const lastByKey = new Map()
        for (const m of head.querySelectorAll('meta')) {
          const key = m.getAttribute('name') || m.getAttribute('property')
          if (!key) continue
          if (lastByKey.has(key)) lastByKey.get(key).remove()
          lastByKey.set(key, m)
        }

        // <script type="application/ld+json">: dedupe by exact content. The
        // static head ships an Organization schema; Helmet may emit the same
        // one again. We want one copy, not two.
        const seenLd = new Set()
        for (const s of head.querySelectorAll('script[type="application/ld+json"]')) {
          const norm = s.textContent.replace(/\s+/g, '')
          if (seenLd.has(norm)) s.remove()
          else seenLd.add(norm)
        }
      })

      const html = await page.content()

      const outDir = route === '/' ? DIST : path.join(DIST, route.replace(/^\//, ''))
      await mkdir(outDir, { recursive: true })
      const outPath = path.join(outDir, 'index.html')
      await writeFile(outPath, html, 'utf8')
      console.log(`[prerender]   → ${path.relative(PROJECT, outPath)}`)

      await page.close()
    }
  } finally {
    if (browser) await browser.close()
    if (!preview.killed) {
      preview.kill('SIGTERM')
      await sleep(200)
      if (!preview.killed) preview.kill('SIGKILL')
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[prerender] FAILED:', err)
    process.exit(1)
  })
