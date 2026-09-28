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
      hint: 'Since the last plan. The facts, not the feeling — what is different about your week, your money or the people around you.',
      placeholder: 'House sold in November. Debt is gone. Still doing the same six days.',
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
      hint: 'Anything the doing taught you — about the work, the numbers, or what you will actually put up with.',
      placeholder: 'I hate managing people more than I thought. And the rental took twice as long to fill.',
      dictate: true,
      required: false,
    },
    { key: 'takeHome', kind: 'number', label: 'Coming in each month now', hint: 'After tax. Roughly.', required: true, emptyMessage: 'A rough number is fine.' },
    { key: 'mustPay',  kind: 'number', label: 'Going out each month now', hint: 'Everything that has to be paid.', required: true, emptyMessage: 'A rough number is fine.' },
    { key: 'savings',  kind: 'number', label: 'What you could reach today', hint: 'Cash you could use without a penalty.', required: false },
  ],

  /**
   * ⚠️ ONLY WHEN THE DESTINATION WAS CLEARED — "landed" or "changed". Somebody
   * who answered "partly" or "no" has NOT arrived, so their destination stands
   * and asking again would be the product forgetting what they just told it.
   */
  arrived: [
    {
      key: 'out',
      kind: 'text',
      label: 'So what does “out” look like now?',
      hint: 'One sentence, the way you would say it.',
      placeholder: 'Off the road, one property running itself, the apps paying the rest.',
      dictate: true,
      required: true,
      emptyMessage: 'A sentence is enough.',
    },
    {
      key: 'tuesday',
      kind: 'text',
      label: 'And a normal day, three years from here?',
      hint: 'Ordinary detail beats big words — what you get up for, who is around, what you are doing by mid-morning.',
      placeholder: 'Somewhere warm for the winter. Kids with us. Two hours of work before anyone else is up.',
      dictate: true,
      required: true,
      emptyMessage: 'A few lines is enough.',
    },
  ],
}

/** The fields this chapter actually needs, given how the last one ended. */
export function chapterFields(outcome) {
  const arrived = outcome === 'landed' || outcome === 'changed'
  return arrived
    ? [...CHAPTER_SCREEN.always, ...CHAPTER_SCREEN.arrived]
    : CHAPTER_SCREEN.always
}

/**
 * ⚠️ The line at the top changes with how the last one ended, because the same
 * sentence cannot be honest for somebody who arrived and somebody who did the
 * work and watched it fail.
 */
export const CHAPTER_LEAD = {
  landed:  'You got there. So this one starts from a different question — where now.',
  changed: 'You want something else now. Everything true about your situation carries over; the destination is yours to reset.',
  partly:  'Same destination, closer to it. The route from here is not the route you were given at the start.',
  no:      'That route did not work. The destination stands, and the next plan will not contain it.',
}
