import { describe, it, expect } from 'vitest'
import { tidyQuote } from './tidyQuote'

describe('tidyQuote', () => {
  it('fixes the two things that cannot change meaning', () => {
    expect(tidyQuote('the hustle isnt evreything and i have 5 kids'))
      .toBe('The hustle isnt evreything and I have 5 kids')
  })

  // ⚠️ THE POINT OF THE WHOLE FILE. A spelling "fix" inside quotation marks is
  // a word they did not say.
  it('leaves spelling exactly as they typed it', () => {
    expect(tidyQuote('evreything')).toBe('Evreything')
    expect(tidyQuote('i work at the mil')).toBe('I work at the mil')
  })

  it('does not capitalise an i inside a word', () => {
    expect(tidyQuote('driving in the rain')).toBe('Driving in the rain')
    expect(tidyQuote('big financial stress')).toBe('Big financial stress')
  })

  it('handles the pronoun at either edge and in brackets', () => {
    expect(tidyQuote('what i want')).toBe('What I want')
    expect(tidyQuote('i')).toBe('I')
    expect(tidyQuote('all of it (i think)')).toBe('All of it (I think)')
  })

  it('drops a trailing comma from a sliced quote', () => {
    expect(tidyQuote('and then it stopped,')).toBe('And then it stopped')
  })

  it('leaves an already-clean quote untouched', () => {
    expect(tidyQuote('I have run two businesses.')).toBe('I have run two businesses.')
  })
})
