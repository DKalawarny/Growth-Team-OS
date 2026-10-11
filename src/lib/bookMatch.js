import { REFERENCE_BOOKS } from './references'
import { textRaisesFaith } from './faithRaised'

/**
 * Which books fit what is on the page.
 *
 * ⚠️ 11 Oct 2026, Daniel: "I want them to come up when it applies... we can set
 * a type of algorithm that promotes these books when it applies."
 *
 * Before this, each tool asked the model for "1 to 3 book titles" and showed
 * whatever came back. That is how a cash forecast could recommend a book about
 * meetings, how tools named titles Solomon is not allowed to name, and why the
 * same two books appeared under almost everything. Now the page's own words
 * are read against each book's signals, and a book appears only when the
 * situation it is for is actually present. Nothing fits, nothing shows.
 *
 * Deliberately simple and explainable: count the distinct signals found. No
 * model call, no embeddings. An owner (or Daniel) can look at a suggestion and
 * see exactly why it came up, because the reason is printed beside it.
 *
 *   text       anything from the page: a result, a milestone, a log
 *   max        how many to return (default 2)
 *   prefer     topics that get a small head start on this page, e.g. the money
 *              page prefers 'cash'. A head start, not a pass: the book still
 *              needs its signals.
 *   need       distinct signals required (default 2). One stray word is not a
 *              situation.
 *
 *   faithRaised  the owner has brought faith up himself (lib/faithRaised.js).
 *
 * ⭐ Books written from Christian conviction are matched exactly like the rest.
 * Daniel, 11 Oct: "when it is appropriate and brought up. I don't want to hide
 * from it", and then, of a first version that left them out until the owner
 * had raised faith: "pushing and hiding are different."
 *   Not hiding: when the situation on the page fits, the book is there.
 *   Not pushing: it is one suggestion among the others, said plainly to be
 *   written from a Christian perspective (the `faith` flag on the result), and
 *   it takes at most one of the places shown. For an owner who has raised
 *   faith himself, that limit comes off.
 */
export function matchBooks(text, { max = 2, prefer = [], need = 2, faithRaised = false } = {}) {
  const hay = ` ${String(text ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `
  if (hay.trim().length < 20) return []
  const noLimit = faithRaised || textRaisesFaith(text)

  const scored = []
  for (const book of REFERENCE_BOOKS) {
    if (!book.signals?.length) continue
    const hits = book.signals.filter(sig => hay.includes(sig.toLowerCase()))
    if (hits.length < need) continue
    scored.push({ book, hits, score: hits.length + (prefer.includes(book.topic) ? 1 : 0) })
  }
  const picked = []
  for (const row of scored.sort((a, b) => b.score - a.score)) {
    if (picked.length >= max) break
    if (row.book.faith && !noLimit && picked.some(p => p.book.faith)) continue   // one place, unless he raised it
    picked.push(row)
  }
  return picked.map(({ book, hits }) => ({
    title: book.title, author: book.author, because: book.because, topic: book.topic, matched: hits, faith: !!book.faith,
  }))
}

/** Everything readable in a tool result, flattened, minus any books the model listed itself. */
export function textOf(data) {
  const out = []
  const walk = (v, key) => {
    if (v == null || key === 'books') return
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(x => walk(x))
    else if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k))
  }
  walk(data)
  return out.join(' . ')
}
