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
 * ⭐⭐ THE FRAMING IS OURS, WHICH IS WHY NOTHING IS LEFT OFF. My first version
 * of this shelf excluded the best-known books in the field — Kiyosaki, Ramsey,
 * Collins — because their theses are INSTRUMENTS and this product does not give
 * investment advice. Daniel overruled it and was right: "I don't think we leave
 * them off. You just need to make sure to frame everything correctly and give
 * options — we can use our narrative to frame things correctly."
 *
 * Recommending a book is not reproducing its advice. Leaving out the book
 * somebody's brother-in-law has already told them about does not protect them
 * from it; it just means they meet it with nobody having said anything useful
 * about how to read it. The honest move is to name it AND say what to hold
 * lightly.
 *
 * ⚠️ SO EVERY ENTRY CARRIES `hold`, AND IT IS RENDERED FROM THIS FILE RATHER
 * THAN WRITTEN BY THE MODEL. The model picks which book and writes one sentence
 * about why this person; the caveat is ours, verbatim, every time. A caveat the
 * model composes is a caveat that can be enthusiastic itself.
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
    hold: 'The investing section is decades old and American. The question it asks about enough is the part that has lasted.',
  },
  {
    title: 'Die With Zero',
    author: 'Bill Perkins',
    for: 'Somebody saving hard with no plan for the saving, or who keeps deferring the life until later. It argues that later has a price too.',
    hold: 'Written by somebody with money and options, and it assumes both. The argument that later has a price still stands if you have neither.',
  },
  {
    title: 'Four Thousand Weeks',
    author: 'Oliver Burkeman',
    for: 'Somebody whose scarce thing is time rather than money, and who is trying to solve it by being more efficient.',
    hold: 'It is philosophy rather than method. If what you need this week is a first step, this is not that — it is the book for why the steps keep not happening.',
  },
  {
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    for: 'Somebody who knows the arithmetic and keeps doing the other thing anyway. Short chapters, and it is about behaviour rather than instruments.',
    hold: 'Stories chosen to fit the argument, as most books of this shape are. The chapters stand on their own; the whole is less than the parts.',
  },
  {
    title: 'The Millionaire Next Door',
    author: 'Thomas J. Stanley and William D. Danko',
    for: 'Somebody measuring themselves against how other people appear to live. It is thirty years old and the central finding has not moved.',
    hold: 'The data is from the 1990s and housing has moved since in ways it does not account for. What holds is what wealth looks like from the outside.',
  },
  {
    title: 'So Good They Can’t Ignore You',
    author: 'Cal Newport',
    for: 'Somebody waiting to find what they are passionate about before they start. It argues the skill comes first and the passion follows it.',
    hold: 'Argued from careers with a clear ladder. If you are in work with no rungs, the principle holds and the examples will not.',
  },
  {
    title: 'The E-Myth Revisited',
    author: 'Michael E. Gerber',
    for: 'Somebody self-employed who has bought themselves a job rather than a business, and cannot take a week off.',
    hold: 'Repetitive, and the running example wears thin. The distinction between working in it and on it is worth the whole book.',
  },
  {
    title: 'Shop Class as Soulcraft',
    author: 'Matthew B. Crawford',
    for: 'Somebody working with their hands who has been told their whole life it was the lesser option, or somebody in an office wondering why the work feels weightless.',
    hold: 'A defence rather than a guide — there is nothing to do at the end of it. Worth reading anyway if you have been made to feel small about the work you do.',
  },
  {
    title: 'Essentialism',
    author: 'Greg McKeown',
    for: 'Somebody whose plan keeps failing because there are nine of them. It is about subtraction, which is the move most people skip.',
    hold: 'Written for people with choices. If your week is already spoken for by a job and children, the chapter on saying no is thinner than it looks.',
  },

  // ── The famous ones ──────────────────────────────────────────────────────
  // ⭐ These are the books somebody has probably already been handed by a
  // brother-in-law. Leaving them off does not protect anybody; it means they
  // meet them with nobody having said anything useful about how to read them.
  {
    title: 'Rich Dad Poor Dad',
    author: 'Robert T. Kiyosaki',
    for: 'Somebody who has never been shown the difference between something that pays you and something you pay for. That one distinction has changed more minds than any other book on this shelf.',
    hold: 'Read it for the shift, not the instructions. The stories are illustrative rather than documented, the specifics are thin, and the borrowing it is relaxed about is the kind that ends people. Take the lens, leave the leverage.',
  },
  {
    title: 'The Total Money Makeover',
    author: 'Dave Ramsey',
    for: 'Somebody buried in debt who does not need another opinion, they need a sequence and some momentum. It is rigid on purpose, and for a lot of people rigid is exactly what works.',
    hold: 'Paying the smallest balance first is about momentum, not arithmetic — clearing the highest RATE first saves more money. If you know that and still want the wins, that is a fair trade. Also written for the US: the accounts and the tax bits will not match Canada.',
  },
  {
    title: 'The Simple Path to Wealth',
    author: 'JL Collins',
    for: 'Somebody who has money to put somewhere and has been avoiding the subject because it seems to require an expert. It makes the case that it is simpler than the industry needs you to believe.',
    hold: 'One strategy, stated as the answer. It may well be a good one and it is not the only one, and everything about the accounts and the tax is American. Somebody who knows Canadian rules should look before you act on it.',
  },
  {
    title: 'Debt-Free Forever',
    author: 'Gail Vaz-Oxlade',
    for: 'Somebody in real trouble right now — collections, nothing left at the end of the month, avoiding the mail. Canadian, blunt, and entirely about getting out rather than about mindset.',
    hold: 'Blunt is the point and it can read as a telling-off on a bad day. Take the method and ignore the tone.',
  },
  {
    title: 'Scarcity',
    author: 'Sendhil Mullainathan and Eldar Shafir',
    for: 'Somebody who cannot understand why they keep making decisions they know are wrong. It shows that being short — of money, of time — measurably changes how anybody thinks, and that this is a bandwidth problem rather than a character one.',
    hold: 'It explains and it does not instruct. Read it for the relief of knowing it is not a flaw in you; do not expect a plan at the end.',
  },
]

/** For the prompt. Byte-identical every call, so it sits inside the cached prefix. */
export function readingForPrompt() {
  // ⚠️ `hold` goes to the model as context so it does not recommend a book in a
  // way its own caveat contradicts — but the caveat the PERSON reads is
  // rendered from this file, not from the model's answer. See the note above.
  return WAYOUT_READING
    .map(b => `- "${b.title}" by ${b.author}\n  FOR: ${b.for}\n  HOLD LIGHTLY: ${b.hold}`)
    .join('\n')
}

/** The shelf entry behind a title the model picked, for rendering. */
export function bookOnShelf(title) {
  const norm = v => String(v ?? '').trim().toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ')
  return WAYOUT_READING.find(b => norm(b.title) === norm(title)) ?? null
}
