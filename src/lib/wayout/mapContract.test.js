import { describe, it, expect } from 'vitest'
import { enforceMapContract, mapProblems } from './mapContract'
import { choosePath } from '../../content/wayoutDiagnostic'

/**
 * The way out — the acceptance checks from SPEC §9, as tests.
 *
 * ⭐ The seen card is the reason this file exists. It quotes the person back to
 * themselves, and a fabricated quote does not read as a small error — it reads
 * as "this is making things up about me", and it takes every other claim on the
 * page down with it. The prompt says copy it verbatim; a prompt rule is a
 * preference. This is the guarantee.
 */

const answers = {
  out: 'Not clocking in for someone else. Fridays with my kids.',
  askedFor: 'I rebuilt my uncle’s fence and hauled for three neighbours',
  paidFor: 'A guy paid me two hundred to clear his yard',
  immovables: [{ key: 'custody', label: 'Shared custody', custom: false }],
}

const baseMap = {
  headline: 'Out of the warehouse in twelve months.',
  highlight: 'twelve months',
  stats: [
    { label: 'Freed by cutting', value: 340, prefix: '$', suffix: '/mo' },
    { label: 'Your quit number', value: 4200, prefix: '$', suffix: '' },
  ],
  moves: [
    { order: 1, title: 'Pressure wash, door to door', when: 'This Saturday', detail: 'Aim for three jobs.', gate: 'Three paying customers' },
    { order: 2, title: 'Weekly lawn round', when: 'Within a month', detail: 'Six houses.', gate: '$2,000 banked' },
    { order: 3, title: 'Snow and gutters', when: 'November', detail: 'Same customers, different season.', gate: 'Twelve regulars' },
  ],
  cut: [
    { label: 'Buying a second truck', why: 'It adds a payment before there is work to hold it.' },
    { label: 'Moving to Alberta', why: 'Shared custody ends that conversation.' },
  ],
}

describe('the seen card', () => {
  it('keeps a quote the person actually typed', () => {
    const out = enforceMapContract({
      ...baseMap,
      seen: { quote: 'hauled for three neighbours', insight: 'That is a business that has not sent an invoice yet.' },
    }, answers)
    expect(out.seen).toBeTruthy()
    expect(out.seen.quote).toBe('hauled for three neighbours')
  })

  it('DROPS a quote that was never typed', () => {
    // The failure this whole guard exists for: plausible, in the right voice,
    // and not something the person ever said.
    const out = enforceMapContract({
      ...baseMap,
      seen: { quote: 'I have never been good with money', insight: 'But you have been.' },
    }, answers)
    expect(out.seen).toBeUndefined()
  })

  it('drops a quote that only PARAPHRASES what they typed', () => {
    const out = enforceMapContract({
      ...baseMap,
      seen: { quote: 'hauled for a few of the neighbours', insight: '...' },
    }, answers)
    expect(out.seen).toBeUndefined()
  })

  it('survives the typography a model normalises', () => {
    // A straight apostrophe coming back curly is not fabrication, and dropping
    // a real card over it would be the guard doing harm.
    const out = enforceMapContract({
      ...baseMap,
      seen: { quote: 'I rebuilt my uncle‘s fence'.replace('‘', '’'), insight: '...' },
    }, answers)
    expect(out.seen).toBeTruthy()
  })

  it('never quotes a chip back as if the person had said it', () => {
    // "Shared custody" is our label on a button they tapped, not their words.
    const out = enforceMapContract({
      ...baseMap,
      seen: { quote: 'Shared custody', insight: '...' },
    }, answers)
    expect(out.seen).toBeUndefined()
  })
})

describe('the map contract', () => {
  it('keeps exactly three moves and renumbers them', () => {
    const out = enforceMapContract({
      ...baseMap,
      moves: [...baseMap.moves, { order: 4, title: 'A fourth', when: 'Later', detail: '', gate: '' }],
    }, answers)
    expect(out.moves).toHaveLength(3)
    expect(out.moves.map(m => m.order)).toEqual([1, 2, 3])
  })

  it('drops a highlight that is not in the headline, so the mark cannot silently do nothing', () => {
    const out = enforceMapContract({ ...baseMap, highlight: 'eighteen months' }, answers)
    expect(out.highlight).toBeUndefined()
  })

  it('always ends with a disclaimer, even when the model omits one', () => {
    const out = enforceMapContract(baseMap, answers)
    expect(out.disclaimer).toMatch(/not financial or legal advice/)
  })

  it('reports a half-map rather than letting it render', () => {
    expect(mapProblems(baseMap)).toEqual([])
    expect(mapProblems({ ...baseMap, moves: baseMap.moves.slice(0, 2) })).toContain('not three moves')
    expect(mapProblems({ ...baseMap, cut: [] })).toContain('nothing crossed off')
  })
})

describe('the free diagnostic paths', () => {
  it('never sends someone with nothing left over to start something new', () => {
    expect(choosePath({ money: 'negative', asset: 'vehicle', goalType: 'money', immovable: 'kids', horizon: '1y' }))
      .toBe('cut-delegate')
  })

  it('does not spend evenings on someone who came here short of time', () => {
    expect(choosePath({ money: 'some', asset: 'vehicle', goalType: 'time', immovable: 'kids', horizon: '1y' }))
      .toBe('cut-delegate')
  })

  it('never proposes relocating to someone who named something that keeps them here', () => {
    for (const immovable of ['kids', 'partner', 'parent']) {
      for (const horizon of ['6m', '1y', '3y', '5y']) {
        const path = choosePath({ money: 'some', asset: 'none', goalType: 'mobile', immovable, horizon })
        expect(path).not.toBe('relocate-or-stay')
      }
    }
  })

  it('offers the move only when nothing is holding them', () => {
    expect(choosePath({ money: 'some', asset: 'none', goalType: 'mobile', immovable: 'nothing', horizon: '3y' }))
      .toBe('relocate-or-stay')
  })
})
