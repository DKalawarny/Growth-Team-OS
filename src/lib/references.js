/**
 * Curated reference canon for Solomon.
 *
 * Same reasoning as `regulatory_sources` (migration 022): a model asked to
 * recall books from training data will misattribute ideas, invent chapters,
 * and fabricate quotations with total confidence. So Solomon does not
 * reference books from memory — he references THIS list, and nothing else.
 *
 * All 13 rows were checked against publisher and bookseller listings on
 * 2026-08-20 — titles and authorship confirmed. Two were corrected in that
 * pass: Every Good Endeavor is co-authored with Katherine Leary Alsdorf, and
 * the expanded Great Game of Business is credited with Bo Burlingham.
 *
 * ⚠️ Anything ADDED later must be verified the same way. Never add a title
 * from memory — that is the exact failure this file exists to prevent.
 * Daniel: these are verified as real, but whether you want the product
 * associated with each is a separate judgement that is yours to make.
 *
 * Rules enforced in the prompt, not here:
 *   - never quote from any of these
 *   - never cite a page, chapter, or section
 *   - describe the idea in plain words and attribute only the general thesis
 *   - at most one book per reply, and only where it genuinely fits
 */

export const REFERENCE_BOOKS = [
  // ── Operating the business ──────────────────────────────────────────────
  { title: 'The E-Myth Revisited', author: 'Michael E. Gerber',
    topic: 'process', fits: 'Owner is the bottleneck; work is in their head rather than written down. Pairs with Playbooks.' },
  { title: 'Traction', author: 'Gino Wickman',
    topic: 'operating-rhythm', fits: 'No cadence, no clear quarterly priorities. Pairs with the quarterly priorities on the Roadmap.' },
  { title: 'Who', author: 'Geoff Smart and Randy Street',
    topic: 'hiring', fits: 'Hiring on gut feel, repeated bad hires. Pairs with the hiring scorecard.' },
  { title: 'Buy Back Your Time', author: 'Dan Martell',
    topic: 'delegation', fits: 'Owner working far past their own stated ceiling and unable to hand work off.' },

  // ── Money ───────────────────────────────────────────────────────────────
  { title: 'Profit First', author: 'Mike Michalowicz',
    topic: 'cash', fits: 'Revenue growing while the bank balance does not. Chronic cash anxiety.' },
  { title: 'The Great Game of Business', author: 'Jack Stack with Bo Burlingham',
    topic: 'open-book', fits: 'Team disengaged from the numbers; owner carrying financial pressure alone.' },
  { title: 'Built to Sell', author: 'John Warrillow',
    topic: 'succession', fits: 'Business cannot run without the owner. Pairs with Succession.' },

  // ── Faith and work ──────────────────────────────────────────────────────
  { title: 'Business by the Book', author: 'Larry Burkett',
    topic: 'stewardship', fits: 'Owner wants a practical framework for running the business by conviction rather than instinct.' },
  { title: 'Business for the Glory of God', author: 'Wayne Grudem',
    topic: 'vocation', fits: 'Owner is quietly unsure whether profit and business are good things to pursue at all.' },
  { title: 'Every Good Endeavor', author: 'Timothy Keller and Katherine Leary Alsdorf',
    topic: 'vocation', fits: 'Owner treats work and faith as separate compartments, or feels their work does not matter.' },
  { title: 'The Treasure Principle', author: 'Randy Alcorn',
    topic: 'giving', fits: 'Owner raises giving themselves and wants to think about it more deliberately. Never offer unprompted.' },
  { title: 'Halftime', author: 'Bob Buford',
    topic: 'legacy', fits: 'Owner is successful and asking what the rest of it is for.' },
  { title: 'Boundaries for Leaders', author: 'Henry Cloud',
    topic: 'whole-person', fits: 'Business is consuming the owner; no line between work and family.' },
]

/** Compact block for the system prompt. Titles and authors only — no summaries
 *  the model could mistake for quotable content. */
export function referenceCanonBlock() {
  return REFERENCE_BOOKS
    .map(b => `- ${b.title} — ${b.author} (${b.topic}): ${b.fits}`)
    .join('\n')
}
