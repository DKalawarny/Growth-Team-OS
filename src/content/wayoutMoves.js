/**
 * The way out — the moves library (SPEC §5).
 *
 * ⭐ WHY THIS IS A FILE AND NOT A PROMPT PARAGRAPH.
 * A model asked to invent three moves from nothing will produce three plausible
 * moves, and plausible is the failure mode this product cannot afford — the
 * person is going to go and DO move one on Saturday. These are grounded options
 * with real shapes: what each needs, how fast it pays, what it grows into, and
 * when in the year it actually works. The model's job is to choose and order
 * them against one person's constraints, not to imagine them.
 *
 * ⚠️ THIS IS A SEED. The SPEC says extend it in the DB. Until there is a moves
 * editor, adding one here is a code change and that is fine — the list is small
 * and every entry is a judgement call someone should read.
 *
 * ⚠️ NO MOVE IN HERE MAY REQUIRE A COURSE, A CERTIFICATION, A FRANCHISE FEE, OR
 * RECRUITING ANYONE. That rule is also in the prompt, but a library entry is a
 * stronger guarantee than an instruction — the model cannot pick what is not
 * here.
 *
 * Fields:
 *   key         stable id, referenced by the map and never shown
 *   title       what it is, in plain words
 *   needs       asset keys from the S3 chips that make this possible
 *   timeToCash  how long before the first dollar, realistically
 *   upfront     what it costs to start, in dollars or 'nothing'
 *   effort      'low' | 'medium' | 'high' — hours, not difficulty
 *   familyCost  what it takes from the people at home. The spec asks for
 *               constraints before dreams; this is that, per move.
 *   growsInto   the ladder. A move with no next step is a job, not a way out.
 *   seasons     months it works, or 'all'
 *   climateTags 'cold-winter' entries need an off-season pair (SPEC §9)
 */

export const WAYOUT_MOVES = [
  // ── Truck / trailer ──────────────────────────────────────────────────────
  {
    key: 'hauling',
    title: 'Hauling and dump runs',
    needs: ['truck'],
    timeToCash: 'days',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'Weekends, mostly. Calls come in Friday night.',
    growsInto: 'A regular route, then hiring a driver, then selling the route.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'junk-removal',
    title: 'Junk removal',
    needs: ['truck', 'trailer'],
    timeToCash: 'days',
    upfront: 'nothing',
    effort: 'high',
    familyCost: 'Heavy lifting and unpredictable hours at the start.',
    growsInto: 'Commercial accounts — property managers and realtors repeat.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'small-moves',
    title: 'Small moves and single-item deliveries',
    needs: ['truck', 'trailer'],
    timeToCash: 'days',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'Evenings and weekends, which is when people move.',
    growsInto: 'Contracts with furniture and appliance shops.',
    seasons: 'all',
    climateTags: [],
  },

  // ── Pressure washer ──────────────────────────────────────────────────────
  {
    key: 'pressure-washing',
    title: 'Pressure washing driveways, siding and decks',
    needs: ['pressure-washer'],
    timeToCash: 'days',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'Daylight hours on weekends through the warm months.',
    growsInto: 'Recurring commercial work, then a second crew.',
    seasons: 'Apr-Oct',
    climateTags: ['cold-winter'],
  },

  // ── Mower / tools ────────────────────────────────────────────────────────
  {
    key: 'lawns',
    title: 'Weekly lawn rounds',
    needs: ['mower'],
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'A fixed day each week, permanently. Predictable, which helps.',
    growsInto: 'Maintenance contracts, then snow and gutters for the winter.',
    seasons: 'Apr-Oct',
    climateTags: ['cold-winter'],
  },
  {
    key: 'snow-gutters-lights',
    title: 'Snow clearing, gutters and holiday lights',
    needs: ['truck', 'mower', 'tools'],
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'high',
    familyCost: 'Early mornings, and snow does not check the calendar.',
    growsInto: 'The winter half of a year-round maintenance business.',
    seasons: 'Nov-Mar',
    climateTags: ['cold-winter-pair'],
  },
  {
    key: 'handyman',
    title: 'Small repairs people keep putting off',
    needs: ['tools'],
    timeToCash: 'days',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'Evenings. The work is close to home, which is the point.',
    growsInto: 'Property managers, then a trade ticket if one fits.',
    seasons: 'all',
    climateTags: [],
  },

  // ── Space ────────────────────────────────────────────────────────────────
  {
    key: 'room-longterm',
    title: 'Long-term tenant in the spare room',
    needs: ['spare-room'],
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Real, and it is the whole household. Everyone has to want it.',
    growsInto: 'The most reliable monthly income on this list.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'room-midterm',
    title: 'Furnished mid-term let — 90 days and up',
    needs: ['spare-room'],
    timeToCash: 'weeks',
    upfront: '$500-1500 to furnish',
    effort: 'low',
    familyCost: 'Less than a lodger. Travel nurses and contractors are out all day.',
    growsInto: 'Better rates than long-term, fewer rules than short-term.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'storage-parking',
    title: 'Renting out storage, or boat and RV parking',
    needs: ['garage', 'land', 'parking'],
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Almost none. This is the quietest money here.',
    growsInto: 'More spaces, or a workshop let.',
    seasons: 'all',
    climateTags: [],
  },

  // ── Recreational assets ──────────────────────────────────────────────────
  {
    key: 'peer-rental',
    title: 'Renting out the boat, jet ski or camper',
    needs: ['boat'],
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'You lose the use of it on exactly the weekends you wanted it.',
    growsInto: 'A second unit, or guided outings if you have the ticket.',
    seasons: 'May-Sep',
    climateTags: ['cold-winter'],
  },

  // ── Equity ───────────────────────────────────────────────────────────────
  {
    key: 'downsize',
    title: 'Sell and downsize',
    needs: ['home-equity'],
    timeToCash: 'months',
    upfront: 'moving costs',
    effort: 'high',
    familyCost: 'The largest on this list. Schools, neighbours, a kid’s room.',
    growsInto: 'The only move that changes the monthly number all at once.',
    seasons: 'all',
    climateTags: [],
    needsProfessional: 'an accountant and a lender',
  },
  {
    key: 'house-hack',
    title: 'House-hack — rent part of what you already own',
    needs: ['home-equity', 'spare-room', 'garage'],
    timeToCash: 'months',
    upfront: 'varies by conversion',
    effort: 'medium',
    familyCost: 'Shared space, permanently. Ask before planning it.',
    growsInto: 'Covers the mortgage, which frees the wage.',
    seasons: 'all',
    climateTags: [],
    needsProfessional: 'a lender, and your city on what is legal',
  },

  // ── Skills ───────────────────────────────────────────────────────────────
  {
    key: 'freelance-skill',
    title: 'Charging for the thing people already ask you to do',
    needs: ['licence', 'trade', 'admin', 'computers', 'design', 'care', 'cooking', 'language', 'business'],
    timeToCash: 'days',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Evenings at first. Scales down as the rate goes up.',
    growsInto: 'Productize it, then hire.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'photos',
    title: 'Real-estate photos and small-business content',
    needs: ['camera'],
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Daytime shoots, which is the awkward part alongside a job.',
    growsInto: 'Retainers with two or three agents.',
    seasons: 'all',
    climateTags: [],
  },

  // ── Skills, time and people ──────────────────────────────────────────────
  // 🔴 THESE EXIST BECAUSE THE LIBRARY USED TO ASSUME A DRIVEWAY. Every move
  // above needs a vehicle, a tool or property. Someone renting a flat with a
  // laptop and three free evenings could answer the whole intake honestly and
  // have nothing here that fits — on a product whose entire promise is "built
  // from what you already have". These are the moves for the rest of the
  // people, and for a lot of them they are faster than anything with an engine.
  {
    key: 'contract-back-to-employer',
    title: 'Go back to your own employer as a contractor',
    needs: ['employer', 'trade', 'licence', 'admin', 'computers'],
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Almost none at first — same work, different arrangement.',
    growsInto: 'A second client, then the income is no longer one relationship.',
    seasons: 'all',
    climateTags: [],
    // ⚠️ The fastest move on this list for an employed person, and the one
    // nobody suggests. It also has a real risk: it can end the job. Say so.
    caution: 'Read your contract first — some have a clause about this.',
  },
  {
    key: 'sub-for-someone-busier',
    title: 'Sub work off someone who has more than they can do',
    needs: ['sub-work', 'trade', 'licence', 'tools'],
    timeToCash: 'days',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'Their schedule, not yours, to begin with.',
    growsInto: 'Their overflow becomes your own customers.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'back-office',
    title: 'Do the paperwork small operators hate',
    needs: ['admin', 'computers', 'school-hours'],
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Evenings, and it can be done after bedtime.',
    growsInto: 'Three or four retainers is a wage.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'teach-what-you-know',
    title: 'Teach or tutor the thing you already know',
    needs: ['teaching', 'language', 'trade', 'care', 'school-hours', 'audience'],
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Fits school hours better than almost anything else here.',
    growsInto: 'Small groups instead of one at a time — the same hour, paid two or three times.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'driving-errands',
    title: 'Driving, deliveries and errands for people who cannot',
    needs: ['car', 'evenings', 'weekends'],
    timeToCash: 'days',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'Whatever hours you give it. Easy to give it too many.',
    growsInto: 'Regular clients beat any app — the app keeps the margin.',
    seasons: 'all',
    climateTags: [],
  },

  // ── Time ─────────────────────────────────────────────────────────────────
  {
    key: 'seasonal-stack',
    title: 'A season of stacked shifts, aimed at one number',
    needs: [],
    timeToCash: 'immediate',
    upfront: 'nothing',
    effort: 'high',
    familyCost: 'High and immediate. Only worth it against a named finish line.',
    growsInto:
      'Nothing. ⚠️ This is fuel for a real move, never the plan itself — it is ' +
      'the one entry here that does not compound, and a map that ends on it has failed.',
    seasons: 'all',
    climateTags: [],
  },

  // ── Subtract ─────────────────────────────────────────────────────────────
  // ⭐ These are first among equals. Cutting needs no customer, no season and
  // no permission, and it is the fastest money most people have. The prompt
  // requires at least one of these whenever discretionary spend is above zero.
  {
    key: 'cut-vehicle',
    title: 'Downgrade the vehicle',
    needs: [],
    timeToCash: 'immediate',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Pride, mostly. Sometimes a real loss of capability — check first.',
    growsInto: 'The payment, freed, every month, starting now.',
    seasons: 'all',
    climateTags: [],
    subtract: true,
    fiveYearTest: 'Will you remember which truck you drove in 2031?',
  },
  {
    key: 'cut-subscriptions',
    title: 'Cancel what renews without being noticed',
    needs: [],
    timeToCash: 'immediate',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'None worth counting.',
    growsInto: 'Small, but it is money you already earned and are not keeping.',
    seasons: 'all',
    climateTags: [],
    subtract: true,
    fiveYearTest: 'Name three of them without looking.',
  },
  {
    key: 'cut-eating-out',
    title: 'Cut eating out to a set number of times a month',
    needs: [],
    timeToCash: 'immediate',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Real if it is how your family sees each other. Set a number, do not go to zero.',
    growsInto: 'Usually the largest single line people find.',
    seasons: 'all',
    climateTags: [],
    subtract: true,
    fiveYearTest: 'Which of these meals will you actually remember?',
  },
]

/**
 * Assets that pair with a cold-winter move, so the map never leaves a hole in
 * December (SPEC §9). Used to check the model's output, not to build it — the
 * acceptance check is "an outdoor move 1 in a cold climate always sees a winter
 * pairing", and a check that reads the same list the generator read would
 * always pass.
 */
export const WINTER_PAIRS = WAYOUT_MOVES.filter(m =>
  m.climateTags.includes('cold-winter-pair'),
).map(m => m.key)

/** Moves that must carry a "talk to a professional" note when chosen. */
export const NEEDS_PROFESSIONAL = WAYOUT_MOVES.filter(m => m.needsProfessional)

/**
 * The library, flattened for the prompt. Sent as stableContext so it sits
 * inside the cached prefix — it is identical on every call, and paying to
 * write it once per person instead of once per request is the difference
 * between this costing cents and dollars.
 */
export function movesLibraryForPrompt() {
  return WAYOUT_MOVES.map(m => {
    const bits = [
      `- ${m.key}: ${m.title}`,
      `  needs: ${m.needs.length ? m.needs.join(', ') : 'nothing they have to own'}`,
      `  first cash: ${m.timeToCash} · upfront: ${m.upfront} · effort: ${m.effort}`,
      `  cost at home: ${m.familyCost}`,
      `  grows into: ${m.growsInto}`,
      `  season: ${m.seasons}`,
    ]
    if (m.subtract) bits.push(`  SUBTRACT. five-year test: ${m.fiveYearTest}`)
    if (m.needsProfessional) bits.push(`  ⚠️ must be flagged: talk to ${m.needsProfessional}`)
    return bits.join('\n')
  }).join('\n\n')
}
