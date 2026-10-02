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
/**
 * ⭐⭐ WHOSE DRAFT IS THIS? A second line of defence behind the clear-on-sign-in
 * rule in Enter.jsx.
 *
 * 🔴 A draft written while signed in as one account must never be handed to
 * another. It cannot be scoped at CREATION — the whole point is that it exists
 * before anybody has an account — so it is stamped the moment there IS one, and
 * a stamped draft only unlocks for the account named on it.
 *
 * ⚠️ An UNSTAMPED draft is the ordinary anonymous case and stays adoptable; that
 * is the sign-up flow the product is built on.
 */
export function stampDraft(userId) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    localStorage.setItem(KEY, JSON.stringify({ ...d, uid: userId }))
  } catch { /* nothing to do about it */ }
}

/** True when this draft was written by somebody else's account. */
export function draftBelongsToSomeoneElse(userId) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return false
    const { uid } = JSON.parse(raw)
    return Boolean(uid) && uid !== userId
  } catch { return false }
}

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

/**
 * ⭐⭐ THE HAND-OFF: "I just finished the questions in this tab and was sent to
 * make an account." Set by the intake at that exact moment, in sessionStorage —
 * so it belongs to this one tab and dies with it.
 *
 * 🔴 Why it exists: sign-in used to clear every draft (rightly — on a shared
 * laptop a draft in the browser may be somebody else's), which meant a
 * returning person who answered all six screens and then SIGNED IN lost twenty
 * minutes of answers and landed on question one. The hand-off is the evidence
 * that this draft is theirs: it was written in this tab, seconds ago, and they
 * were sent here to keep it.
 */
const HANDOFF = 'wayout:handoff'
export function markHandoff() {
  try { sessionStorage.setItem(HANDOFF, String(Date.now())) } catch { /* private mode */ }
}
export function takeHandoff() {
  try {
    const at = Number(sessionStorage.getItem(HANDOFF))
    sessionStorage.removeItem(HANDOFF)
    // Fresh within the hour, or it is not the same sitting.
    return Number.isFinite(at) && at > 0 && Date.now() - at < 60 * 60 * 1000
  } catch { return false }
}
export function hasHandoff() {
  try { return Boolean(sessionStorage.getItem(HANDOFF)) } catch { return false }
}
