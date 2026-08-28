import puppeteer from 'puppeteer'
const SRC = process.argv[2], OUT = process.argv[3]
const b = await puppeteer.launch({ headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
await p.goto('file://' + SRC, { waitUntil: 'networkidle0' })
// Fonts must be resolved before the shot, or Instrument Sans silently falls
// back and the whole card ships in the wrong face.
await p.evaluate(() => document.fonts.ready)
const loaded = await p.evaluate(() => ({
  instrument: document.fonts.check('600 69px "Instrument Sans"'),
  inter:      document.fonts.check('600 31px "Inter"'),
}))
if (!loaded.instrument || !loaded.inter) {
  console.error('FONT NOT LOADED:', JSON.stringify(loaded)); await b.close(); process.exit(1)
}
await p.screenshot({ path: OUT, type: 'png' })
await b.close()
console.log('fonts ok:', JSON.stringify(loaded))
