import { Map } from './Plan'

/**
 * The way out — a dev-only look at the map.
 *
 * ⭐ WHY THIS EXISTS. The two screens carrying almost all of the design work —
 * the reveal and the intake — sit behind a session AND a completed six-screen
 * intake AND a payment. So the only screen reachable in thirty seconds is the
 * diagnostic, which is six tap-only questions with no text inputs, no tick
 * boxes and no moves. Four rounds of "does this look right yet" were spent
 * looking at the one screen the changes did not touch.
 *
 * 🔴 DEV ONLY, AND THE ROUTE IS NOT REGISTERED IN A PRODUCTION BUILD (see
 * App.jsx). This renders a map nobody generated. On a live site that is a
 * fabricated artifact wearing the same design as a real one — which is exactly
 * the thing the verbatim-quote guard in mapContract.js exists to prevent, so
 * shipping a hardcoded one would be the same mistake with a route in front of
 * it.
 *
 * The sample below is the design reference's own example, so what renders here
 * can be compared against design/way-out/design-reference.html directly.
 */

const SAMPLE = {
  headline: 'Out of the warehouse in twelve months.',
  highlight: 'twelve months',
  seen: {
    quote: 'no real skills',
    insight: 'You also mentioned rebuilding your uncle’s fence and hauling for three neighbours. That’s a business that hasn’t sent an invoice yet.',
  },
  stats: [
    { label: 'Freed by cutting', value: 590, prefix: '$', suffix: '/mo', caption: 'the truck payment and the subscriptions' },
    { label: 'Your quit number', value: 10000, prefix: '$', suffix: '', caption: 'on track for next summer' },
  ],
  moves: [
    {
      order: 1,
      libraryKey: 'pressure-washing',
      outdoor: true,
      title: 'Pressure wash, door to door',
      when: 'This Saturday.',
      detail: 'Aim for three jobs. Runs April to October.',
      gate: 'three people have paid you',
    },
    {
      order: 2,
      libraryKey: 'lawns',
      outdoor: true,
      title: 'Turn customers into weekly lawns',
      when: 'Month 2.',
      detail: 'The same doors, on a schedule instead of one at a time.',
      gate: 'eight houses are on a weekly round',
    },
    {
      order: 3,
      libraryKey: 'freelance-skill',
      outdoor: false,
      title: 'Hire one guy, then quit',
      when: 'Month 6.',
      detail: 'He runs the round. You keep the warehouse job until the maths is boring.',
      gate: 'side income beats your paycheque by half, three months running',
    },
  ],
  cut: [
    { label: 'Delivery driving', why: 'It pays this month and it is worth nothing in three years. You said you had five.' },
    { label: 'A course', why: 'You do not have a knowledge problem. You have three neighbours who already paid you and no invoice.' },
    { label: 'Moving somewhere cheaper', why: 'Shared custody. That ends the conversation, and a plan that ignores it is not a plan.' },
  ],
  seasonPlan: [
    { months: 'Nov–Mar', work: 'Snow clearing and gutters for the same customers. Christmas lights in December.' },
  ],
  disclaimer: 'This is a map of options, not financial or legal advice. Check the numbers before you act.',
}

export default function Preview() {
  return <Map map={SAMPLE} />
}
