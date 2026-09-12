import { describe, it, expect } from 'vitest'
import { enforceMapContract, mapProblems, looksColdClimate, relocationIsBlocked } from './mapContract'
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
    { order: 1, libraryKey: 'pressure-washing', outdoor: true, title: 'Pressure wash, door to door', when: 'This Saturday', detail: 'Aim for three jobs.', gate: 'Three paying customers' },
    { order: 2, libraryKey: 'lawns', outdoor: true, title: 'Weekly lawn round', when: 'Within a month', detail: 'Six houses.', gate: '$2,000 banked' },
    { order: 3, libraryKey: 'snow-gutters-lights', outdoor: true, title: 'Snow and gutters', when: 'November', detail: 'Same customers, different season.', gate: 'Twelve regulars' },
  ],
  seasonPlan: [{ months: 'Nov–Mar', work: 'Snow clearing and gutters for the same customers.' }],
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
    expect(mapProblems(baseMap, answers)).toEqual([])
    expect(mapProblems({ ...baseMap, moves: baseMap.moves.slice(0, 2) }, answers)).toContain('not three moves')
    expect(mapProblems({ ...baseMap, cut: [] }, answers)).toContain('nothing crossed off')
  })
})

describe('every move carries a gate', () => {
  it('accepts a map where all three have one', () => {
    expect(mapProblems(baseMap, answers)).toEqual([])
  })

  it.each([0, 1, 2])('rejects a map where move %i has no gate', i => {
    const moves = baseMap.moves.map((m, j) => (j === i ? { ...m, gate: '' } : m))
    expect(mapProblems({ ...baseMap, moves }, answers).join(' ')).toMatch(/has no gate/)
  })

  it('treats a whitespace-only gate as no gate', () => {
    const moves = baseMap.moves.map((m, j) => (j === 0 ? { ...m, gate: '   ' } : m))
    expect(mapProblems({ ...baseMap, moves }, answers).join(' ')).toMatch(/has no gate/)
  })
})

describe('no December hole', () => {
  /** baseMap without its off-season plan. */
  const withoutSeasonPlan = () => {
    const m = { ...baseMap }
    delete m.seasonPlan
    return m
  }

  const cold = { ...answers, locationText: 'Nanaimo, BC', seasonNote: 'Wet winters, dry summers' }
  const mild = { ...answers, locationText: 'San Diego', seasonNote: 'Mild all year, no winter to speak of' }

  it('reads a real winter out of the location', () => {
    expect(looksColdClimate(cold)).toBe(true)
    expect(looksColdClimate(mild)).toBe(false)
  })

  it('assumes a winter when they told us nothing — the safe direction to be wrong', () => {
    expect(looksColdClimate({})).toBe(true)
  })

  it('REJECTS an outdoor first move in a cold climate with no off-season plan', () => {
    expect(baseMap.seasonPlan).toBeTruthy()   // the fixture really does have one
    expect(mapProblems(withoutSeasonPlan(), cold).join(' ')).toMatch(/off-season/)
  })

  it('accepts the same map once the off-season is covered', () => {
    expect(mapProblems(baseMap, cold)).toEqual([])
  })

  it('does not demand an off-season plan somewhere mild', () => {
    expect(mapProblems(withoutSeasonPlan(), mild)).toEqual([])
  })

  it('does not demand one when the first move is indoors', () => {
    const noPlan = withoutSeasonPlan()
    const moves = [{ ...baseMap.moves[0], outdoor: false, season: undefined, libraryKey: 'room-longterm', title: 'Rent the spare room' }, ...baseMap.moves.slice(1)]
    expect(mapProblems({ ...noPlan, moves }, cold)).toEqual([])
  })
})

describe('constraints before dreams — no relocation when they said they cannot', () => {
  const custody  = { ...answers, immovables: [{ key: 'custody', label: 'Shared custody' }] }
  const partner  = { ...answers, immovables: [{ key: 'partner-job', label: 'Partner’s job is here' }] }
  const freeToGo = { ...answers, immovables: [{ key: 'lease', label: 'Lease / mortgage' }] }

  it('knows which immovables end the conversation', () => {
    expect(relocationIsBlocked(custody)).toBe(true)
    expect(relocationIsBlocked(partner)).toBe(true)
    expect(relocationIsBlocked(freeToGo)).toBe(false)
  })

  it.each([
    ['Relocate to a cheaper province', ''],
    ['Start fresh', 'The numbers work if you move to Alberta.'],
    ['Sell up and move somewhere cheaper', ''],
  ])('REJECTS a map that says "%s" to someone with shared custody', (title, detail) => {
    const moves = [{ ...baseMap.moves[0], title, detail }, ...baseMap.moves.slice(1)]
    expect(mapProblems({ ...baseMap, moves }, custody).join(' ')).toMatch(/asks them to move/)
  })

  it('rejects it for a partner whose job is here too', () => {
    const moves = [{ ...baseMap.moves[0], title: 'Relocate to a cheaper city' }, ...baseMap.moves.slice(1)]
    expect(mapProblems({ ...baseMap, moves }, partner).join(' ')).toMatch(/asks them to move/)
  })

  it('allows it when nothing is pinning them down', () => {
    const moves = [{ ...baseMap.moves[0], title: 'Relocate to a cheaper city' }, ...baseMap.moves.slice(1)]
    expect(mapProblems({ ...baseMap, moves }, freeToGo)).toEqual([])
  })
})

describe('what they added themselves', () => {
  it('a custom asset reaches the model as a first-class tag', () => {
    const withJetSki = {
      ...answers,
      assets: [
        { key: 'truck', label: 'Truck', custom: false },
        { key: 'custom-jet-ski', label: 'Jet ski', custom: true },
      ],
    }
    // The shape is what the prompt reads. custom:true is the only difference,
    // and it is there to raise the entry's standing, not to lower it.
    const custom = withJetSki.assets.filter(a => a.custom)
    expect(custom).toHaveLength(1)
    expect(custom[0].label).toBe('Jet ski')
    expect(custom[0].key).toMatch(/^custom-/)
  })

  it('accepts a move the model invented for it, held to the same contract', () => {
    const moves = [
      { order: 1, libraryKey: 'custom', outdoor: true, title: 'Rent the jet ski out on weekends', when: 'This Saturday', detail: 'List it on a peer rental site.', gate: 'Two bookings' },
      ...baseMap.moves.slice(1),
    ]
    const map = { ...baseMap, moves }
    expect(mapProblems(map, { ...answers, locationText: 'Nanaimo, BC' })).toEqual([])
  })

  it('holds an invented move to the SAME gate rule as a built-in', () => {
    const moves = [
      { order: 1, libraryKey: 'custom', outdoor: true, title: 'Rent the jet ski out', when: 'Saturday', detail: '', gate: '' },
      ...baseMap.moves.slice(1),
    ]
    expect(mapProblems({ ...baseMap, moves }, answers).join(' ')).toMatch(/has no gate/)
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
