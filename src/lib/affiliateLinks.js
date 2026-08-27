/**
 * Affiliate link resolver.
 *
 * Used by the Roadmap page to turn the plain-text book titles Claude returns
 * (e.g. "Traction", "Buy Back Your Time") into clickable Amazon search URLs
 * with our affiliate tag appended. Any title not in the curated catalog
 * still gets a link — we just build a search URL from the title verbatim.
 *
 * Future expansion — tools (QuickBooks, Gusto, HubSpot, etc.) follow the
 * exact same pattern: add a `tools` map, add a `getToolLink` helper, render
 * the link in the page that mentions the tool.
 *
 * AFFILIATE TAG
 *   Set VITE_AMAZON_AFFILIATE_TAG in .env.local once you have an Amazon
 *   Associates account. Without it, links still work, they just don't
 *   earn commission. Never hardcode your tag in committed code.
 *
 * AMAZON ASSOCIATES DISCLOSURE
 *   Amazon requires that anyone using their affiliate program disclose it
 *   where the links appear. We export AFFILIATE_DISCLOSURE for the UI to
 *   render near book links. Do not remove it.
 */

// Curated catalog. Claude is instructed to pick book titles from roughly
// this list, so most milestones will hit exact matches. Authors are stored
// alongside so the search URL is disambiguated (there are, e.g., multiple
// "Traction" books — including the author narrows it to the right one).
export const BOOK_CATALOG = {
  'Traction':           { author: 'Gino Wickman' },
  'Buy Back Your Time': { author: 'Dan Martell' },
  'E-Myth Revisited':   { author: 'Michael Gerber' },
  'The E-Myth':         { author: 'Michael Gerber' },       // alias
  'Profit First':       { author: 'Mike Michalowicz' },
  'Built to Sell':      { author: 'John Warrillow' },
  'Who Not How':        { author: 'Dan Sullivan' },
  'Clockwork':          { author: 'Mike Michalowicz' },
  'The Pumpkin Plan':   { author: 'Mike Michalowicz' },
  'Rocket Fuel':        { author: 'Gino Wickman' },
  'Atomic Habits':      { author: 'James Clear' },
  'Good to Great':      { author: 'Jim Collins' },
  'The 4 Disciplines of Execution': { author: 'Chris McChesney' },
  'Scaling Up':         { author: 'Verne Harnish' },
  'The Hard Thing About Hard Things': { author: 'Ben Horowitz' },
}

/**
 * Resolve a book title to { url, curated, label }.
 *
 *   curated: true  → title matched a catalog entry → author-qualified search
 *   curated: false → title was unknown → plain title search (still a link)
 *
 * Never returns null — every title becomes clickable. The caller can style
 * curated vs. uncurated differently if they want (we don't bother; visually
 * they look the same).
 */
export function getBookLink(rawTitle) {
  const title = (rawTitle ?? '').trim()
  if (!title) return null

  const tag = import.meta.env.VITE_AMAZON_AFFILIATE_TAG?.trim() || ''
  const match = findCatalogMatch(title)

  const query = match
    ? `${match.key} ${match.entry.author}`
    : title

  return {
    url:     buildAmazonSearchUrl(query, tag),
    label:   match?.key ?? title,
    curated: !!match,
  }
}

/** Exported so the UI can render the required disclosure once, globally. */
export const AFFILIATE_DISCLOSURE =
  'Book recommendations include Amazon affiliate links. As an Amazon Associate, Eliv8 OS earns from qualifying purchases at no extra cost to you.'

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Match by case-insensitive exact, then substring. We prefer exact so that
 * "Profit First" doesn't accidentally match a title like "Profit First for
 * Contractors" — but if Claude returns a subtitle-extended form we still
 * want to catch it, hence the substring fallback.
 */
function findCatalogMatch(title) {
  const lower = title.toLowerCase()

  for (const [key, entry] of Object.entries(BOOK_CATALOG)) {
    if (key.toLowerCase() === lower) return { key, entry }
  }
  for (const [key, entry] of Object.entries(BOOK_CATALOG)) {
    const k = key.toLowerCase()
    if (lower.includes(k) || k.includes(lower)) return { key, entry }
  }
  return null
}

/**
 * Amazon search URL with optional affiliate tag. We target the Books
 * storefront (`i=stripbooks`) so results are clean; without it, Claude's
 * suggestions occasionally turn up merch / Kindle-unrelated items.
 */
function buildAmazonSearchUrl(query, tag) {
  const params = new URLSearchParams({ k: query, i: 'stripbooks' })
  if (tag) params.set('tag', tag)
  return `https://www.amazon.com/s?${params.toString()}`
}
