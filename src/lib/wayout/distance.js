/**
 * How far they have actually come, in their own figures.
 *
 * ⭐⭐ Daniel: "a way of showing achievements… it's so easy to forget how far you
 * have got or even where you came from."
 *
 * ⭐⭐ AND IT CANNOT BE PRAISE. The voice rules ban encouragement outright —
 * "you've come so far" carries no information and could be written without
 * reading a word they typed, which is exactly why somebody who has heard it
 * from everyone reads it as proof they were not listened to. So the credit this
 * product gives is EVIDENCE: their number then, their number now, no adjectives.
 * An observation they cannot argue with does the work a compliment cannot.
 *
 * ⚠️ EVERY FIGURE HERE IS ONE THEY TYPED. `takeHome` and `mustPay` are asked at
 * the intake and re-asked at every chapter, deliberately, because three months
 * moves them. The only arithmetic is a subtraction between two of their own
 * answers — which is inside what the invented-figure guard has always allowed
 * (their number, two added or subtracted, a monthly↔yearly conversion, a small
 * whole multiple) and is the same sum the plan's own stat card does.
 *
 * 🔴 NOTHING IS DERIVED FROM AN OLD MAP. The rule that has held since 16 Sep:
 * the previous ANSWERS count as theirs, the previous MAP does not. A map's
 * figures are ours, and showing one back as an achievement would launder it
 * into settled fact — one chapter at a time, invisibly.
 */

const num = v => (Number.isFinite(Number(v)) && String(v ?? '').trim() !== '' ? Number(v) : null)

/** What is left at the end of the month, from their own two numbers. */
export function margin(answers = {}) {
  const inn = num(answers.takeHome)
  const out = num(answers.mustPay)
  if (inn === null || out === null) return null
  return inn - out
}

function partChange(label, a, b) {
  if (a === null || b === null || a === b) return null
  return { label, from: a, to: b, direction: b > a ? 'up' : 'down', change: Math.abs(b - a) }
}

/**
 * The distance between the first chapter and the latest, or null.
 *
 * ⚠️ NULL IS A REAL ANSWER AND IT IS COMMON. Somebody on their first plan has
 * no "then"; somebody who skipped a money question has no arithmetic. Both get
 * nothing rather than a zero — "you have moved $0" is a sentence this product
 * must never write, and a confident figure built on a missing answer is worse
 * than no figure at all.
 *
 * ⚠️ AND IT MUST NOT ONLY WORK WHEN THE NEWS IS GOOD. A month that went
 * backwards is still the truth and still theirs; the honest framing is the
 * distance, stated, without a verdict attached. What the product refuses to do
 * is dress it up — see `direction`, which names which way it went and nothing
 * more.
 */
export function distance(chain = []) {
  if (!Array.isArray(chain) || chain.length < 2) return null
  const first = chain[0]
  const last = chain[chain.length - 1]

  const then = margin(first?.answers)
  const now = margin(last?.answers)
  if (then === null || now === null) return null

  return {
    then,
    now,
    change: now - then,
    direction: now > then ? 'up' : now < then ? 'down' : 'flat',
    fromDate: first?.createdAt ?? null,
    toDate: last?.createdAt ?? null,
    // ⭐ WHY it moved, in the same two figures it is made of. Daniel checked
    // the record by hand ("is the math right here") — a margin change with no
    // reason shown makes a person do the subtraction to trust it. Only the
    // parts that changed; each is still nothing but their own two answers.
    why: [
      partChange('take home', num(first?.answers?.takeHome), num(last?.answers?.takeHome)),
      partChange('what has to go out', num(first?.answers?.mustPay), num(last?.answers?.mustPay)),
    ].filter(Boolean),
  }
}

/**
 * Every move they ticked, across every chapter, oldest first.
 *
 * ⭐⭐ THIS IS THE LIST PEOPLE FORGET. "Ask for the four-day week" sat on a plan
 * for six weeks before it got done, and three months later the only thing left
 * is that it feels normal now. The date is what makes it an achievement instead
 * of a checkbox — it says a particular Tuesday in March was the day they did
 * the thing they had been avoiding.
 *
 * ⚠️ Ticking is their claim and nothing asks for proof — deliberately, because
 * requiring evidence turns this into something that audits people, and being
 * audited is what they are already avoiding. That is unchanged here: this shows
 * back what they said, it does not certify it.
 */
export function doneMoves(chain = []) {
  if (!Array.isArray(chain)) return []
  return chain
    .flatMap(c => (c.moves ?? [])
      .filter(m => m.doneAt && m.title)
      .map(m => ({ title: m.title, doneAt: m.doneAt, chapter: c.chapter ?? 1 })))
    .sort((a, b) => new Date(a.doneAt) - new Date(b.doneAt))
}
