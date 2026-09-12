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
  lead: 'Six honest questions. Then a plan built from what you already have, written like a friend would.',
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
  fine: 'About 15 minutes. Nothing to buy until you’ve seen your plan.',
  // ⚠️ The ONLY handwritten line in the entire product (SPEC §6). Caveat is
  // loaded for this one string. If a second one appears, the first stops
  // meaning anything.
  handwritten: 'Not another course. Promise.',
}

export const WAYOUT_SCREENS = [
  // ── S1 ────────────────────────────────────────────────────────────────────
  {
    id: 's1',
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
          { key: 'parent', label: 'Aging parent nearby' },
          { key: 'partner-job', label: 'Partner’s job is here' },
          { key: 'health', label: 'Health needs care nearby' },
          { key: 'lease', label: 'Lease / mortgage' },
          { key: 'legal', label: 'Separation or legal agreement' },
          { key: 'partners', label: 'Business partners' },
          { key: 'faith', label: 'A community I won’t leave' },
        ],
      },
      {
        key: 'immovablesNote',
        kind: 'text',
        label: 'Which of these is truly fixed, and which have you just never questioned?',
        placeholder: '',
        required: false,
      },
    ],
    hint: 'The plan gets built around these, so it’s worth being honest about which are real.',
  },

  // ── S2 ────────────────────────────────────────────────────────────────────
  {
    id: 's2',
    question: 'Who’s in it with you?',
    reflectAfter: false,
    fields: [
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
        key: 'peopleNote',
        kind: 'text',
        label: 'Who in your life will fight this plan, and does that matter?',
        required: false,
      },
    ],
  },

  // ── S3 ────────────────────────────────────────────────────────────────────
  // ⭐ The screen the whole product turns on. The spec calls this the jet-ski
  // case: the thing someone owns and never counted is usually the fastest move
  // they have, and it is almost never on anyone's list. Custom chips must look
  // and behave exactly like built-ins, or the custom entry reads as an
  // afterthought and gets treated as one by the person filling it in.
  {
    id: 's3',
    question: 'What do you already own that could earn?',
    reflectAfter: true,
    fields: [
      {
        key: 'assets',
        kind: 'chips',
        allowCustom: true,
        required: true,
        emptyMessage: 'Add at least one. Most people own more than they think.',
        options: [
          { key: 'truck', label: 'Truck' },
          { key: 'trailer', label: 'Trailer' },
          { key: 'pressure-washer', label: 'Pressure washer' },
          { key: 'mower', label: 'Mower' },
          { key: 'tools', label: 'Tools' },
          { key: 'spare-room', label: 'Spare room' },
          { key: 'garage', label: 'Garage' },
          { key: 'home-equity', label: 'Home equity' },
          { key: 'camera', label: 'Camera' },
          { key: 'boat', label: 'Boat / jet ski' },
          { key: 'land', label: 'Land / yard' },
          { key: 'business', label: 'A business' },
          { key: 'licence', label: 'A licence or ticket' },
        ],
      },
      {
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
    question: 'Money, plainly.',
    reflectAfter: false,
    fields: [
      {
        key: 'takeHome',
        kind: 'number',
        label: 'Monthly take-home',
        required: true,
        emptyMessage: 'A rough number is fine.',
      },
      {
        key: 'mustPay',
        kind: 'number',
        label: 'Monthly must-pay',
        hint: 'Rent or mortgage, debt, kids. The things that happen whether you like it or not.',
        required: true,
        emptyMessage: 'A rough number is fine.',
      },
      {
        key: 'savings',
        kind: 'number',
        label: 'Savings on hand',
        required: false,
      },
      {
        key: 'discretionary',
        kind: 'chips',
        label: 'Spending that isn’t must-pay',
        allowCustom: true,
        required: false,
        options: [
          { key: 'eating-out', label: 'Eating out' },
          { key: 'subscriptions', label: 'Subscriptions' },
          { key: 'vehicle', label: 'Vehicle beyond need' },
          { key: 'gym', label: 'Gym / hobbies' },
          { key: 'nights-out', label: 'Nights out' },
          { key: 'shopping', label: 'Shopping' },
        ],
      },
      {
        key: 'fiveYearTest',
        kind: 'text',
        // ⭐ The five-to-ten-year test, asked as one question rather than as a
        // grid per item. A grid turns this into data entry and people abandon
        // it; asked once, in their own words, it is the sentence the cut list
        // gets built from.
        label: 'For each of those: does it get you to the goal? Will it matter in five years?',
        required: false,
      },
    ],
  },

  // ── S5 ────────────────────────────────────────────────────────────────────
  {
    id: 's5',
    question: 'What would you trade, and where are you?',
    reflectAfter: true,
    fields: [
      {
        key: 'tradeRank',
        kind: 'rank',
        label: 'Drag these into order — what you’d give up first at the top.',
        required: true,
        emptyMessage: 'Put them in an order, even a rough one.',
        options: [
          { key: 'comfort', label: 'Comfort' },
          { key: 'space', label: 'Space' },
          { key: 'stability', label: 'Stability' },
          { key: 'family-proximity', label: 'Proximity to family' },
          { key: 'status', label: 'Status' },
          { key: 'savings', label: 'Savings' },
        ],
      },
      {
        key: 'horizon',
        kind: 'choice',
        label: 'How long are you giving this?',
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
        label: 'Where are you?',
        placeholder: 'City or region',
        required: true,
        emptyMessage: 'The plan depends on it — season and local economy both.',
      },
      {
        key: 'seasonNote',
        kind: 'text',
        label: 'What’s the season like there, and what’s the economy doing?',
        required: false,
      },
      {
        key: 'worstVersion',
        kind: 'text',
        label: 'What’s the worst version of this you’d still say yes to?',
        required: false,
      },
    ],
  },

  // ── S6 ────────────────────────────────────────────────────────────────────
  {
    id: 's6',
    question: 'Where does this end up?',
    reflectAfter: false,
    fields: [
      {
        key: 'goalType',
        kind: 'choice',
        required: true,
        emptyMessage: 'Pick the one that’s most true.',
        options: [
          { key: 'money', label: 'More money' },
          { key: 'time', label: 'More time' },
          { key: 'independent', label: 'Not working for someone else' },
          { key: 'mobile', label: 'Freedom to move' },
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
        key: 'fromToward',
        kind: 'text',
        label: 'What are you running from, and what are you running toward?',
        required: false,
      },
    ],
  },
]

/** Screens whose completion triggers a reflection card on the NEXT screen. */
export const REFLECT_AFTER = WAYOUT_SCREENS.filter(s => s.reflectAfter).map(s => s.id)

export const WAYOUT_TOTAL_SCREENS = WAYOUT_SCREENS.length
