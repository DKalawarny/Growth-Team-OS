/**
 * Where a session belongs — one answer, in one place.
 *
 * 🔴🔴 THE DOOR TO A FINISHED CHAPTER NEVER CLOSED, BECAUSE ITS GUARD ASKED A
 * QUESTION THAT CANNOT BE TRUE YET. `Chapter.jsx` sent somebody to their plan
 * only when `status === 'paid' && map` — but `WAYOUT_PAYMENTS_LIVE` is false,
 * migration 055 made finishing the questions the entitlement, and a finished
 * session is therefore `'complete'` and never `'paid'`. So the condition was
 * dead code from the day it was written.
 *
 * What that looked like: Daniel finished chapter two at 03:41 and got a plan.
 * At 17:34 the same door offered him the same form again, he filled it in, and
 * landed back on the plan he already had. "When I submit this it brings me back
 * to the build a plan page." Verified in the data — `completed_at` moved,
 * `chapterChanged` saved, and the stored map was still the one written fourteen
 * hours earlier.
 *
 * ⚠️ THIRD TIME A `'paid'` CHECK HAS BEEN WRONG WHILE PAYMENTS ARE OFF. The
 * playbook guard was the first (migration 055 exists only to undo it) and the
 * rule is the same every time: ASK WHETHER THE WORK IS FINISHED, NOT WHETHER IT
 * WAS BOUGHT. `'paid'` answers a billing question; these screens are asking a
 * progress question, and the two only coincide on the day payments go live.
 *
 * ⭐⭐ AND IT LIVES HERE NOW BECAUSE THE TEST HAD REIMPLEMENTED IT. routing.test.js
 * carried its own copy of this decision, so it passed while the screen it was
 * written to protect was broken — it certified a rule instead of checking the
 * code. The test imports this.
 */

/**
 * @param {object|null} session
 * @returns {'plan'|'chapter'|'questions'}
 */
export function sessionHome(session) {
  const chapter = session?.chapter ?? 1

  /**
   * ⚠️ FINISHED MEANS NOT A DRAFT — and it must also have a plan to show. A
   * session that completed but whose generation failed has nowhere to send
   * somebody, so it goes back to the form it came from, which is the only
   * recovery path that does not end on an empty page.
   */
  const finished = session?.status && session.status !== 'draft'
  if (finished && session?.map) return 'plan'

  return chapter > 1 ? 'chapter' : 'questions'
}
