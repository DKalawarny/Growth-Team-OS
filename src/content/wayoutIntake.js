/**
 * The way out — the six intake screens (SPEC §2).
 *
 * ⭐ THE ORDER IS THE PRODUCT, AND IT IS NOT ALPHABETICAL OR CONVENIENT.
 * Constraints come first (S1), then the people affected (S2), then what they
 * already own (S3), then money (S4), then what they would trade (S5), and only
 * at the end where they want to end up (S6). Most products of this shape ask
 * for the dream first because it is the pleasant question. Asking it first
 * produces a plan they cannot follow — and worse, it teaches them to answer the
 * constraint questions in a way that protects the dream they just described.
 *
 * ⚠️ Screens are DATA, not six hand-written components. Six near-identical
 * components is six places for the validation, the reflection card, the back
 * button and the progress count to drift apart, and this is the part of the
 * product most likely to be reworded weekly.
 *
 * Field kinds:
 *   chips       multi-select, with `allowCustom` for "+ Add your own"
 *   choice      single-select
 *   rank        drag to order
 *   number      currency input
 *   text        free text (textarea)
 *   shorttext   free text (single line)
 *
 * `required: true` blocks Next and shows the inline message from `emptyMessage`.
 */

export const WAYOUT_OPENING = {
  headline: 'You’re not stuck. You’re missing the order of the steps.',
  // The word to mark. Must appear verbatim in headline and must not wrap.
  highlight: 'the order',
  lead: 'Six honest questions. Then a plan built from what you already have — or what you’d be glad to be rid of.',
  field: {
    key: 'out',
    kind: 'text',
    label: 'In one sentence, what does “out” look like for you?',
    placeholder: 'Not clocking in for someone else. Fridays with my kids.',
    hint: 'Rough is fine. Better questions are coming.',
    required: true,
    emptyMessage: 'A sentence is enough.',
  },
  cta: 'Let’s figure it out',
  // ⚠️ Set at render from pricing.js — the number has to be the same
  // everywhere it appears, and it has to be TRUE about the actual flow.
  fine: 'About 15 minutes.',
  // ⚠️ The ONLY handwritten line in the entire product (SPEC §6). Caveat is
  // loaded for this one string. If a second one appears, the first stops
  // meaning anything.
  handwritten: 'Not another course. Promise.',
}

export const WAYOUT_SCREENS = [
  // ── S1 ────────────────────────────────────────────────────────────────────
  {
    id: 's1',
    section: 'The constraints',
    why: 'Everything else gets built around these, so this is the screen where being straight with yourself matters most. A plan that ignores one of them is no use to you.',
    question: 'What can’t move?',
    // No reflection card before the first screen — there is nothing to reflect
    // on yet, and a card here would have to be generic, which teaches the user
    // to skip all of them.
    reflectAfter: true,
    fields: [
      {
        key: 'immovables',
        kind: 'chips',
        allowCustom: true,
        required: true,
        emptyMessage: 'Add at least one.',
        options: [
          { key: 'kids-home', label: 'Kids at home' },
          { key: 'custody', label: 'Shared custody' },
          { key: 'parent', label: 'Aging parent' },
          { key: 'partner-job', label: 'Partner’s job' },
          { key: 'health', label: 'Health needs care' },
          { key: 'lease', label: 'Lease / mortgage' },
          { key: 'legal', label: 'A legal agreement' },
          { key: 'partners', label: 'Business partners' },
          { key: 'faith', label: 'A community here' },
          // 🔴 THIS WAS MISSING AND THE FIELD IS REQUIRED, so someone genuinely
          // unconstrained could not get past screen one without inventing a
          // tie. On the screen whose entire job is "tell me the truth about
          // what is fixed", the form was insisting there had to be something.
          //
          // ⚠️ Exclusive: "Nothing" and "Shared custody" cannot both be true,
          // and a plan built from a contradiction is worse than one built from
          // a blank.
          { key: 'nothing', label: 'Nothing, really', exclusive: true },
        ],
      },
      {
        key: 'immovablesNote',
        kind: 'text',
        label: 'Which of these is truly fixed, and which have you just never questioned?',
        placeholder: '',
        required: false,
      },

      // ⭐⭐ TWO PROFILE FIELDS, ASKED NEUTRALLY, WITH A REAL "DOESN'T APPLY".
      //
      // Daniel's framing, and it is the right one: a question is not an
      // assertion. A four-box FAMILY · FRIENDS · FINANCE · FAITH grid on a
      // screen a stranger sees would be announcing something at the door —
      // the exact move he reversed on the other product three times, where the
      // line that settled it was "a promise not to preach is still preaching".
      // A field with N/A announces nothing and sorts nobody.
      //
      // ⭐ And the payoff here is practical, not philosophical: BOTH OF THESE
      // ARE CONSTRAINTS ON THE WEEK, which is what this screen is for. Faith is
      // usually a standing commitment — a Sunday morning, a Friday prayer, a
      // Wednesday evening — and a plan that books door-knocking across it is a
      // plan that gets abandoned in week two. Health is the ceiling on what
      // anyone can take on, and it is the constraint that quietly ends plans.
      //
      // 🔴 COLLECTED DISCREETLY, USED BEHAVIOURALLY, NEVER SAID BACK. The map
      // must never open with "as a Christian" or "given your back" — it simply
      // does not schedule work on a Sunday morning, and does not propose
      // hauling to someone who told us they cannot lift. Shown back as a label
      // it becomes the thing it was carefully not being.
      //
      // ⚠️ FREE TEXT, NOT A PICKER. A list of faiths is a list someone can be
      // missing from, and being absent from it is its own small insult. The
      // same goes for a dropdown of conditions.
      {
        key: 'faith',
        kind: 'chips',
        label: 'A faith or practice?',
        hint: 'Asked because it usually holds part of the week — a Sunday, a Friday, a standing evening — and a plan that books work across it is one you’ll abandon.',
        required: false,
        options: [
          { key: 'yes', label: 'Yes' },
          { key: 'na', label: 'Doesn’t apply', exclusive: true },
        ],
      },
      {
        key: 'faithNote',
        kind: 'shorttext',
        placeholder: 'Which, and anything in your week it holds',
        required: false,
      },
      {
        // ⚠️ Daniel: "meant more about exercise, getting in shape — that can be
        // part of being stuck. The idea is that this helps your whole life."
        // Framing it only as a limitation missed half of it: for a lot of
        // people getting their body back IS the way out, or the thing that has
        // to happen before anything else will hold.
        key: 'health',
        kind: 'chips',
        label: 'Your health — where is it in this?',
        hint: 'Both directions count: something that limits what you can take on, or getting back in shape as part of what you’re actually after.',
        required: false,
        options: [
          { key: 'limits', label: 'Something limits me' },
          { key: 'goal', label: 'Getting fitter is part of it' },
          { key: 'energy', label: 'I’m worn out' },
          { key: 'na', label: 'Doesn’t apply', exclusive: true },
        ],
      },
      {
        key: 'healthNote',
        kind: 'shorttext',
        placeholder: 'Only as much as you want to say',
        required: false,
      },
    ],
    hint: 'The plan gets built around these, so it’s worth being honest about which are real.',
  },

  // ── S2 ────────────────────────────────────────────────────────────────────
  {
    id: 's2',
    section: 'Who it has to work for',
    why: 'Almost nothing here happens alone. A plan the people around you haven’t agreed to stalls in month two, and nobody ever writes that down as the reason.',
    question: 'You, and who’s in it with you.',
    reflectAfter: false,
    fields: [
      // 🔴 THE PLAN IS ADDRESSED TO THEM AND WE WERE INVENTING BOTH OF THESE.
      // The design reference's own map header reads "Jake, 23. Nanaimo." — a
      // name and an age we never asked for. Age in particular changes the
      // horizon, the acceptable risk and what is realistic more than almost
      // anything else on this form.
      {
        key: 'name',
        kind: 'shorttext',
        label: 'What should I call you?',
        placeholder: 'First name is fine',
        required: true,
        emptyMessage: 'Just a first name.',
      },
      {
        key: 'age',
        kind: 'shorttext',
        label: 'How old are you?',
        placeholder: '',
        required: true,
        emptyMessage: 'Roughly is fine.',
      },
      {
        // ⭐ Every move about the job you already have — the raise, the shift,
        // four days, contracting back — depends on this, and we were guessing.
        // "Ask for a four-day week" is meaningless to someone self-employed.
        key: 'workType',
        kind: 'choice',
        label: 'What kind of work?',
        required: true,
        emptyMessage: 'Pick the closest one.',
        options: [
          { key: 'employed', label: 'Employed' },
          { key: 'self', label: 'Self-employed' },
          { key: 'contract', label: 'Contract' },
          { key: 'casual', label: 'Casual or shifts' },
          { key: 'seasonal', label: 'Seasonal' },
          { key: 'none', label: 'Not working right now' },
        ],
      },
      {
        key: 'relationship',
        kind: 'choice',
        required: true,
        emptyMessage: 'Pick the closest one.',
        options: [
          { key: 'single', label: 'Single' },
          { key: 'aligned', label: 'Partnered, on the same page' },
          { key: 'nervous', label: 'Partnered, they’re nervous' },
          { key: 'against', label: 'Partnered, they’re against it' },
        ],
      },
      {
        key: 'kidsAges',
        allowCustom: true,
        kind: 'chips',
        label: 'Kids’ ages',
        required: false,
        options: [
          { key: 'none', label: 'None' },
          { key: '0-4', label: '0–4' },
          { key: '5-11', label: '5–11' },
          { key: '12-17', label: '12–17' },
          { key: 'adult', label: 'Adult' },
        ],
      },
      {
        // ⭐ We asked who would FIGHT it and never what they WANT. For someone
        // stepping down, the whole plan routes through their partner, and
        // knowing only that she exists is not enough to plan around her.
        key: 'partnerWants',
        kind: 'text',
        label: 'If there’s someone else in this, what do they want?',
        placeholder: 'Not what they’d object to — what they’d actually like.',
        required: false,
      },
      {
        key: 'peopleNote',
        kind: 'text',
        label: 'Who in your life will fight this plan, and does that matter?',
        required: false,
      },
    ],
  },

  // ── S3 ────────────────────────────────────────────────────────────────────
  // ⭐ The screen the whole product turns on — and the one most likely to lose
  // someone, because it is where they find out whether this thing is for people
  // like them.
  //
  // 🔴 THE FIRST VERSION OF THIS LIST SORTED PEOPLE AT THE DOOR. It was truck,
  // trailer, mower, pressure washer, garage, land, home equity — a list for
  // someone rural or suburban who owns a vehicle and property. A nurse renting
  // a flat, a parent with school hours and no car, someone with a laptop and
  // three free evenings: they tap nothing, on the screen built to tell them
  // they have more than they think, and correctly conclude this is not for
  // them. Same failure as targeting by identity, just wearing overalls.
  //
  // So the groups are the fix, not more chips. They say out loud that a skill,
  // an evening and a person who would sub you work all count as things you
  // already have — which is true, and is usually the faster move for anyone
  // without a driveway.
  //
  // ⚠️ "have", not "own". Owning is a property word, and half of this list is
  // not property.
  {
    id: 's3',
    section: 'What you can start from',
    why: 'Not a wish list — what is already in your life. Most people own or can do more than they count, and the first move almost always comes from this screen.',
    question: 'What have you already got that could earn?',
    reflectAfter: true,
    fields: [
      {
        key: 'assets',
        kind: 'chips',
        allowCustom: true,
        required: true,
        emptyMessage: 'Add at least one. Everyone has something here — it is not only tools and trucks.',
        groups: [
          {
            label: 'Vehicles and gear',
            options: [
              { key: 'truck', label: 'Truck or van' },
              { key: 'trailer', label: 'Trailer' },
              { key: 'car', label: 'A car' },
              { key: 'tools', label: 'Tools' },
              { key: 'mower', label: 'Mower' },
              { key: 'pressure-washer', label: 'Pressure washer' },
              { key: 'camera', label: 'Camera' },
              { key: 'boat', label: 'Boat / jet ski' },
            ],
          },
          {
            label: 'Space',
            options: [
              { key: 'spare-room', label: 'Spare room' },
              { key: 'garage', label: 'Garage' },
              { key: 'parking', label: 'Driveway or parking' },
              { key: 'land', label: 'Land / yard' },
              { key: 'home-equity', label: 'Home equity' },
            ],
          },
          {
            label: 'What you can do',
            options: [
              { key: 'licence', label: 'A ticket or licence' },
              { key: 'trade', label: 'A trade' },
              { key: 'admin', label: 'Books or admin' },
              { key: 'computers', label: 'Good with computers' },
              { key: 'design', label: 'Design or writing' },
              { key: 'teaching', label: 'Teaching or tutoring' },
              { key: 'care', label: 'Care or medical' },
              { key: 'cooking', label: 'Cooking' },
              { key: 'language', label: 'Another language' },
              { key: 'business', label: 'A business already' },
            ],
          },
          {
            label: 'Time and people',
            options: [
              { key: 'evenings', label: 'Evenings' },
              { key: 'weekends', label: 'Weekends' },
              { key: 'school-hours', label: 'School hours' },
              { key: 'sub-work', label: 'Someone who’d sub me work' },
              { key: 'employer', label: 'An employer who’d contract me' },
              { key: 'audience', label: 'A group or following' },
            ],
          },
        ],
      },
      {
        // ⭐ These two catch what no list can. They are the most universal part
        // of the screen — everyone has been asked for help with something — and
        // they are what the seen card is usually built from, because they are
        // the person's own words rather than our labels.
        key: 'askedFor',
        kind: 'text',
        label: 'What do people ask you for help with?',
        required: false,
      },
      {
        key: 'paidFor',
        kind: 'text',
        label: 'What have you been paid for, even once?',
        required: false,
      },
    ],
    hint: 'This is where most people find something they forgot they had.',
  },

  // ── S4 ────────────────────────────────────────────────────────────────────
  {
    id: 's4',
    section: 'The arithmetic',
    why: 'Rough is fine; nothing here is checked. These are the numbers your plan gets built from, and they decide what is actually possible rather than what sounds good.',
    question: 'Money, plainly.',
    reflectAfter: false,
    fields: [
      {
        key: 'takeHome',
        kind: 'number',
        // 🔴 "Monthly take-home" alone was ambiguous, and S2 has already
        // established there may be a partner. Yours or the household's changes
        // the quit number — the single figure the whole plan aims at — and
        // nothing told us which one we had been given.
        label: 'Your monthly take-home',
        hint: 'What actually lands in your account, after tax. Just yours — the household comes next.',
        required: true,
        emptyMessage: 'A rough number is fine.',
      },
      {
        // 🔴 Daniel: "missing major payments, mortgage etc". The label said
        // "must-pay" and left people guessing what counted, so the single most
        // important number on the form was being answered inconsistently.
        key: 'mustPay',
        kind: 'number',
        label: 'What has to go out every month, whatever happens',
        hint: 'Rent or mortgage, insurance, utilities, phone, food, fuel, childcare, loan and card minimums, child support. Everything that happens whether you like it or not.',
        required: true,
        emptyMessage: 'A rough number is fine.',
      },
      {
        key: 'householdTakeHome',
        kind: 'number',
        label: 'Anyone else’s income in the household',
        hint: 'Leave it blank if it is only you.',
        required: false,
      },
      {
        key: 'savings',
        kind: 'number',
        label: 'Savings you could actually reach',
        hint: 'Cash you could use without penalties. It decides how long a bad month is survivable, which decides how bold the plan can be.',
        required: false,
      },
      {
        // ⭐ HOW BOLD THE PLAN IS ALLOWED TO BE. A 23-year-old's downside on a
        // failed first move is a wasted Saturday. A 52-year-old's is his
        // family's security. Same plan shape, completely different acceptable
        // risk — and until now the product would have spoken to both with the
        // same confidence.
        key: 'atStake',
        kind: 'choice',
        label: 'If the first thing you try doesn’t work, what does it cost you?',
        hint: 'This sets how bold the plan is allowed to be. Wasted weekends and a mortgage are different amounts of room.',
        required: true,
        emptyMessage: 'Pick the closest one.',
        options: [
          { key: 'time', label: 'Some wasted weekends' },
          { key: 'savings', label: 'Money I’d rather not lose' },
          { key: 'security', label: 'My family’s security' },
          { key: 'cannot-fail', label: 'It can’t fail — there’s no cushion' },
        ],
      },
      {
        key: 'discretionary',
        kind: 'chips',
        label: 'Spending that isn’t must-pay',
        hint: 'Not to shame anyone — the cut list is usually the fastest money on the page, and it is the only move that needs no customer and nobody’s permission.',
        allowCustom: true,
        required: false,
        options: [
          { key: 'eating-out', label: 'Eating out' },
          { key: 'subscriptions', label: 'Subscriptions' },
          { key: 'vehicle', label: 'The vehicle' },
          { key: 'gym', label: 'Gym / hobbies' },
          { key: 'nights-out', label: 'Nights out' },
          { key: 'shopping', label: 'Shopping' },
          // Not everyone has slack. Saying so out loud matters here: the cut
          // list is where most plans find their first money, and someone with
          // nothing to cut should be told that is an answer, not a failure.
          { key: 'none', label: 'None of this — it’s all must-pay', exclusive: true },
        ],
      },
      {
        // 🔴 It asked "does it get you to the goal?" — on screen four, when the
        // goal is not asked until screen six. People were being tested against
        // something they had not been told yet.
        key: 'fiveYearTest',
        kind: 'text',
        // ⭐ The five-to-ten-year test, asked as one question rather than as a
        // grid per item. A grid turns this into data entry and people abandon
        // it; asked once, in their own words, it is the sentence the cut list
        // gets built from.
        label: 'Which of those would you actually miss?',
        hint: 'Not which ones you could justify — which ones you’d feel the loss of in a year. The rest is usually the fastest money anyone has.',
        required: false,
      },
    ],
  },

  // ── S5 ────────────────────────────────────────────────────────────────────
  {
    id: 's5',
    section: 'What it can cost you, and what’s realistic',
    why: 'Two different things decide the ORDER of the steps: what you’d genuinely trade away, and how much time and risk you actually have. This is both.',
    question: 'What would you trade, and where are you?',
    reflectAfter: true,
    fields: [
      {
        // 🔴 Daniel: "make this a ranking system 1-10 by number, not arrows —
        // and what is Space?" Arrows on nine items is nine rounds of nudging,
        // and one-word labels meant people were ranking things they had to
        // guess the meaning of. Scoring each one is faster, allows ties, and
        // says something an ordering cannot: that two of them matter enormously
        // and the rest barely register.
        key: 'tradeRank',
        kind: 'score',
        label: 'How much does each of these matter to you?',
        hint: '1 is “I’d give this up tomorrow”, 10 is “don’t touch it”. The plan will not trade away the things you score highest, whatever the arithmetic says.',
        required: true,
        emptyMessage: 'Put them in an order, even a rough one.',
        // 🔴 THIS LIST USED TO BE SIX MATERIAL THINGS — comfort, space,
        // stability, proximity, status, savings. The single question in the
        // whole product about what someone actually values offered a menu of
        // money and comfort, on a product whose point is that a life is worth
        // more than its income. Someone who ranks status above their health has
        // told us something no money question could.
        options: [
          { key: 'comfort', label: 'Comfort — the standard of living you’re used to' },
          { key: 'space', label: 'Space — room in the house, a yard, somewhere to work' },
          { key: 'stability', label: 'Stability — knowing what’s coming in each month' },
          { key: 'status', label: 'Status — how it looks to other people' },
          { key: 'savings', label: 'Savings — the cushion staying where it is' },
          { key: 'family-proximity', label: 'Being near family' },
          { key: 'time-with-people', label: 'Time with the people you love' },
          { key: 'health', label: 'Your health and fitness' },
          { key: 'community', label: 'A community you’re part of' },
        ],
      },
      {
        // 🔴 The plan is a sequence and we were asking the horizon in YEARS
        // while never asking how many hours a week exist to build it in. Five
        // hours and twenty-five hours are different plans, not the same plan
        // at different speeds.
        key: 'hoursPerWeek',
        kind: 'choice',
        // 🔴 "hours a week to what? doesn't say."
        label: 'How many hours a week could you put into changing things?',
        hint: 'On top of what you already do — evenings, a weekend morning, whatever is genuinely spare. Be honest rather than hopeful: this decides the order of the moves more than anything else here.',
        required: true,
        emptyMessage: 'Pick the closest one.',
        options: [
          { key: '0-5',   label: 'Under 5' },
          { key: '5-10',  label: '5 to 10' },
          { key: '10-20', label: '10 to 20' },
          { key: '20+',   label: 'More than 20' },
        ],
      },
      {
        // ⭐ THE AXIS THAT WAS MISSING ENTIRELY, and the product did worse than
        // ignore it: the map check FLAGGED a plan as broken when someone in a
        // cold climate had an outdoor first move and no winter work. For the
        // landscaper who earns twelve months of money in six and spends the
        // winter somewhere warm, the December hole IS the plan — and we would
        // have looked at his correct answer and called it a failure.
        // 🔴 "what shape of year — terribly worded."
        key: 'yearShape',
        kind: 'choice',
        label: 'Do you want money coming in evenly, or is earning it in bursts fine?',
        hint: 'Some of the best options are seasonal — hard for six months and then genuinely free. That only suits some people, and it changes the whole plan.',
        required: true,
        emptyMessage: 'Pick the closest one.',
        options: [
          { key: 'steady', label: 'Evenly — the same every month' },
          { key: 'seasonal', label: 'In bursts — flat out, then time off' },
          { key: 'fewer-hours', label: 'Fewer hours every week, all year' },
          { key: 'dontmind', label: 'Don’t mind' },
        ],
      },
      {
        key: 'horizon',
        kind: 'choice',
        label: 'How long before you want to be there?',
        hint: 'Not a deadline — it tells the plan whether to take the fast rough route or the slower one that lasts.',
        required: true,
        emptyMessage: 'Pick one.',
        options: [
          { key: '6m', label: '6 months' },
          { key: '1y', label: '1 year' },
          { key: '3y', label: '3 years' },
          { key: '5y', label: '5+ years' },
        ],
      },
      {
        key: 'locationText',
        kind: 'shorttext',
        label: 'Where are you based, and where does the work happen?',
        hint: 'Season, local economy and what is even possible all turn on this. If the work is online or abroad, say so — it changes the answer.',
        placeholder: 'Nanaimo BC · remote, clients in the US · two weeks on in Alberta',
        required: true,
        emptyMessage: 'Roughly is fine.',
      },
      {
        // ⭐ Without this the plan can confidently hand someone the exact thing
        // that already failed them, which ends their trust in the rest of it.
        // It is also where the real reason usually surfaces — most things do
        // not fail because they were the wrong idea.
        key: 'alreadyTried',
        kind: 'text',
        label: 'What have you already tried, and what happened?',
        placeholder: 'Even something that only lasted a month.',
        required: false,
      },
      {
        // ⭐ A plan whose first move they will never start is worth nothing.
        // Someone who will not knock on doors will not knock on doors, and no
        // amount of good sequencing survives that.
        key: 'refuse',
        kind: 'text',
        label: 'What wouldn’t you do, whatever it paid?',
        placeholder: 'Knocking on doors. Managing people. Anything on a phone.',
        required: false,
      },
      {
        // ⭐ Known timing changes the ORDER, and the order is the product. A
        // lease ending in April or a car paid off in June moves everything.
        key: 'coming',
        kind: 'text',
        label: 'Anything already coming that changes the picture?',
        placeholder: 'A bonus, a lease ending, a car finally paid off, a pension date.',
        required: false,
      },
    ],
  },

  // ── S6 ────────────────────────────────────────────────────────────────────
  {
    id: 's6',
    section: 'Where it ends up',
    why: 'The destination, in your words. The plan is written backwards from here, so the more specific you are, the less generic it can be.',
    question: 'Where does this end up?',
    reflectAfter: false,
    fields: [
      {
        // 🔴 Same correction as the diagnostic: people want several of these at
        // once, and a plan built on one of them because the form only allowed
        // one is built on a misreading.
        key: 'goalType',
        kind: 'chips',
        label: 'Pick as many as are true.',
        required: true,
        emptyMessage: 'Pick at least one.',
        // 🔴 Every option here used to be acquisitive except "more time", so
        // someone who has done well and decided it is not everything had no
        // way to say so — he would tick the nearest wrong thing and the plan
        // would misread him from the first screen. A way out is closing the gap
        // between what a life costs and what it gives back; you can close it
        // from either side.
        options: [
          { key: 'money', label: 'More money' },
          { key: 'time', label: 'More time' },
          { key: 'independent', label: 'Not working for someone else' },
          { key: 'mobile', label: 'Freedom to move' },
          { key: 'simpler', label: 'Less — a simpler life' },
          { key: 'place', label: 'To be somewhere else' },
        ],
      },
      {
        // ⭐ AND THEN THE QUESTION THE WHOLE PRODUCT IS ABOUT. You can want
        // three things; a plan still has to put them in an order, and that is
        // the thing being sold. Asking which comes first is not a limitation —
        // it is the product's own premise applied to the goals.
        key: 'goalFirst',
        kind: 'choice',
        label: 'If you could only have one of them this year, which?',
        required: false,
        options: [
          { key: 'money', label: 'More money' },
          { key: 'time', label: 'More time' },
          { key: 'independent', label: 'Not working for someone else' },
          { key: 'mobile', label: 'Freedom to move' },
          { key: 'simpler', label: 'Less — a simpler life' },
          { key: 'place', label: 'To be somewhere else' },
        ],
      },
      {
        key: 'tuesday',
        kind: 'text',
        label: 'Three years out — where, doing what, with whom. What does a Tuesday look like?',
        required: true,
        emptyMessage: 'A few lines is enough.',
      },
      {
        // ⭐⭐ THE QUESTION NOBODY HAS EVER ASKED THEM. For the person stepping
        // down it is the number the entire plan turns on, and most people have
        // never said it out loud — which is why the honest answer is sometimes
        // "you passed it two years ago".
        key: 'enough',
        kind: 'text',
        // 🔴 "too vague of a question". It is the most important number on the
        // form and it was asked in three words with no anchor.
        label: 'What would you need coming in each month for this to be worth it?',
        hint: 'A number if you have one. If not, describe the week you’d be happy with and it’ll work the number out. This is the figure the whole plan aims at — and sometimes the useful answer is that you passed it already.',
        placeholder: '$4,500 and my Fridays · enough that I stop checking the balance',
        required: false,
      },
    ],
  },
]

/** Screens whose completion triggers a reflection card on the NEXT screen. */
/**
 * The open door — the last step, after the six questions.
 *
 * ⭐⭐ WHY IT IS LAST AND NOT FIRST. Asked cold at the start, "tell me about
 * your life" gets a shrug and two lines — nobody knows what kind of detail
 * matters yet. Asked after six specific questions, and immediately after "what
 * are you running from and running toward", people know exactly what this thing
 * is for and write the real thing. The most useful sentence in the whole intake
 * usually lands here.
 *
 * ⭐ It is also the only field that can carry what no list can: an illness, a
 * bankruptcy, a marriage that is ending, a record, a kid who needs more than
 * the others, the job that is about to go. Every one of those changes the plan,
 * and none of them is a chip.
 *
 * ⚠️ NOT NUMBERED, so the promise on the opening screen — "six honest
 * questions" — stays true. It is a door, not a seventh interrogation.
 *
 * ⚠️ NOT REQUIRED. A forced life story gets "n/a", and then we have taught them
 * the box is a formality.
 */
export const WAYOUT_OPEN = {
  question: 'Anything else?',
  lead: 'The questions were narrow on purpose. This is where you say the thing they missed.',
  field: {
    key: 'story',
    kind: 'text',
    label: 'What else should I know about your situation?',
    placeholder: 'Whatever matters. What went wrong before, what you are carrying, what you have already tried, what you would never do again.',
    required: false,
  },
  hint: 'Take as long as you want. Nobody reads this but the plan.',
  cta: 'See the plan',
}

export const REFLECT_AFTER = WAYOUT_SCREENS.filter(s => s.reflectAfter).map(s => s.id)

export const WAYOUT_TOTAL_SCREENS = WAYOUT_SCREENS.length
