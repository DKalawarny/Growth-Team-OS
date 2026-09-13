/**
 * The way out — answers held in the browser, before there is an account.
 *
 * ⭐ WHY. The intake used to demand an account before question one: a signup
 * wall in front of a product that had not yet done anything for anyone. The
 * free diagnostic exists precisely to avoid that, and the intake immediately
 * undid it. Now all six questions are answerable with no account, and the wall
 * moves to the end — where someone has just spent fifteen minutes and can see
 * exactly what they would be keeping.
 *
 * 🔴 THIS IS THE MOST SENSITIVE THING THE PRODUCT EVER PUTS IN A BROWSER.
 * By the last screen it holds a custody arrangement, take-home pay, debts, a
 * health note, a faith note and whatever they wrote in the open box. Three
 * rules follow from that, and none of them is optional:
 *
 *   1. IT IS CLEARED THE MOMENT IT IS SAVED to an account. Not "eventually" —
 *      the same tick.
 *   2. IT EXPIRES ON ITS OWN. A family laptop should not still be holding
 *      somebody's marriage in a fortnight because they wandered off at screen
 *      four.
 *   3. IT IS CLEARED ON SIGN-OUT, so the next person at the same machine does
 *      not inherit it.
 *
 * ⚠️ It cannot be user-scoped the way the localStorage keys in the other
 * product are, because the whole point is that there is no user yet. Expiry and
 * prompt clearing are what stand in for that, and they have to be taken
 * seriously rather than assumed.
 */

const KEY = 'wayout:draft'

// A fortnight is long enough to come back after a weekend and short enough that
// an abandoned answer does not sit in a shared browser indefinitely.
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

/** Save the whole answers document. Silent on failure — private mode, full disk. */
export function saveDraft(answers, step) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ answers, step, at: Date.now() }))
  } catch {
    // A draft that cannot be written is a worse session, not a broken one.
  }
}

/** The draft, or null if there is none, it is unreadable, or it has expired. */
export function loadDraft() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d?.at || Date.now() - d.at > MAX_AGE_MS) {
      clearDraft()
      return null
    }
    return d
  } catch {
    return null
  }
}

export function clearDraft() {
  try { localStorage.removeItem(KEY) } catch { /* nothing to do about it */ }
}

/** Is there anything worth carrying into an account? */
export function draftHasAnswers() {
  const d = loadDraft()
  return !!d && Object.keys(d.answers ?? {}).length > 0
}
