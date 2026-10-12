import { describe, it, expect } from 'vitest'
import { matchBooks, textOf } from './bookMatch'
import { REFERENCE_BOOKS } from './references'

const titles = r => r.map(b => b.title)

describe('matchBooks', () => {
  it('brings up the staff books for the reasons people leave', () => {
    const t = 'Two people left this quarter. Turnover is up, there is no clear way up in the company and nobody gets any recognition for good work.'
    const got = titles(matchBooks(t, { max: 3 }))
    expect(got).toContain('The Dream Manager')
    expect(got).toContain('Everybody Matters')
  })
  it('brings up the family books when home is paying for the business', () => {
    const got = titles(matchBooks('He is working evenings and weekends, the hours keep climbing and his family barely sees him at home.', { max: 3 }))
    expect(got).toContain('Win at Work and Succeed at Life')
  })
  it('prefers the money book on a money page but still needs the signals', () => {
    const t = 'Cash is healthy but margin fell and the bank balance is not following revenue.'
    expect(titles(matchBooks(t, { prefer: ['cash'] }))[0]).toBe('Profit First')
    expect(matchBooks('The weather was fine and the trucks were washed on Friday afternoon.', { prefer: ['cash'] })).toEqual([])
  })
  it('shows nothing when nothing fits: one stray word is not a situation', () => {
    expect(matchBooks('We need to hire before spring.')).toEqual([])   // one signal only
    expect(matchBooks('')).toEqual([])
  })
  const overwork = 'He is working evenings and weekends, the hours keep climbing, he is close to burnout and his family barely sees him at home.'

  it('treats every book the same: the ones on faith and work come up on their signals like the rest', () => {
    const got = matchBooks(overwork, { max: 10 })
    expect(titles(got)).toContain('When Work and Family Collide')
    expect(titles(got)).toContain('Win at Work and Succeed at Life')
    for (const b of got) expect(Object.keys(b)).not.toContain('faith')   // no flag, so nothing can label or ration them
  })
  it('the book on giving comes up only when giving is on the page', () => {
    expect(titles(matchBooks(overwork, { max: 20 }))).not.toContain('The Treasure Principle')
    expect(titles(matchBooks('He wants to be more deliberate about giving and has asked about tithing a share of profit.', { max: 5 }))).toContain('The Treasure Principle')
  })
  it('says why each book came up', () => {
    const [b] = matchBooks('The owner is the bottleneck. Nothing is written down and the crew cannot run a site without you.')
    expect(b.title).toBe('The E-Myth Revisited')
    expect(b.because).toMatch(/in your head/)
    expect(b.matched.length).toBeGreaterThanOrEqual(2)
  })
})

describe('the book list itself', () => {
  it('has no duplicate titles and every non-faith book has signals and a reason', () => {
    const t = REFERENCE_BOOKS.map(b => b.title)
    expect(new Set(t).size).toBe(t.length)
    for (const b of REFERENCE_BOOKS) {
      expect(b.author, b.title).toBeTruthy()
      expect(b.because, b.title).toBeTruthy()
      expect(b.signals.length, b.title).toBeGreaterThanOrEqual(6)
    }
  })
  it('no long dashes in anything an owner reads', () => {
    for (const b of REFERENCE_BOOKS) expect(b.because + b.title, b.title).not.toMatch(/—|–/)
  })
})

describe('textOf', () => {
  it('flattens a result and leaves out the model\'s own book list', () => {
    const t = textOf({ summary: 'Cash is tight', flags: ['margin fell'], books: ['Some Book'], nested: { note: 'payroll week' } })
    expect(t).toContain('Cash is tight'); expect(t).toContain('margin fell'); expect(t).toContain('payroll week')
    expect(t).not.toContain('Some Book')
  })
})
