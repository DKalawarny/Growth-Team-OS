/**
 * The previous round, as prose for the chapter-two user turn.
 *
 * ⚠️ IN ITS OWN FILE SO IT CAN BE TESTED AGAINST WHAT PRODUCTION ACTUALLY SENDS.
 * It lived in session.js, which imports the Supabase client and therefore cannot
 * be loaded by a plain node script — so the audit would have had to reimplement
 * this string, and then it would have been testing its own copy. Every probe in
 * this product that diverged from the thing it was checking has been wrong.
 */
/**
 * The previous round, as prose for the user turn.
 *
 * ⚠️ WHAT THEY DID is the part that matters, and it is the part a summary would
 * lose. Which moves were ticked and which were not touched at all is the only
 * honest evidence this product has about whether its own advice is followable —
 * so it is stated move by move rather than counted.
 *
 * ⚠️ Figures in here are the MODEL's, not theirs. See the provenance note in
 * generateMap: this string is context to read, never a source of allowed numbers.
 */
export function historyForPrompt(history) {
  const { previousMap, ticked, outcome, outcomeNote, chapter } = history
  const moves = Array.isArray(previousMap?.moves) ? previousMap.moves : []
  const done = ticked instanceof Set ? ticked : new Set(Array.isArray(ticked) ? ticked : [])

  const lines = moves.map((m, i) => {
    const order = m.order ?? i + 1
    return `  ${done.has(order) ? '[done]      ' : '[not done]  '}${m.title ?? ''}`
  })

  return [
    `THIS IS PLAN NUMBER ${chapter ?? 2} FOR THIS PERSON. The previous round follows.`,
    '',
    `PREVIOUS DESTINATION: ${previousMap?.headline ?? '(not recorded)'}`,
    '',
    'PREVIOUS MOVES, AND WHAT THEY ACTUALLY DID:',
    ...(lines.length ? lines : ['  (no moves recorded)']),
    '',
    `WHAT THEY SAID WHEN ASKED HOW IT WENT: ${outcome ?? '(not recorded)'}`,
    outcomeNote ? `IN THEIR OWN WORDS: "${outcomeNote}"` : 'They added nothing in their own words.',
    '',
    '🔴 Every figure above except their own words is something YOU wrote last time.',
    'It is context, not evidence. Their new answers follow and those are theirs.',
    '',
    '═══════════════════════════════════════════════════════════════════════',
    '',
  ].join('\n')
}



/**
 * ⭐⭐ WHAT A NEW CHAPTER RE-ASKS, AND WHAT IT REMEMBERS.
 *
 * ⚠️ THE MONEY IS RE-ASKED EVERY TIME. Three months have passed and the figures
 * moved; a plan built on the old ones is confidently wrong, which is worse than
 * one that asked. The old values stay as prefill so confirming is fast.
 *
 * 🔴 THE DESTINATION ONLY CLEARS FOR TWO OF THE FOUR. "partly" and "no" mean they
 * have NOT arrived — writing them a new ambition would be changing the subject to
 * avoid the hard part. Only somebody who landed, or who says outright they want
 * something different, gets asked where to next.
 *
 * ⚠️ AND WHAT IS NEVER RE-ASKED: name, age, town, immovables, the kind of work,
 * or what they refuse to do. Those do not change in a quarter, and asking again
 * says the first conversation was not kept.
 */
export const CHAPTER_CLEARS_MONEY   = ['takeHome', 'mustPay', 'savings']
export const CHAPTER_CLEARS_DESTINY = ['tuesday', 'out']

export function chapterAnswers(previousAnswers, outcome) {
  const keep = { ...(previousAnswers ?? {}) }
  const clear = outcome === 'landed' || outcome === 'changed'
    ? [...CHAPTER_CLEARS_MONEY, ...CHAPTER_CLEARS_DESTINY]
    : CHAPTER_CLEARS_MONEY
  clear.forEach(k => { delete keep[k] })
  return keep
}
