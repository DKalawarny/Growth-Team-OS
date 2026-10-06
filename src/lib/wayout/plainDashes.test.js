import { describe, it, expect } from 'vitest'
import { plainDashes, forReaders } from './mapContract'

/**
 * ⭐ No dashes in anything a person reads (Daniel, 5 Oct: "no one writes like
 * that, it looks AI"). Every case below is a real sentence from the site;
 * validated both ways, including what must NOT change (ranges, hyphens, a lone
 * dash used as a value). A dash before a new sentence becomes a full stop,
 * before a list a colon, around an aside two commas, otherwise a comma.
 */
const cases = [
  ['Getting the separation reason right matters — say what happened plainly and keep any letter.', 'Getting the separation reason right matters. Say what happened plainly and keep any letter.'],
  ['Same for anything the employer owes — accrued holiday, a final pay run, a pension decision.', 'Same for anything the employer owes: accrued holiday, a final pay run, a pension decision.'],
  ['chasing the next thing — more work, more money — and losing sight', 'chasing the next thing, more work, more money, and losing sight'],
  ['Clear the line of credit — the one costing the most.', 'Clear the line of credit, the one costing the most.'],
  ['Usually yes — the rules vary and mistakes last.', 'Usually yes. The rules vary and mistakes last.'],
  ['by exactly a fifth — tax often falls a little faster.', 'by exactly a fifth. Tax often falls a little faster.'],
  ['Clear the debt — the one that costs the most.', 'Clear the debt, the one that costs the most.'],
  ['So the comparison isn’t "4% versus 7%" — it’s a certain 4% against an uncertain 7%.', 'So the comparison isn’t "4% versus 7%". It’s a certain 4% against an uncertain 7%.'],
  ['clear the debt without the house moving — at the cost of turning short debt into long debt, which is a trade.', 'clear the debt without the house moving, at the cost of turning short debt into long debt, which is a trade.'],
  ['what your month looks like on the other side — whether the equity covers the debt and somewhere to live, and what you keep.', 'what your month looks like on the other side: whether the equity covers the debt and somewhere to live, and what you keep.'],
  ['the deadline (— a guess) is soft', 'the deadline (a guess) is soft'],
  ['a doctor can help — and in some places can support time off.', 'a doctor can help, and in some places can support time off.'],
  ['worth more to you than to somebody settled — which argues for a buffer.', 'worth more to you than to somebody settled, which argues for a buffer.'],
  ['Everything else you told us is still here — your town, your hours, what you will not do.', 'Everything else you told us is still here: your town, your hours, what you will not do.'],
  ['Regular clients beat any app — the app keeps the margin.', 'Regular clients beat any app. The app keeps the margin.'],
  ['what must go out every month — and if the house goes, the mortgage, the tax and the insurance go too.', 'what must go out every month, and if the house goes, the mortgage, the tax and the insurance go too.'],
  ['Kids aged 5–11', 'Kids aged 5–11'], ['a part-time role', 'a part-time role'], ['—', '—'],
  ['The order matters —', 'The order matters'], ['— and that is the point.', 'and that is the point.'],
]

describe('no dashes in anything a person reads', () => {
  for (const [input, want] of cases) it(input.slice(0, 60), () => expect(plainDashes(input)).toBe(want))
  it('the reader cleaner still removes the private weekday too', () => {
    expect(forReaders('Picture your Tuesday — calm.')).toBe('Picture the life you are aiming for, calm.')
  })
})
