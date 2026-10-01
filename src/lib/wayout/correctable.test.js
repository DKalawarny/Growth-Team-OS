import { describe, it, expect } from 'vitest'
import { correctableAnswers, showAnswer, correctionSentence } from './correctable'

describe('correctableAnswers', () => {
  it('lists the facts the plan turns on, with the intake\'s own labels', () => {
    const list = correctableAnswers({ mustPay: '2500', enough: '8000' })
    const must = list.find(f => f.key === 'mustPay')
    expect(must.label).toBe('What has to go out every month, whatever happens')
    expect(must.value).toBe('2500')
    expect(list.find(f => f.key === 'enough').label).toBe('What would you like it to bring in each month?')
  })
  it('an unanswered fact is still listed, so it can be filled in', () => {
    expect(correctableAnswers({}).find(f => f.key === 'savings').value).toBe('')
  })
})

describe('showAnswer', () => {
  it('figures read as money, text as written', () => {
    expect(showAnswer('number', '100000')).toBe('$100,000')
    expect(showAnswer('text', '8000')).toBe('$8,000')
    expect(showAnswer('text', 'about 4k, maybe more')).toBe('about 4k, maybe more')
    expect(showAnswer('number', '')).toBe('Not answered')
  })
})

describe('correctionSentence', () => {
  it('says what it is now and what it was', () => {
    const f = { label: 'Savings you could actually reach', kind: 'number' }
    expect(correctionSentence(f, '100000', '60000'))
      .toBe('Correction to my answers — Savings you could actually reach: $60,000 (I had put $100,000).')
  })
})
