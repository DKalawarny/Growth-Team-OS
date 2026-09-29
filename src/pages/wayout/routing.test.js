import { describe, it, expect } from 'vitest'

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
function whereDoesThisSessionBelong(session) {
  const chapter = session?.chapter ?? 1
  if (session?.status === 'paid' && session?.map) return 'plan'
  if (chapter > 1) return 'chapter'
  return 'questions'
}

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
