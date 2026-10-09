/**
 * The way out — the questions for a SECOND (or fifth) plan.
 *
 * 🔴🔴 THE WHOLE POINT IS THAT THESE ARE NOT THE FIRST ONES. Daniel: "it needs
 * to be different, like entering a new level — not the same background,
 * different questions. If it's the same, people will stop using it."
 *
 * ⚠️ AND HE IS RIGHT ABOUT THE MECHANISM, NOT JUST THE FEELING. The chapter
 * machinery already carried almost everything forward, so only four answers were
 * ever actually cleared — but the person was still dropped into the middle of the
 * six intake screens and pressed Next through the rest with the boxes filled in.
 * Functionally efficient, experientially identical to starting over, which is the
 * one thing a product that FINISHES cannot afford.
 *
 * ⭐⭐ SO THESE ARE QUESTIONS ONLY A RETURNING PERSON CAN BE ASKED. That is the
 * test every one of them passes, and it is what makes this screen impossible to
 * confuse with the intake: nobody arriving for the first time has a last time.
 *
 *   ❌ "What can't move?"            — asked once, still true, never asked again
 *   ✅ "What did doing it teach you that the questions couldn't have asked?"
 *
 * ⭐ FIVE, AND NO MORE. The reason somebody is here is that the last plan
 * finished. A long form in front of that is a tax on the best moment this
 * product has.
 */

/**
 * ⚠️ MIRRORS `CHAPTER_CLEARS_*` IN chapterHistory.js, AND MUST. Those constants
 * decide what `startNextChapter` wipes; these are the questions that fill the
 * holes it made. If one list grows and the other does not, a plan is built from
 * a blank — which is exactly the `out` bug this file was written alongside.
 */
export const CHAPTER_SCREEN = {
  /** Always asked — the money moved, whatever happened. */
  always: [
    {
      key: 'chapterChanged',
      kind: 'text',
      label: 'What actually changed?',
      hint: 'Since the last plan. The facts, not the feeling: what is different about your week, your money or the people around you.',
      placeholder: 'The debt is gone. Same hours as before. One less person at home.',
      dictate: true,
      required: true,
      emptyMessage: 'A couple of lines. This is the one that shapes the rest.',
    },
    {
      /**
       * ⭐⭐ THE QUESTION THAT ONLY EXISTS BECAUSE THEY DID IT. It is the most
       * valuable thing in the file: somebody who has run three moves knows
       * something about their own situation that no intake question could have
       * extracted, and it is usually the thing that made the last plan wrong.
       */
      key: 'chapterLearned',
      kind: 'text',
      label: 'What do you know now that you didn’t when you started?',
      hint: 'Anything the doing taught you: about the work, the numbers, or what you will actually put up with.',
      placeholder: 'I will not do the admin side of it. And everything takes longer than people say.',
      dictate: true,
      required: false,
    },
    { key: 'takeHome', kind: 'number', label: 'Coming in each month now', hint: 'After tax. Roughly.', required: true, emptyMessage: 'A rough number is fine.' },
    { key: 'mustPay',  kind: 'number', label: 'Going out each month now', hint: 'Everything that has to be paid.', required: true, emptyMessage: 'A rough number is fine.' },

    /**
     * 🔴🔴 THE TWO MONEY LINES A PLAN IS MOST LIKELY TO HAVE CHANGED, AND THEY
     * WERE CARRIED OVER UNTOUCHED. Daniel: "stage 2 lacks a couple of questions
     * that should be asked about life and money — it doesn't ask where things
     * are in those things fully."
     *
     * ⭐⭐ HOUSING IS THE ONE THE ARITHMETIC DEPENDS ON. `WAYOUT_MONEY` requires
     * the plan to re-size the floor whenever a move ends a recurring cost — and
     * the commonest first move in this product is selling a house. So the chapter
     * that follows it was asked for a new total while silently keeping last
     * year's housing line inside it. The floor cannot be recomputed from a number
     * that did not move.
     *
     * ⚠️ Optional, both of them. They are numbers, they are fast, and demanding
     * them would push this screen past the five-required ceiling for no gain —
     * somebody who skips them is no worse off than they were before.
     */
    { key: 'housingCost', kind: 'number', label: 'Of that, how much is housing now?', hint: 'Rent or mortgage plus tax, insurance, heat and hydro. If you sold or moved, this is the line that changed most.', required: false },
    { key: 'debt', kind: 'text', label: 'What you owe now, and what it costs you', hint: 'Balances and rates. Paid something off since last time? Say so. It changes what the plan can be bold about.', dictate: true, required: false },
    /* 🔴 "what could you reach today? does that mean savings?" — it did, and
       nobody should have to ask. The label avoided the word "savings" because
       some people have none and it can sting; the cost was that nobody knew
       what was being asked. ⭐ Name the thing; let the hint carry the
       reassurance. */
    { key: 'savings',  kind: 'number', label: 'Savings you could get to today', hint: 'Cash you could actually reach without a penalty. Zero is an answer.', required: false },
  ],

  /**
   * ⭐⭐ WHAT ELSE MOVED — ASKED AS TAPS, NOT AS QUESTIONS.
   *
   * 🔴 Eleven answers about a person's life carry over untouched into a new
   * chapter: where they live, who is at home, their hours, their health, what
   * cannot move. Every one of those genuinely changes over the months a plan
   * runs — and the plan is often what changes them. The first plan here was
   * "family on the road"; carrying its location answer forward means the second
   * plan is built for an address they no longer have.
   *
   * ⭐⭐ BUT RE-ASKING THEM ALL WOULD REBUILD THE INTAKE, which is the one thing
   * this screen exists to avoid. So the default is that everything carries over
   * and they TAP what moved — one row of chips, and a field appears only for
   * what they picked. Nothing changed is one tap and no writing at all.
   */
  moved: [
    {
      key: 'chapterMoved',
      kind: 'chips',
      /**
       * 🔴 "this is vague." It read "Has anything else moved?" — and "moved" is
       * the wrong word twice over: it can mean moved HOUSE, which is one of the
       * options, and it can mean moved ON. "Anything else" then names no domain
       * at all, so the question relies entirely on the reader looking down at the
       * chips to work out what is being asked.
       * ⭐ The question points AT the answers now, and the chips are parallel —
       * four things somebody owns, in the same grammatical shape, so the set
       * reads as one question rather than four unrelated taps.
       */
      label: 'Is any of this different now?',
      hint: 'Everything else you told us still stands. Tap only what has changed.',
      required: false,
      options: [
        { key: 'where',   label: 'Where I live' },
        { key: 'who',     label: 'Who’s at home' },
        { key: 'hours',   label: 'My hours' },
        { key: 'health',  label: 'My health' },
        { key: 'nothing', label: 'None of these', exclusive: true },
      ],
    },
    {
      key: 'locationText',
      kind: 'shorttext',
      label: 'Where are you based now?',
      hint: 'And where the work actually happens, if those are different.',
      required: false,
      showIf: a => picked(a, 'where'),
    },
    {
      key: 'peopleNote',
      kind: 'text',
      label: 'Who is at home now, and what changed?',
      hint: 'A partner, kids, somebody who moved in or out. It decides what a plan is allowed to ask of your week.',
      dictate: true,
      required: false,
      showIf: a => picked(a, 'who'),
    },
    {
      key: 'hoursPerWeek',
      kind: 'choice',
      label: 'How many hours a week could you put into it now?',
      required: false,
      options: [
        { key: 'few',   label: 'A couple, if that' },
        { key: 'five',  label: 'About five' },
        { key: 'ten',   label: 'Ten or so' },
        { key: 'twenty', label: 'Twenty plus' },
        { key: 'allday', label: 'It is what I do now' },
      ],
      showIf: a => picked(a, 'hours'),
    },
    {
      key: 'healthNote',
      kind: 'text',
      label: 'What changed with your health?',
      hint: 'Only as much as you want to say. It changes what a plan can reasonably ask of you.',
      dictate: true,
      required: false,
      showIf: a => picked(a, 'health'),
    },
  ],

  /**
   * 🔴🔴 ASKED OF EVERYONE NOW, AND THE OLD RULE WAS EXACTLY BACKWARDS.
   *
   * It read: "only when the destination was cleared — somebody who answered
   * partly or no has NOT arrived, so their destination stands." That sounds
   * careful and it meant **half the people were never asked where they wanted to
   * get to.** "Closer, not there" and "I did it all and it didn't land" are the
   * two answers most likely to come with a changed mind — and those were the two
   * the product refused to ask.
   *
   * Daniel: *"there should be a general question on where do you want to be now
   * that you're at this stage."*
   *
   * ⭐⭐ THE OUTCOME CHANGES THE WORDING, NOT WHETHER IT IS ASKED. Somebody who
   * arrived is being asked what is next; somebody who did the work and watched it
   * fail is being asked whether the destination survived. Same field, same
   * answer key, honest sentence either way — see `destinationLabel`.
   */
  destination: [
    {
      key: 'out',
      kind: 'text',
      // ⚠️ Label is set per outcome by chapterFields — see destinationLabel.
      label: 'Where do you want to get to now?',
      hint: 'One sentence, the way you would say it out loud.',
      placeholder: 'Out of the job, with enough coming in that I am not counting it every week.',
      dictate: true,
      required: true,
      emptyMessage: 'A sentence is enough.',
    },
    {
      /**
       * ⚠️ OPTIONAL ON A CHAPTER, REQUIRED ON A FIRST PLAN, AND THE DIFFERENCE IS
       * EARNED. With `out` above it, a "landed" chapter demanded THREE written
       * answers — what changed, what out means now, and a normal day — which is
       * the seven-required wall from screen five of the intake growing back in a
       * new place.
       *
       * ⭐⭐ `out` AND THIS ASK THE SAME QUESTION AT TWO ZOOM LEVELS. On a first
       * plan the detail is everything, because nothing else is known. On a
       * chapter the product already holds their town, their hours, their
       * immovables and a finished plan — so one sentence is enough to aim at,
       * and the day stays there for whoever wants to paint it.
       * ⚠️ It is still ASKED, which is the part that matters: `chapterAnswers`
       * clears it, and a field cleared but never offered is the `out` bug.
       */
      key: 'tuesday',
      kind: 'text',
      label: 'And a year from here, what does a normal day look like?',
      hint: 'Optional. The sentence above is enough to aim at. Worth filling in if the picture has changed shape as well as direction.',
      placeholder: 'Same town, fewer hours, and home when the kids get in.',
      dictate: true,
      required: false,
    },
  ],
}

/**
 * ⭐⭐ THE SAME QUESTION, IN THE SENTENCE THAT IS HONEST FOR THIS PERSON.
 *
 * Asking "so where now?" of somebody who just told you their plan did not land
 * is the product not listening. Asking "is that still where you want to get to?"
 * of somebody who arrived is worse. One field, one answer key, four sentences.
 *
 * ⚠️ None of them congratulate and none of them commiserate — the register rule
 * holds here as everywhere: direct about the situation, never directive about
 * the person.
 */
const DESTINATION_LABEL = {
  landed:  'You got there. So where do you want to get to now?',
  changed: 'So where do you want to get to now?',
  partly:  'You are closer. Is that still where you are headed, or has it moved?',
  no:      'That route did not work. Is that still where you want to get to?',
}

/** Was this one of the things they said had moved? */
function picked(answers, key) {
  const v = answers?.chapterMoved
  return Array.isArray(v) ? v.includes(key) : v === key
}

/**
 * The fields this chapter actually needs, given how the last one ended.
 * ⚠️ `moved` is always included — what a person's life is doing does not depend
 * on whether they reached a destination.
 */
export function chapterFields(outcome) {
  return [...CHAPTER_SCREEN.always, ...CHAPTER_SCREEN.moved, ...CHAPTER_SCREEN.destination]
    .map(f => (f.key === 'out' && DESTINATION_LABEL[outcome]
      ? { ...f, label: DESTINATION_LABEL[outcome] }
      : f))
}

/** Only the fields that apply, given what they have said so far. */
export function visibleChapterFields(outcome, answers) {
  return chapterFields(outcome).filter(f => !f.showIf || f.showIf(answers))
}

/**
 * ⚠️ The line at the top changes with how the last one ended, because the same
 * sentence cannot be honest for somebody who arrived and somebody who did the
 * work and watched it fail.
 */
export const CHAPTER_LEAD = {
  landed:  'You got there. So this one starts from a different question, where now.',
  changed: 'You want something else now. Everything true about your situation carries over; the destination is yours to reset.',
  partly:  'Same destination, closer to it. The route from here is not the route you were given at the start.',
  no:      'That route did not work. The destination stands, and the next plan will not contain it.',
}
