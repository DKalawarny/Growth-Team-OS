/**
 * The way out — a short, fixed shelf.
 *
 * ⭐⭐ DANIEL: "maybe we should refer to some books about this type of thing."
 * The reason it is worth doing is the same reason the product exists: somebody
 * stuck is short of a LIST, not of effort, and a book is the cheapest deep
 * version of somebody else's list. It is also the opposite of what this product
 * refuses to be — fifteen pounds, theirs forever, and nobody's funnel.
 *
 * 🔴🔴 IT IS A FIXED LIST IN CODE AND THE MODEL MAY NOT ADD TO IT, FOR EXACTLY
 * THE REASON IT MAY NOT NAME AN ORGANISATION IT IS NOT SURE OF. A book that
 * does not exist, or an author attached to the wrong title, is the same failure
 * as a phone number that rings nowhere — somebody goes looking, finds nothing,
 * and correctly stops believing the rest of the page. Models are particularly
 * good at plausible bibliographies, which is what makes this dangerous rather
 * than merely untidy.
 *
 * ⚠️ DELIBERATELY ABOUT FRAMES, NOT INSTRUMENTS. Nothing here tells anybody
 * what to buy, and that is a boundary decision as much as a taste one: this
 * product is not licensed to give investment advice and recommending a book
 * whose thesis is an instrument is a way of doing it at one remove. These are
 * books that change what somebody can SEE — what enough is, what time is worth,
 * what wealth actually looks like from the outside.
 *
 * ⚠️ AND AT MOST ONE, EVER. A reading list is homework, and homework is what
 * you hand somebody when you have not got an answer. One book, when it is
 * genuinely the door, after the plan — never instead of a move.
 *
 * ⭐ This file is Daniel's to edit. It is a shelf, and whose shelf it is
 * matters more than which books are on it.
 */
export const WAYOUT_READING = [
  {
    title: 'Your Money or Your Life',
    author: 'Vicki Robin and Joe Dominguez',
    for: 'Somebody who cannot say what "enough" is, or who is earning well and still feels behind. It turns money into hours of your life and asks what each purchase actually cost.',
  },
  {
    title: 'Die With Zero',
    author: 'Bill Perkins',
    for: 'Somebody saving hard with no plan for the saving, or who keeps deferring the life until later. It argues that later has a price too.',
  },
  {
    title: 'Four Thousand Weeks',
    author: 'Oliver Burkeman',
    for: 'Somebody whose scarce thing is time rather than money, and who is trying to solve it by being more efficient.',
  },
  {
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    for: 'Somebody who knows the arithmetic and keeps doing the other thing anyway. Short chapters, and it is about behaviour rather than instruments.',
  },
  {
    title: 'The Millionaire Next Door',
    author: 'Thomas J. Stanley and William D. Danko',
    for: 'Somebody measuring themselves against how other people appear to live. It is thirty years old and the central finding has not moved.',
  },
  {
    title: 'So Good They Can’t Ignore You',
    author: 'Cal Newport',
    for: 'Somebody waiting to find what they are passionate about before they start. It argues the skill comes first and the passion follows it.',
  },
  {
    title: 'The E-Myth Revisited',
    author: 'Michael E. Gerber',
    for: 'Somebody self-employed who has bought themselves a job rather than a business, and cannot take a week off.',
  },
  {
    title: 'Shop Class as Soulcraft',
    author: 'Matthew B. Crawford',
    for: 'Somebody working with their hands who has been told their whole life it was the lesser option, or somebody in an office wondering why the work feels weightless.',
  },
  {
    title: 'Essentialism',
    author: 'Greg McKeown',
    for: 'Somebody whose plan keeps failing because there are nine of them. It is about subtraction, which is the move most people skip.',
  },
]

/** For the prompt. Byte-identical every call, so it sits inside the cached prefix. */
export function readingForPrompt() {
  return WAYOUT_READING
    .map(b => `- "${b.title}" by ${b.author}\n  FOR: ${b.for}`)
    .join('\n')
}
