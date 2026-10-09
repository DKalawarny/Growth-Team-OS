import { describe, it, expect } from 'vitest'
import { WAYOUT_MOVES, movesLibraryForPrompt } from './wayoutMoves.js'

// 9 Oct, Daniel: "you not going to have 65 year old tom going out mowing lawns".
describe('physical moves are marked for the age rule', () => {
  const physical = WAYOUT_MOVES.filter(m => m.physical).map(m => m.key)

  it('marks the moves that are hard on the body', () => {
    for (const k of ['lawns', 'hauling', 'junk-removal', 'small-moves', 'snow-gutters-lights', 'handyman', 'pressure-washing']) {
      expect(physical, k).toContain(k)
    }
  })

  it('does not mark the ones that ask for knowledge, not the body', () => {
    for (const k of ['teach-what-you-know', 'back-office', 'contract-back-to-employer', 'freelance-skill', 'sub-for-someone-busier']) {
      expect(physical, k).not.toContain(k)
    }
  })

  it('tells the model, on exactly the marked moves', () => {
    const text = movesLibraryForPrompt()
    expect(text.match(/PHYSICAL\./g)?.length).toBe(physical.length)
  })
})
