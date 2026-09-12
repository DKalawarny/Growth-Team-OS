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
    direction: 'earn',
    reaches: 'supplement',
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
    direction: 'earn',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'supplement',
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
    direction: 'earn',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'supplement',
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
    direction: 'earn',
    reaches: 'supplement',
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
    direction: 'earn',
    reaches: 'supplement',
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
    direction: 'earn',
    reaches: 'supplement',
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
    direction: 'spend-less',
    reaches: 'replaces-a-wage',
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
    direction: 'spend-less',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'supplement',
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
    direction: 'earn',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'replaces-a-wage',
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
    direction: 'earn',
    reaches: 'supplement',
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
    direction: 'earn',
    reaches: 'supplement',
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
    direction: 'earn',
    reaches: 'supplement',
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

  // ── THE JOB YOU ALREADY HAVE ─────────────────────────────────────────────
  // 🔴 THIS WHOLE CATEGORY WAS MISSING, and it is the largest omission in the
  // file. For most employed people the single biggest one-step change in their
  // income is the job they already do, done for someone who pays more — and it
  // is on nobody's list, because the internet's answer to "I need more money"
  // is always a business. Earning more is the slowest and most expensive of the
  // six ways to close the gap, and it was the only one here.
  {
    key: 'raise-with-evidence',
    title: 'Ask for the raise, with the numbers written down',
    needs: [],
    direction: 'earn',
    reaches: 'changes-the-baseline',
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'An uncomfortable week. Nothing else.',
    growsInto: 'Every future raise and pension contribution starts from the new number.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'better-paid-employer',
    title: 'The same work, for someone who pays more',
    needs: [],
    direction: 'earn',
    reaches: 'changes-the-baseline',
    timeToCash: 'months',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'Evenings applying, and a few awkward half-days.',
    growsInto: 'Usually the biggest single jump available to anyone employed.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'shift-or-role',
    title: 'Change the shift or the role where you already are',
    needs: [],
    direction: 'both',
    reaches: 'changes-the-shape',
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'Depends entirely which way you move it — that is the point of doing it deliberately.',
    growsInto: 'Nights and differentials pay more; days buy back the evenings.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'four-days',
    title: 'Drop to four days',
    needs: [],
    direction: 'spend-less',
    reaches: 'changes-the-shape',
    timeToCash: 'immediate',
    upfront: 'a fifth of the income',
    effort: 'low',
    familyCost: 'None. This is the one that gives rather than takes.',
    growsInto: 'The day is the thing. It is not a step toward anything else.',
    seasons: 'all',
    climateTags: [],
    // ⚠️ Only honest once the cutting has made the fifth day affordable. Offered
    // before that it is a pay cut dressed as a plan.
    requiresSlack: true,
  },

  // ── WHAT YOU EARN PER HOUR ───────────────────────────────────────────────
  // ⚠️ The "never propose a course" rule is aimed at the $2,000 start-a-business
  // industry, not at apprenticeship. A red seal, a Class 1, a ticket an employer
  // will pay for — these are how a great many people actually got out, and
  // banning them blocks a real way out for exactly the person this is for.
  {
    key: 'get-the-ticket',
    title: 'Get the ticket that changes your rate',
    needs: [],
    direction: 'earn',
    reaches: 'changes-the-baseline',
    timeToCash: 'months',
    upfront: 'course fees, often employer-paid',
    effort: 'medium',
    familyCost: 'Evenings or block release, for a defined stretch with an end date.',
    growsInto: 'A rate rather than a wage, and it never goes back down.',
    seasons: 'all',
    climateTags: [],
    needsProfessional: 'whoever runs the trade or licensing body where you live',
  },

  // ── WHAT LIFE COSTS ──────────────────────────────────────────────────────
  // 🔴 We had three cuts and all three were consumer spending — eating out,
  // subscriptions, the truck — while treating housing and debt as facts of
  // nature. For most households those two lines are larger than everything
  // else added together, and dealing with expensive debt is often worth more
  // per month than any move in the earning half of this file.
  {
    key: 'cheaper-housing',
    title: 'The same town, a cheaper place to live',
    needs: [],
    direction: 'spend-less',
    reaches: 'changes-the-baseline',
    timeToCash: 'months',
    upfront: 'moving costs, a deposit',
    effort: 'high',
    familyCost: 'Real, and everyone gets a say. Schools and neighbours are the whole argument.',
    growsInto: 'The largest single line most people can actually move.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'expensive-debt',
    title: 'Deal with the debt that is eating the margin',
    needs: [],
    direction: 'spend-less',
    reaches: 'changes-the-baseline',
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'An afternoon of admin nobody wants to do.',
    growsInto: 'Every month after is a month the interest is not taking.',
    seasons: 'all',
    climateTags: [],
    needsProfessional: 'a credit counsellor if it is more than one card',
  },
  {
    key: 'one-vehicle',
    title: 'One vehicle instead of two',
    needs: [],
    direction: 'spend-less',
    reaches: 'supplement',
    timeToCash: 'immediate',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'Daily logistics, permanently. Do not propose it where shifts do not overlap.',
    growsInto: 'Payment, insurance and fuel, gone at once.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'fixed-bills',
    title: 'Switch the bills that renew themselves',
    needs: [],
    direction: 'spend-less',
    reaches: 'supplement',
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'low',
    familyCost: 'None.',
    growsInto: 'Small and permanent. Worth doing precisely because it needs no willpower.',
    seasons: 'all',
    climateTags: [],
    subtract: true,
    fiveYearTest: 'You will never notice this one again after the afternoon you do it.',
  },
  {
    key: 'childcare',
    title: 'Change the childcare arrangement',
    needs: [],
    direction: 'both',
    reaches: 'changes-the-shape',
    timeToCash: 'weeks',
    upfront: 'nothing',
    effort: 'medium',
    familyCost: 'The most sensitive thing in this file. It is the children.',
    growsInto: 'Often the difference between one income and two, or between working and not.',
    seasons: 'all',
    climateTags: [],
  },

  // ── WHERE YOU LIVE ───────────────────────────────────────────────────────
  {
    key: 'move-cheaper-region',
    title: 'Somewhere the same money goes further',
    needs: [],
    direction: 'spend-less',
    reaches: 'replaces-a-wage',
    timeToCash: 'months',
    upfront: 'moving costs',
    effort: 'high',
    familyCost: 'Everything. Nobody does this alone and nobody does it quickly.',
    growsInto: 'The one move that changes income and costs at the same time.',
    seasons: 'all',
    climateTags: [],
    // 🔴 Ruled out entirely by an immovable. Never offer it to someone with
    // shared custody, a partner's job or a parent who needs them close.
    blockedByImmovables: true,
  },
  {
    key: 'move-near-family',
    title: 'Move to be near the people who need you',
    needs: [],
    direction: 'both',
    reaches: 'changes-the-shape',
    timeToCash: 'months',
    upfront: 'moving costs',
    effort: 'high',
    familyCost: 'A whole life relocated — and usually the reason for doing it.',
    growsInto: 'Childcare, care for a parent, and the years you do not get back.',
    seasons: 'all',
    climateTags: [],
  },

  // ── LESS, ON PURPOSE ─────────────────────────────────────────────────────
  // ⭐⭐ THE HALF OF THE PRODUCT THAT DID NOT EXIST. Someone who has done well
  // and decided it is not everything closes the same gap from the other side:
  // not by earning more but by needing less. He can usually already afford the
  // life he wants and nobody has ever done that arithmetic in front of him.
  // ⚠️ For him the hard part is never the money. It is the people around him
  // and his own idea of himself — the partner who likes the income, the school,
  // the father-in-law who will call it a breakdown.
  {
    key: 'own-it-outright',
    title: 'Sell, and own somewhere outright',
    needs: ['home-equity'],
    direction: 'spend-less',
    reaches: 'replaces-a-wage',
    timeToCash: 'months',
    upfront: 'moving costs, fees, tax',
    effort: 'high',
    familyCost: 'The largest conversation in this file, and it is not a money conversation.',
    growsInto: 'No mortgage is the same as a second income, and it cannot be taken away.',
    seasons: 'all',
    climateTags: [],
    needsProfessional: 'an accountant, before anything is listed',
  },
  {
    key: 'hand-it-over',
    title: 'Hand the business to someone who wants to run it',
    needs: ['business'],
    direction: 'spend-less',
    reaches: 'changes-the-shape',
    timeToCash: 'months',
    upfront: 'nothing',
    effort: 'high',
    familyCost: 'Identity, mostly. The hours come back immediately; the rest takes a year.',
    growsInto: 'Ownership without the day. Often more profitable than running it tired.',
    seasons: 'all',
    climateTags: [],
    needsProfessional: 'an accountant and a lawyer',
  },
  {
    key: 'stop-travelling',
    title: 'Take the version of this job that stays home',
    needs: [],
    direction: 'spend-less',
    reaches: 'changes-the-shape',
    timeToCash: 'months',
    upfront: 'usually some income',
    effort: 'medium',
    familyCost: 'None — this is the one people take a pay cut for and never regret.',
    growsInto: 'Two hundred evenings a year is not a lifestyle change, it is a different life.',
    seasons: 'all',
    climateTags: [],
  },
  {
    key: 'lower-paid-closer',
    title: 'The job closer to home, for less',
    needs: [],
    direction: 'spend-less',
    reaches: 'changes-the-shape',
    timeToCash: 'months',
    upfront: 'the difference in pay',
    effort: 'medium',
    familyCost: 'None, once the arithmetic says the difference is affordable.',
    growsInto: 'The commute back, which for most people is a working month a year.',
    seasons: 'all',
    climateTags: [],
    requiresSlack: true,
  },

  // ── A YEAR WITH A SHAPE ──────────────────────────────────────────────────
  // ⭐ For someone whose goal is a season on and a season off, an off-season is
  // not a hole to be plugged — it is the entire point. Earn twelve months of
  // money in six and go. The rest of this file treats winter as a problem.
  {
    key: 'seasonal-business',
    title: 'Build something that earns its year in six months',
    needs: ['truck', 'trailer', 'mower', 'pressure-washer', 'tools', 'licence', 'trade'],
    direction: 'earn',
    reaches: 'replaces-a-wage',
    timeToCash: 'months',
    upfront: 'nothing beyond what you own',
    effort: 'high',
    familyCost: 'Brutal for six months and absent for the other six. Everyone has to want it.',
    growsInto: 'A crew that runs the season, and a winter that is genuinely yours.',
    seasons: 'Apr-Oct',
    // ⚠️ NOT cold-winter. The off-season is deliberate, so the winter-pairing
    // check must not treat this plan as broken — which is exactly what it did.
    climateTags: ['seasonal-by-design'],
  },

  // ── Subtract ─────────────────────────────────────────────────────────────
  // ⭐ These are first among equals. Cutting needs no customer, no season and
  // no permission, and it is the fastest money most people have. The prompt
  // requires at least one of these whenever discretionary spend is above zero.
  {
    key: 'cut-vehicle',
    direction: 'spend-less',
    reaches: 'supplement',
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
    direction: 'spend-less',
    reaches: 'supplement',
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
    direction: 'spend-less',
    reaches: 'supplement',
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
      // ⭐ direction and reach are what let the model tell a supplement from an
      // exit, and an earn-more move from a need-less one. Without them it
      // cannot honour "move three has to arrive" or plan for someone whose
      // goal is a smaller life.
      `  direction: ${m.direction ?? 'earn'} · reaches: ${m.reaches ?? 'supplement'}`,
      `  needs: ${m.needs.length ? m.needs.join(', ') : 'nothing they have to own'}`,
      `  first cash: ${m.timeToCash} · upfront: ${m.upfront} · effort: ${m.effort}`,
      `  cost at home: ${m.familyCost}`,
      `  grows into: ${m.growsInto}`,
      `  season: ${m.seasons}`,
    ]
    if (m.subtract) bits.push(`  SUBTRACT. five-year test: ${m.fiveYearTest}`)
    if (m.needsProfessional) bits.push(`  ⚠️ must be flagged: talk to ${m.needsProfessional}`)
    if (m.blockedByImmovables) bits.push('  🔴 RULED OUT by any immovable that keeps them where they are.')
    if (m.requiresSlack) bits.push('  ⚠️ Only honest once the cutting has made it affordable — before that it is a pay cut dressed as a plan.')
    if (m.climateTags.includes('seasonal-by-design')) bits.push('  ⭐ The off-season is the POINT, not a gap to fill.')
    return bits.join('\n')
  }).join('\n\n')
}
