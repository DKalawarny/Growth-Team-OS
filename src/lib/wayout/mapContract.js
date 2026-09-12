/**
 * The way out — the map's output contract.
 *
 * ⚠️ SPLIT OUT OF session.js SO IT CAN BE TESTED. This is the logic that
 * decides whether the seen card is allowed to render, which is the one thing in
 * this product that cannot be wrong — and it was sitting in a module that
 * imports the Supabase client, so it could not be loaded in a unit test at all.
 * Pure in, pure out, no I/O.
 */

/**
 * ⭐⭐ THE SEEN CARD IS THE ONE THING IN THIS PRODUCT THAT CANNOT BE WRONG.
 *
 * It quotes the person back to themselves and names what they missed, and it
 * only works because it is true. A fabricated quote — even a close paraphrase —
 * does not read as a small error. It reads as "this thing is making things up
 * about me", and it takes every other claim on the page down with it.
 *
 * The prompt says copy it verbatim or omit the field. This checks. A prompt
 * rule is a preference; this is the guarantee, and it is why SPEC §9 lists
 * "seen never renders without a verbatim quote" as an acceptance check rather
 * than a nice-to-have.
 *
 * ⚠️ Only free text counts. A chip the person tapped is our label, not their
 * words, and quoting it back as if they had said it is the same lie in a
 * smaller font.
 */
export function enforceMapContract(map, answers) {
  const out = { ...map }

  const freeText = [
    answers.out,
    answers.immovablesNote,
    answers.peopleNote,
    answers.askedFor,
    answers.paidFor,
    answers.fiveYearTest,
    answers.seasonNote,
    answers.worstVersion,
    answers.tuesday,
    answers.fromToward,
  ].filter(Boolean).join('\n').toLowerCase()

  if (out.seen?.quote) {
    const quote = String(out.seen.quote).toLowerCase().trim()
      // Models normalise typography — a straight quote becomes curly, a dash
      // becomes an em dash. That is not fabrication, so normalise both sides
      // rather than dropping a card that is genuinely the person's words.
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
    const haystack = freeText
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')

    if (!quote || !haystack.includes(quote)) {
      console.warn('[wayout] seen card dropped — quote is not verbatim in the answers')
      delete out.seen
    }
  }

  // The highlight is rendered as a <mark> inside the headline by string match.
  // If it is not actually in the headline the mark silently does nothing, which
  // looks like a design bug rather than a data one.
  if (out.highlight && out.headline && !out.headline.includes(out.highlight)) {
    console.warn('[wayout] highlight not found in headline — dropping the mark')
    delete out.highlight
  }

  // Exactly three moves, in order. A map with four is not a worse map, it is a
  // different product — the ordering is the thing being sold.
  if (Array.isArray(out.moves)) {
    out.moves = out.moves
      .slice(0, 3)
      .map((m, i) => ({ ...m, order: i + 1 }))
  }

  if (Array.isArray(out.cut)) out.cut = out.cut.slice(0, 4)

  out.disclaimer = out.disclaimer
    || 'This is a map of options, not financial or legal advice. Check the numbers before you act.'

  return out
}

/** Shape problems worth surfacing rather than rendering a half-map. */
export function mapProblems(map) {
  const problems = []
  if (!map?.headline) problems.push('no headline')
  if (!Array.isArray(map?.moves) || map.moves.length !== 3) problems.push('not three moves')
  if (!Array.isArray(map?.stats) || map.stats.length < 2) problems.push('missing stats')
  if (!Array.isArray(map?.cut) || map.cut.length < 2) problems.push('nothing crossed off')
  return problems
}
