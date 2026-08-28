# The OG card

`public/og-default.png` is **generated**, not hand-drawn. The source is
`og-default.html` in this folder; `render-og.mjs` shoots it with the puppeteer
the build already depends on.

```bash
# from the repo root — puppeteer resolves from the root node_modules
node scripts/og/render-og.mjs scripts/og/og-default.html public/og-default.png
```

Output is exactly **1200×630** — the 1.91:1 ratio every scraper expects.

⚠️ **Keep it 1200×630 unless you also change `seo.js`.** `og:image:width` and
`og:image:height` are hardcoded to 1200/630 there (`src/lib/seo.js`), so
rendering at 2× for retina crispness — which the first pass did — ships a
2400×1260 file while the tags declare half that. Two sources of truth
disagreeing is the single most common bug in this repo's history, and it is not
worth a slightly sharper preview.

## Why it exists

`OG_DEFAULT_IMAGE` in `src/lib/seo.js` has pointed at `/og-default.png` for
months and **the file did not exist**. Every link preview the site ever produced
— Slack, iMessage, LinkedIn — showed a broken image.

## Rules for editing it

⚠️ **Nothing time-limited goes in this image.** Scrapers cache an OG card
indefinitely, so anything baked in here outlives the truth in every link that has
already been shared. A first draft carried "Free while in private pilot"; that
was removed, because the moment the pricing questionnaire settles, every
previously shared link would keep asserting *free*. This repo has the scar
already — `$97` frozen into JSON-LD long after the price changed, and
`$XXX / month · placeholder` sitting indexed on `/crm`.

Pilot status and price belong in the **meta description**, which re-reads on
every fetch.

⚠️ **The render asserts the fonts loaded and exits non-zero if they did not.**
Instrument Sans and Inter come from Google Fonts over the network; without that
check a font failure silently ships a card set in Arial, with the tracking and
the whole typographic identity gone — and it would look *fine* at a glance.

⭐ The wordmark here must stay in step with `src/components/brand/Wordmark.jsx`:
Inter SemiBold 600, letter-spacing 0.035em, letters `#F6F8F8`, and the **8** is
the only coloured character (`#14A67B`). The reason the 8 alone is green is
written up in that component — it is the character that carries the meaning.

⚠️ Unlike the app, this file cannot use the `Wordmark` component: the card is
rendered standalone, so the mark is re-declared in CSS. Two copies of one spec is
exactly what let the logo say "GrowthOS" for a week after the rename, so if the
spec changes, change it in **both** places.
