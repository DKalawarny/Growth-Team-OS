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
  const FAITH_TITLES = new Set(REFERENCE_BOOKS.filter(b => b.faith).map(b => b.title))
  const overwork = 'He is working evenings and weekends, the hours keep climbing, he is close to burnout and his family barely sees him at home.'

  it('does not hide a faith book: it comes up when the situation fits, labelled', () => {
    const got = matchBooks(overwork, { max: 10 })
    const faith = got.filter(b => FAITH_TITLES.has(b.title))
    expect(faith.length).toBe(1)                 // there, and only one: not pushed
    expect(faith[0].faith).toBe(true)            // the page says what it is
    expect(got.some(b => !b.faith)).toBe(true)   // alongside the others, not instead
  })
  it('lifts the one-at-a-time limit for an owner who has raised faith himself', () => {
    const got = matchBooks(overwork, { max: 10, faithRaised: true }).filter(b => b.faith)
    expect(got.length).toBeGreaterThan(1)
  })
  it('also lifts it when the page\'s own words raise it', () => {
    const got = matchBooks(overwork + ' He says he prays about it and wants to steward the business well.', { max: 10 }).filter(b => b.faith)
    expect(got.length).toBeGreaterThan(1)
  })
  it('a church for a client is not the owner raising his faith', () => {
    const got = matchBooks(overwork + ' The Maple Street Church contract and the ministry centre both renew in March.', { max: 10 }).filter(b => b.faith)
    expect(got.length).toBe(1)
  })
  it('the book on giving needs giving to be on the page, even then', () => {
    expect(titles(matchBooks(overwork, { max: 20, faithRaised: true }))).not.toContain('The Treasure Principle')
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
