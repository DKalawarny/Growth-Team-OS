import { describe, it, expect } from 'vitest'
import { mapStyleNotes, inventedFigures, statIsFounded, enforceMapContract, mapProblems, looksColdClimate, relocationIsBlocked } from './mapContract'
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
  // ⚠️ The numbers are not decoration. mustPay is REQUIRED by the intake, so a
  // fixture without it tests a person who cannot exist — and every figure the
  // map prints is now checked against these.
  mustPay: 2000,
  discretionary: 340,
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

// ── Invented figures ────────────────────────────────────────────────────────
//
// 🔴 EVERY ONE OF THESE IS DANIEL'S FIRST REAL MAP, 13 SEP. He answered the
// intake honestly, wrote "hopefully sale of my house" and no figure, and got
// back "$5,000/mo — mortgage gone when the house sells" and "$120,000 — cash in
// hand at sale". His words: "i never said it was a 5k mortgage or price of what
// i get in the sale. and asuming numbers like house sale."

describe('invented figures', () => {
  // What he actually gave: a must-pay TOTAL and a sentence with no number in it.
  const his = {
    mustPay: 5000,
    savings: 2000,
    coming: 'hopefully sale of my house',
    out: 'I want off the road and back with my kids on weekends.',
  }

  it('drops a stat whose figure came from nowhere', () => {
    expect(statIsFounded({ label: 'Cash in hand at sale', value: 120000, prefix: '$' }, his)).toBe(false)
  })

  it('drops a stat that hangs HIS number on something he never priced', () => {
    // 5,000 is his — it is his whole must-pay. Calling it a mortgage is the lie.
    expect(statIsFounded(
      { label: 'Mortgage gone', value: 5000, prefix: '$', caption: 'when the house sells' },
      his,
    )).toBe(false)
  })

  it('keeps a stat that is his own arithmetic', () => {
    expect(statIsFounded({ label: 'Must-pay', value: 5000, prefix: '$', suffix: '/mo' }, his)).toBe(true)
    // A year of it. Same fact, different unit.
    expect(statIsFounded({ label: 'A year of must-pay', value: 60000, prefix: '$' }, his)).toBe(true)
    // The gap between two of his own numbers.
    expect(statIsFounded({ label: 'The gap', value: 3000, prefix: '$' }, his)).toBe(true)
  })

  it('catches a made-up figure in a move, where it cannot be edited out', () => {
    const map = { moves: [{ title: 'List the house', detail: 'That is $120,000 in your hand.' }] }
    expect(inventedFigures(map, his)[0]).toMatch(/120,000/)
  })

  it('lets a move talk about the sale without pricing it', () => {
    const map = { moves: [{ title: 'Find out what the house would clear', detail: 'Ask three agents.' }] }
    expect(inventedFigures(map, his)).toEqual([])
  })

  it('does not flag times, counts or years as money', () => {
    const map = { moves: [{ title: 'Four days', detail: 'Three months running, starting in 2026, 20 hours a week.' }] }
    expect(inventedFigures(map, his)).toEqual([])
  })

  it('trusts a figure he wrote about the sale himself', () => {
    const own = { ...his, coming: 'house sale should clear about 120000' }
    expect(statIsFounded({ label: 'At sale', value: 120000, prefix: '$' }, own)).toBe(true)
  })

  it('removes the unfounded stat from the map, which then fails as incomplete', () => {
    const map = {
      headline: 'Home by summer',
      stats: [
        { label: 'Must-pay', value: 5000, prefix: '$', suffix: '/mo' },
        { label: 'Cash in hand at sale', value: 120000, prefix: '$' },
      ],
      moves: [], cut: [],
    }
    const out = enforceMapContract(map, his)
    expect(out.stats).toHaveLength(1)
    expect(mapProblems(out, his)).toContain('missing stats')
  })
})

describe('what it took as given', () => {
  it('keeps them, capped at three — a longer list is a disclaimer nobody reads', () => {
    const out = enforceMapContract({
      ...baseMap,
      assumptions: ['The trailer is paid off.', 'You can work Saturdays.', 'c', 'd', 'e'],
    }, answers)
    expect(out.assumptions).toHaveLength(3)
    expect(out.assumptions[0]).toBe('The trailer is paid off.')
  })

  it('drops blanks rather than rendering an empty bullet', () => {
    const out = enforceMapContract({ ...baseMap, assumptions: ['  ', '', 'Real one.'] }, answers)
    expect(out.assumptions).toEqual(['Real one.'])
  })
})

describe('the speculative check is per sentence, not per move', () => {
  const his = { mustPay: 5000, savings: 2000, coming: 'hopefully sale of my house' }

  it('allows their own number in a move that also mentions a sale', () => {
    // 🔴 The false positive that deadlocked Daniel: three rewrites, no plan.
    const map = { moves: [{
      title: 'Cut the must-pay',
      detail: 'Your $5,000 a month does not change on its own. Selling the house would change it.',
    }] }
    expect(inventedFigures(map, his)).toEqual([])
  })

  it('still catches the figure when it IS the claim about the sale', () => {
    const map = { moves: [{ title: 'List it', detail: 'Selling would clear $120,000.' }] }
    expect(inventedFigures(map, his)).toHaveLength(1)
  })
})

describe('style notes — a rewrite reason, never a reason to ship nothing', () => {
  // 🔴 Daniel's move one, verbatim. His question: "is this to much of a
  // description on how to do it?" It was, by one sentence and three lengths.
  const his = { moves: [{
    detail: 'Get a real net figure: sale price minus mortgage payoff, minus agent fees, '
      + 'minus tax. That number decides whether you can buy a cashflowing BnB outright, '
      + 'whether you need financing, and how much is left for the travel-trailer year. '
      + 'Every other move in this plan is sized against that single figure. You cannot '
      + 'size the BnB investment, the travel budget, or the safety runway until you have '
      + 'it. Talk to your real-estate agent and an accountant before you list.',
    gate: 'You have a written net-proceeds estimate in hand and a clear sense of how much '
      + 'goes to BnB, how much to travel, and how much stays as reserve.',
  }] }

  it('catches the runaway length', () => {
    expect(mapStyleNotes(his).some(n => /characters/.test(n))).toBe(true)
  })

  it('catches who-to-call, which is the paid half given away', () => {
    expect(mapStyleNotes(his).some(n => /who to call/.test(n))).toBe(true)
  })

  it('catches a gate carrying two things instead of one', () => {
    expect(mapStyleNotes(his).some(n => /gate is too long/.test(n))).toBe(true)
  })

  it('says nothing about a detail that names the move and stops', () => {
    expect(mapStyleNotes({ moves: [{
      detail: 'The truck and the washer are already sitting there. This is the same round '
        + 'of houses you drive past anyway, turned into a Saturday that pays.',
      gate: 'Three people have paid you.',
    }] })).toEqual([])
  })
})

describe('the detail is trimmed, not requested', () => {
  // 🔴 Daniel's move three, verbatim — including the stray "all" the model
  // left on the end, and the sentence banned an hour before it shipped.
  const long = 'The sequence matters here: buy the property after the house closes, not '
    + 'before, and only after you know what it genuinely cashflows — not what the listing '
    + 'claims. Talk to an accountant who knows short-term rental tax before you buy. '
    + 'A property manager handles the day-to-day so the road stays the road. The apps and '
    + 'the BnB together are the two-engine model: one grows, one holds the floor. '
    + 'Neither requires you to be in one place. all'

  const out = enforceMapContract({ ...baseMap, moves: [
    { ...baseMap.moves[0], detail: long },
    ...baseMap.moves.slice(1),
  ] }, answers)
  const detail = out.moves[0].detail

  it('keeps the sentence that names the move', () => {
    expect(detail).toMatch(/^The sequence matters here/)
  })

  it('drops the accountant — who to call is the paid half', () => {
    expect(detail).not.toMatch(/accountant/)
  })

  it('drops the debris on the end', () => {
    expect(detail).not.toMatch(/\ball\s*$/)
  })

  it('leaves a short honest detail alone', () => {
    const short = 'The truck and the washer are already sitting there. This is the same '
      + 'round of houses you drive past anyway, turned into a Saturday that pays.'
    const kept = enforceMapContract({ ...baseMap, moves: [
      { ...baseMap.moves[0], detail: short }, ...baseMap.moves.slice(1),
    ] }, answers)
    expect(kept.moves[0].detail).toBe(short)
  })
})

describe('what they remembered afterwards', () => {
  it('counts as their words — the seen card may quote it', () => {
    // 🔴 The fixed field list is this function's weakness: a free-text field
    // missing from it makes every quote out of that field unverifiable, so the
    // card is dropped for being honest. `added` was exactly that on day one.
    const out = enforceMapContract({
      ...baseMap,
      seen: { quote: 'my brother-in-law has been asking me since the spring', insight: 'That is an offer.' },
    }, { ...answers, added: ['My brother-in-law has been asking me since the spring.'] })
    expect(out.seen).toBeTruthy()
  })
})

describe('our field names never reach a person', () => {
  it('translates the ones that have plain words — Daniel saw "mustPay" in a stat', () => {
    const out = enforceMapContract({
      ...baseMap,
      stats: [
        { label: 'Freed by cutting', value: 340, prefix: '$', caption: 'Your mustPay drops once the mortgage is gone' },
        ...baseMap.stats.slice(1),
      ],
    }, answers)
    expect(out.stats[0].caption).toMatch(/what has to go out every month/)
    expect(JSON.stringify(out)).not.toMatch(/mustPay/)
  })

  it('reports the ones it cannot translate rather than guessing', () => {
    const bad = { ...baseMap, headline: 'Your fiveYearTest says otherwise' }
    expect(mapProblems(bad, answers).some(p => /fiveYearTest/.test(p))).toBe(true)
  })
})

describe('every move carries a detail', () => {
  it('keeps one on all three — withholding them read as vague, not restrained', () => {
    // 🔴 This asserted the opposite for a day. Daniel on the result: "super
    // vague, not enough meat". A title and a gate with nothing between them is
    // a blank, and a blank does not protect the paid half — the WHAT/HOW line
    // does, and that applies to every move equally.
    const out = enforceMapContract(baseMap, answers)
    expect(out.moves.every(m => m.detail)).toBe(true)
  })

  it('keeps the titles and gates — the order is the product, not the prose', () => {
    const out = enforceMapContract(baseMap, answers)
    expect(out.moves.map(m => m.title)).toHaveLength(3)
    expect(out.moves.every(m => m.gate)).toBe(true)
  })
})

describe('numbers people wrote as words', () => {
  // 🔴 THE DEADLOCK, 16 Sep. Found by generating a real map against the live
  // function and running it through this contract — not by reading code. The
  // person wrote "a guy paid me two hundred to clear his yard"; the model used
  // $200, their own figure from their own sentence; the guard called it
  // invented, three times, and they got an error instead of a plan.
  const his = {
    paidFor: 'a guy paid me two hundred to clear his yard',
    coming: 'hopefully sale of my house, should clear about 600000',
    mustPay: 5000,
  }

  it('accepts the figure they spelled out', () => {
    const map = { moves: [{ title: 'Yards', detail: 'You have already been paid $200 for this.' }] }
    expect(inventedFigures(map, his)).toEqual([])
  })

  it('reads a couple of grand, and forty-five thousand', () => {
    const answers = { out: 'I have a couple grand put by and the truck owes me forty five thousand' }
    const map = { moves: [{ title: 'x', detail: 'That is $2,000 liquid against $45,000 of truck.' }] }
    expect(inventedFigures(map, answers)).toEqual([])
  })

  it('still catches a figure that is nowhere, in words or digits', () => {
    const map = { moves: [{ title: 'x', detail: 'That clears $120,000.' }] }
    expect(inventedFigures(map, his)).toHaveLength(1)
  })
})

describe('field names are camelCase compounds only', () => {
  it('leaves an ordinary English word alone', () => {
    // 🔴 'discretionary' was in the field-name list. The model wrote the
    // perfectly good "no discretionary spending named" and the substitution
    // produced "no what you spend on top spending named" — visible nonsense in
    // a stat caption, on the live page.
    const out = enforceMapContract({
      ...baseMap,
      stats: [
        { label: 'Freed by cutting', value: 340, prefix: '$', caption: 'no discretionary spending named' },
        ...baseMap.stats.slice(1),
      ],
    }, answers)
    expect(out.stats[0].caption).toBe('no discretionary spending named')
  })
})

describe('a bad figure costs a sentence, not a whole rewrite', () => {
  // 🔴 MEASURED, NOT GUESSED: driving the real page showed one generation at
  // ~27s, attempt one rejected over a single figure, and the entire map written
  // again — 51 seconds for a plan that came back almost identical. Daniel's
  // report was "still not loading". It was loading; it was taking a minute.
  // ⚠️ The shared fixture plus a sale they never priced — a thinner `answers`
  // makes baseMap's own gate ("$2,000 banked") untraceable and the test then
  // fails for a reason that has nothing to do with what it is checking.
  const his = { ...answers, coming: 'hopefully sale of my house' }

  it('drops the sentence with the invented number and keeps the move', () => {
    const out = enforceMapContract({
      ...baseMap,
      moves: [{
        ...baseMap.moves[0],
        detail: 'List the house this month. That puts $120,000 in your hand.',
      }, ...baseMap.moves.slice(1)],
    }, his)
    expect(out.moves[0].detail).toMatch(/List the house/)
    expect(out.moves[0].detail).not.toMatch(/120,000/)
    // And because it is gone, nothing forces a second generation.
    expect(inventedFigures(out, his)).toEqual([])
  })

  it('still refuses when the figure is in the headline, which cannot lose a sentence', () => {
    const out = enforceMapContract({ ...baseMap, headline: 'Your $120,000 year' }, his)
    expect(mapProblems(out, his).some(p => /120,000/.test(p))).toBe(true)
  })

  it('drops a crossed-off reason that was nothing but a bad figure', () => {
    const out = enforceMapContract({
      ...baseMap,
      cut: [
        // ⚠️ Not "second truck" — baseMap already crosses that off for a good
        // reason, and matching it made this test pass on the wrong entry.
        { label: 'Buy the franchise', why: 'That is $40,000 you do not have.' },
        ...baseMap.cut,
      ],
    }, his)
    expect(out.cut.some(c => /franchise/.test(c.label))).toBe(false)
    // The honest ones are untouched.
    expect(out.cut.length).toBe(2)
  })
})

describe('an assumption states what was assumed and stops', () => {
  // 🔴 VERBATIM, 17 Sep. Daniel: "this is a negative statement and it assumes.
  // One type of business burnout — a service based business operates a lot
  // different than managing a BnB."
  const sprawling = 'I have assumed the BnB property will be run under professional '
    + 'management from day one, because this plan only works if you are not the operator '
    + '— you have already learned what happens when you are.'

  it('keeps the assumption and cuts the verdict', () => {
    const out = enforceMapContract({ ...baseMap, assumptions: [sprawling] }, answers)
    expect(out.assumptions[0]).toBe('I have assumed the BnB property will be run under professional management from day one')
    expect(out.assumptions[0]).not.toMatch(/because/)
    expect(out.assumptions[0]).not.toMatch(/you have already/)
  })

  it('cuts a trailing clause joined by a dash, not only by a full stop', () => {
    const out = enforceMapContract({
      ...baseMap,
      assumptions: ['I have assumed the trailer is paid off — you said you were done with payments'],
    }, answers)
    expect(out.assumptions[0]).toBe('I have assumed the trailer is paid off')
  })
})

describe('the questions that sell the play-by-play', () => {
  it('keeps questions', () => {
    const out = enforceMapContract({
      ...baseMap,
      stuck: ['What do I say so an agent gives me a real number?', 'What if the first one says it depends?'],
    }, answers)
    expect(out.stuck).toHaveLength(2)
  })

  it('drops a line that answers itself — that is the thing being sold', () => {
    const out = enforceMapContract({
      ...baseMap,
      stuck: ['Ask three agents for a written figure.', 'What do I say to get a real number?'],
    }, answers)
    expect(out.stuck).toEqual(['What do I say to get a real number?'])
  })
})

describe('a gate is a fact, not an errand', () => {
  it('flags an instruction gate — Daniel: "this statement doesnt make sense"', () => {
    const notes = mapStyleNotes({ moves: [{
      title: 'Close the house sale',
      gate: 'Get a written net-proceeds figure from a lawyer or accountant, not an estimate',
    }] })
    expect(notes.some(n => /instruction/.test(n))).toBe(true)
  })

  it('flags a gate that just says the move again', () => {
    const notes = mapStyleNotes({ moves: [{
      title: 'Close the house sale and get the written proceeds figure',
      gate: 'The house sale closed and the written proceeds figure exists',
    }] })
    expect(notes.some(n => /restates the move/.test(n))).toBe(true)
  })

  it('says nothing about a fact that becomes true', () => {
    expect(mapStyleNotes({ moves: [{
      title: 'Close the house sale',
      gate: 'Three people have paid you.',
    }] })).toEqual([])
  })
})

describe('a mood is never a reason to wait', () => {
  // 🔴🔴 Daniel, 17 Sep, on his own plan: "people are stressed or not calm
  // usually because of lack of action. this is action." The plan had crossed
  // off launching software that was already built, on the grounds that he would
  // be calmer after the house sold. Shipping it costs almost nothing and would
  // have started bringing money in.
  it('flags something crossed off over a feeling', () => {
    const notes = mapStyleNotes({
      cut: [{
        label: 'Launch the apps before the house sells',
        why: 'Every major decision before the proceeds land is made under financial pressure. '
          + 'The apps have more chance with a calm launcher.',
      }],
    })
    expect(notes.some(n => /feeling, not a constraint/.test(n))).toBe(true)
  })

  it('accepts a reason that names the scarce thing', () => {
    expect(mapStyleNotes({
      cut: [{ label: 'Buy the second property', why: 'It needs money that does not exist until the sale closes.' }],
    })).toEqual([])
  })

  it('flags a gate that waits on a feeling', () => {
    const notes = mapStyleNotes({ moves: [{ title: 'Start the round', gate: 'You feel ready to take it on' }] })
    expect(notes.some(n => /waits on a feeling/.test(n))).toBe(true)
  })
})
