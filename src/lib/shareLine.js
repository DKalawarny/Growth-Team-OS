/**
 * The words a link-preview card may print under a question: the page's own
 * opening, as many whole sentences as fit. Used by scripts/og-cards.mjs.
 */
// The page's own opening, as many whole sentences as fit. Never just the first
// when the next one turns it: "The house feels like the decision." is followed
// by "It isn't.", and the first sentence alone says the opposite of the page.
export function leadLine(text, max = 78) {
  // Split only where a sentence really ends (punctuation THEN a space), so
  // "5.6 weeks" stays whole. 🔴 The first version matched sentences with a
  // global regex, which silently skipped any text it could not match: the UK
  // card read "More than the salary. 6 weeks" for a page that says "5.6 weeks".
  const sentences = text.trim().split(/(?<=[.?!])\s+/)
  let out = ''
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s
    if (next.length > max) break
    out = next
  }
  // A line too short to stand alone ("Often yes.", "No.") says nothing on a
  // card and can read as a verdict. The question alone is better.
  out = out.length >= 28 ? out : ''
  // ⭐ The card may only ever say the page's own opening words, exactly.
  if (out && !text.trim().startsWith(out)) throw new Error(`card line is not the page's opening: "${out}"`)
  return out
}
