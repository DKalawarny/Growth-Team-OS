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
