/**
 * Where the yellow mark goes when nobody said — the rule, on its own.
 *
 * ⚠️ Split out of marked.jsx because a file that exports both a component and a
 * plain function breaks fast refresh (eslint react-refresh). The component is
 * next door; everything decidable without React lives here, which is also what
 * makes it testable without rendering anything.
 */
/**
 * ⭐⭐ WHERE THE MARK GOES WHEN NOBODY SAID. The map and the diagnostic carry an
 * explicit `highlight` from the generator; a move title does not, and adding
 * one to the playbook contract would mean a prompt change, a deploy, and every
 * stored playbook regenerating before a single person saw a yellow line.
 *
 * So this derives one STRUCTURALLY: a move title is written as an instruction
 * followed by a qualifier — "Find the cross-border accountant / before
 * anything else moves" — and the instruction is the half worth marking. The
 * split is on a closed list of joining words, never on meaning.
 *
 * 🔴🔴 IT FAILS TO NOTHING, ON PURPOSE. Twelve guards in this product have been
 * wrong, every one of them a word test standing in for a structural test, and
 * the failure here is expensive in a way the others were not: a wrong guess
 * paints a yellow stroke across the wrong words on the biggest type on the
 * page, where it cannot be missed. So a title with no joiner and more than
 * five words gets no mark at all. An unmarked headline looks plain. A
 * mis-marked one looks broken.
 */
const JOINERS = [
  ' before ', ' after ', ' so that ', ' so ', ' and then ', ' then ',
  ' until ', ' while ', ' because ', ' when ', ' if ', ' — ', ', ',
]

export function headClause(text) {
  if (typeof text !== 'string') return null
  const t = text.trim()
  if (!t) return null

  // The earliest joiner wins, so "Call the broker before Friday and then wait"
  // marks the call, not the waiting.
  let cut = -1
  for (const j of JOINERS) {
    const i = t.toLowerCase().indexOf(j)
    if (i > 0 && (cut === -1 || i < cut)) cut = i
  }

  const head = cut === -1 ? t : t.slice(0, cut)
  const words = head.split(/\s+/).filter(Boolean).length

  // ⚠️ Two words is the floor because a one-word mark reads as a typo, and
  // five is the ceiling because the stroke is drawn at a fixed height — past
  // about five words it stops being a pen line and becomes a highlighter slab,
  // which is the failure the `background-size` cap upstairs already fights.
  if (words < 2 || words > 5) return null
  return head
}
