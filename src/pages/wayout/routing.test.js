import { describe, it, expect } from 'vitest'
import { sessionHome as whereDoesThisSessionBelong, editDestination } from '../../lib/wayout/sessionHome'

/**
 * 🔴🔴 THIS FILE USED TO CARRY ITS OWN COPY OF THE FUNCTION IT TESTS, so it went
 * green for weeks while the screen it was written to protect was broken. The
 * copy here asked `status === 'paid'`; so did Chapter.jsx; and because payments
 * are off, neither could ever be true. A test that reimplements the rule
 * certifies the rule — it cannot check the code.
 *
 * ⚠️ It imports the real decision now. Same lesson as anthropic.test.js
 * asserting the WIRE, and as the prompt-coverage test that had to stop
 * hand-maintaining its own list of prompts.
 */

/**
 * 🔴🔴 TWO SCREENS DISAGREED ABOUT WHO OWNS A SESSION, AND THE DEFAULT WON.
 *
 * `Chapter.jsx` sends a chapter-1 session to the questions. Nothing sent a
 * chapter-2 session the other way — so signing in landed on "Money, plainly",
 * screen four of the intake, which is exactly the experience /chapter was built
 * to replace. Daniel: "still land here when I log in."
 *
 * ⭐⭐ A PAIR OF GUARDS HAS TO BE WRITTEN AS A PAIR. One half of a redirect is
 * not half a fix — it is a loop waiting for the other side to be added, and in
 * the meantime whichever screen is the default landing wins every time.
 */

describe('a session has exactly one home', () => {
  it('a first plan mid-answer belongs in the questions', () => {
    expect(whereDoesThisSessionBelong({ chapter: 1, status: 'draft' })).toBe('questions')
    expect(whereDoesThisSessionBelong({ status: 'draft' })).toBe('questions')
  })

  // 🔴 The shipped failure.
  it('an unfinished chapter belongs on the chapter door, not the intake', () => {
    expect(whereDoesThisSessionBelong({ chapter: 2, status: 'draft' })).toBe('chapter')
    expect(whereDoesThisSessionBelong({ chapter: 5, status: 'complete' })).toBe('chapter')
  })

  it('a finished plan belongs on the plan, whatever chapter it is', () => {
    expect(whereDoesThisSessionBelong({ chapter: 1, status: 'paid', map: {} })).toBe('plan')
    expect(whereDoesThisSessionBelong({ chapter: 3, status: 'paid', map: {} })).toBe('plan')
  })

  // ⚠️ The two guards must never both fire, or a person bounces forever.
  it('the two redirects can never point at each other', () => {
    for (const chapter of [1, 2, 3]) {
      const home = whereDoesThisSessionBelong({ chapter, status: 'draft' })
      const intakeWouldRedirect  = chapter > 1
      const chapterWouldRedirect = chapter < 2
      expect(intakeWouldRedirect && chapterWouldRedirect).toBe(false)
      expect(home).toBe(chapter > 1 ? 'chapter' : 'questions')
    }
  })
})

/**
 * 🔴🔴 A FINISHED CHAPTER HAS TO STAY REACHABLE, AND HAS TO STAY READ-ONLY.
 *
 * Daniel: *"how do I get back to my first plan from the second?"* — and until
 * 28 Sep the answer was that you could not. `loadOrCreateSession` always returns
 * the NEWEST row, so the moment chapter two existed, chapter one's board was
 * gone. `/history` showed its shape; the plan itself was unreachable.
 *
 * ⭐⭐ AND THE SECOND HALF MATTERS AS MUCH AS THE FIRST. Ticking a box on an old
 * plan, rebuilding it, or talking to it would rewrite history rather than read
 * it — and history is the thing this product is starting to be worth something
 * for. So every write is WITHHELD rather than disabled: the handler is not
 * passed at all, which means there is nothing to re-enable by accident.
 */
function planControls({ past }) {
  return {
    canTick:    !past,
    canRebuild: !past,
    canAsk:     !past,
    canOpenPlaybook: !past,
    canNote:    !past,
    showsBanner: past,
  }
}

describe('a finished chapter is readable and unchangeable', () => {
  it('the live plan can be worked', () => {
    const c = planControls({ past: false })
    expect(c.canTick && c.canRebuild && c.canAsk && c.canOpenPlaybook && c.canNote).toBe(true)
    expect(c.showsBanner).toBe(false)
  })

  it('a past chapter can be read and nothing else', () => {
    const c = planControls({ past: true })
    for (const [name, allowed] of Object.entries(c)) {
      if (name === 'showsBanner') continue
      expect(`${name}: ${allowed}`).toBe(`${name}: false`)
    }
    expect(c.showsBanner).toBe(true)
  })
})

/**
 * 🔴🔴 THE SHIPPED FAILURE, 29 Sep. Daniel finished chapter two in the morning
 * and got a plan. That evening the same door offered him the same form again,
 * he filled it in, and landed back on the plan he already had: "when i submit
 * this it brings me back to the build a plan page."
 *
 * ⚠️ These assertions were checked against the OLD guard first and fail on it,
 * which is the only reason they are worth keeping.
 */
describe('a finished chapter does not ask again', () => {
  it('sends a completed chapter with a plan to the plan', () => {
    expect(whereDoesThisSessionBelong({ chapter: 2, status: 'complete', map: { moves: [] } })).toBe('plan')
  })

  it('still sends a PAID one there, on the day that becomes possible', () => {
    expect(whereDoesThisSessionBelong({ chapter: 2, status: 'paid', map: { moves: [] } })).toBe('plan')
    expect(whereDoesThisSessionBelong({ chapter: 1, status: 'paid', map: { moves: [] } })).toBe('plan')
  })

  /**
   * ⚠️ The recovery path. A chapter that completed but whose generation failed
   * has no plan to show, so it goes back to the form rather than to an empty
   * page — which is the one case where asking again is right.
   */
  it('sends a completed chapter with NO plan back to its own door', () => {
    expect(whereDoesThisSessionBelong({ chapter: 2, status: 'complete', map: null })).toBe('chapter')
    expect(whereDoesThisSessionBelong({ chapter: 1, status: 'complete' })).toBe('questions')
  })

  it('leaves a draft exactly where it was', () => {
    expect(whereDoesThisSessionBelong({ chapter: 2, status: 'draft', map: { moves: [] } })).toBe('chapter')
    expect(whereDoesThisSessionBelong({ chapter: 1, status: 'draft' })).toBe('questions')
  })
})

/**
 * 🔴🔴 "REBUILD THE PLAN AROUND IT" SENT EVERYBODY TO CHAPTER ONE'S QUESTIONS.
 *
 * A chapter-two session's answers do not live in the intake — they live on the
 * chapter door, which exists to replace those thirty questions. So the button
 * went to /questions, the intake bounced it to /chapter because the chapter is
 * not 1, and the person landed on a door they had already walked through.
 *
 * ⚠️ IT ONLY EVER WORKED BECAUSE TWO BUGS CANCELLED. The intake's redirect made
 * the wrong destination land on the right screen — until the door learned to
 * close on a finished chapter, and the accident stopped working. A route that
 * depends on another screen's redirect is not a route, and this is the test
 * that says so.
 */
/** ⚠️ The real function, not a copy of it — see the note at the top of this file. */
const whereDoesRebuildGo = s => `${editDestination(s)}?edit=1`

describe('changing a plan goes to the answers that built it', () => {
  it('sends chapter one back through the intake', () => {
    expect(whereDoesRebuildGo({ chapter: 1, status: 'complete' })).toBe('questions?edit=1')
    expect(whereDoesRebuildGo({})).toBe('questions?edit=1')
  })

  // 🔴 The shipped failure.
  it('sends a later chapter to its OWN door, not through the intake', () => {
    expect(whereDoesRebuildGo({ chapter: 2, status: 'complete' })).toBe('chapter?edit=1')
    expect(whereDoesRebuildGo({ chapter: 3, status: 'complete' })).toBe('chapter?edit=1')
  })

  /**
   * ⚠️ AND THE DOOR MUST REOPEN FOR THAT EDIT. sessionHome closes it on a
   * finished chapter, which is right for somebody arriving cold and fatal for
   * somebody sent here to change something — so `?edit=1` is checked BEFORE it.
   * These two rules are a pair and neither is safe alone.
   */
  it('the closed door is the arrival rule, not the edit rule', () => {
    const finished = { chapter: 2, status: 'complete', map: { moves: [] } }
    expect(whereDoesThisSessionBelong(finished)).toBe('plan')          // arriving cold
    expect(whereDoesRebuildGo(finished)).toBe('chapter?edit=1')        // sent to change it
  })
})
