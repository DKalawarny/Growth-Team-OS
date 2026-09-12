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

/**
 * Does this person live somewhere with a real winter?
 *
 * ⚠️ A KEYWORD TEST ON FREE TEXT, AND IT IS DELIBERATELY BIASED TOWARDS "YES".
 * We ask where they are and what the season is like, and both are free text, so
 * there is no clean signal here. The two errors are not equal: a false positive
 * asks for an off-season plan somewhere mild, which is a slightly redundant
 * paragraph. A false negative leaves someone in Nanaimo with no income from
 * November, and they find out in November. So anything that reads cold counts,
 * and a blank answer counts too.
 */
export function looksColdClimate(answers) {
  const text = `${answers?.locationText ?? ''} ${answers?.seasonNote ?? ''}`.toLowerCase()
  if (!text.trim()) return true
  if (/\b(tropical|no winter|mild all year|year-round warm|never gets cold|desert)\b/.test(text)) return false
  return /\b(snow|winter|cold|freez|ice|frost|rain|wet|canada|alberta|saskatchewan|manitoba|ontario|quebec|bc|british columbia|yukon|maritime|minnesota|michigan|wisconsin|dakota|montana|maine|vermont|alaska|new york|chicago|boston|denver|toronto|calgary|edmonton|winnipeg|montreal|ottawa|vancouver|nanaimo|kelowna|prince george)\b/.test(text)
}

/**
 * Immovables that end the relocation conversation.
 *
 * ⭐ From the spec's first principle — constraints before dreams. A plan that
 * asks someone with shared custody to move away is not a worse plan, it is a
 * worthless one, and it tells them the thing did not listen to the first
 * question it asked.
 */
const BLOCKS_RELOCATION = new Set(['kids-home', 'custody', 'parent', 'partner-job', 'health', 'legal'])

export function relocationIsBlocked(answers) {
  const tags = Array.isArray(answers?.immovables) ? answers.immovables : []
  return tags.some(t => BLOCKS_RELOCATION.has(t.key))
}

/**
 * ⚠️ Keyword-matched, because the move is free text the model wrote. It will
 * not catch every phrasing, so it is a backstop for the prompt rule rather than
 * a replacement for it — but it catches the blunt ones, and the blunt ones are
 * what a model produces when it forgets a constraint.
 */
const RELOCATION_WORDS = /\b(relocat|move away|move to|moving to|leave town|leave the (city|province|state)|somewhere cheaper|a cheaper (city|town|province|state)|sell up and move)\b/i

function proposesRelocation(move) {
  return RELOCATION_WORDS.test(`${move?.title ?? ''} ${move?.detail ?? ''}`)
}

/**
 * Shape and safety problems worth surfacing rather than rendering a half-map.
 *
 * ⭐ These are the SPEC §9 acceptance checks, enforced rather than hoped for.
 * The prompt states every one of them; this is what makes them true. A caller
 * that gets a non-empty list must not render the map — see Plan.jsx, which
 * says the plan came back wrong rather than showing three-quarters of one to
 * someone who has paid.
 */
export function mapProblems(map, answers = {}) {
  const problems = []
  if (!map?.headline) problems.push('no headline')

  if (!Array.isArray(map?.moves) || map.moves.length !== 3) {
    problems.push('not three moves')
  } else {
    // Every move needs a checkable next step, or the ordering means nothing.
    const gateless = map.moves.filter(m => !String(m?.gate ?? '').trim())
    if (gateless.length) problems.push(`move ${gateless.map(m => m.order).join(', ')} has no gate`)

    // No December hole.
    const first = map.moves[0]
    const outdoor = first?.outdoor === true || Boolean(first?.season)
    if (outdoor && looksColdClimate(answers)) {
      const hasPlan = Array.isArray(map.seasonPlan) && map.seasonPlan.length > 0
      if (!hasPlan) problems.push('outdoor first move in a cold climate with no off-season plan')
    }

    // Constraints before dreams.
    if (relocationIsBlocked(answers)) {
      const bad = map.moves.filter(proposesRelocation)
      if (bad.length) problems.push(`move ${bad.map(m => m.order).join(', ')} asks them to move when they said they can't`)
    }
  }

  if (!Array.isArray(map?.stats) || map.stats.length < 2) problems.push('missing stats')
  if (!Array.isArray(map?.cut) || map.cut.length < 2) problems.push('nothing crossed off')
  return problems
}
