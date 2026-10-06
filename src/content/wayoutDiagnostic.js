/**
 * The way out — the free diagnostic (SPEC §7).
 *
 * 🔴 THE PATH IS DECIDED BY RULES, NOT BY THE MODEL, AND IT HAS TO BE.
 * This route is public and unauthenticated — it is the marketing front door.
 * The `claude` edge function requires a JWT and meters spend against a company,
 * so there is nothing for an anonymous visitor to call. Even if there were, it
 * would be a model call on the one page built to be hit by strangers and bots,
 * which is a bill with no floor.
 *
 * Six taps in, one of four paths out. The rules are legible, instant, free, and
 * — the part that matters — the same answer every time for the same taps, which
 * is what lets the copy on the result screen actually name why the other three
 * don't fit.
 *
 * ⚠️ NO FREE TEXT ON THIS SCREEN. Every answer is a tap. That is what makes an
 * anonymous-insert policy safe on `wayout_diagnostics` (migration 046) — the
 * table holds six enum answers, a climate, a country, and nothing a person
 * wrote beyond the optional note.
 */

/**
 * The opening beat, before question one.
 *
 * 🔴 WITHOUT IT A COLD VISITOR GOT "1 of 6" AND "What are you actually after?"
 * with no idea what they had clicked, how long it would take, or whether they
 * were about to be sold something. This is the free front door, so it is the
 * first thing anyone ever sees of this product.
 *
 * ⭐ IT NAMES THE SITUATION RATHER THAN MAKING A CLAIM. "Get unstuck today" is
 * advertising, and advertising register is what got nine headlines rejected on
 * the other product. The proof is not in the copy — it is that three minutes
 * later the thing names which path fits AND why the other three do not, which
 * no landing page can claim as convincingly as the product can simply do.
 *
 * ⚠️ The reasoning for the CURRENT headline is on the constant below. This block
 * used to argue for "You probably already know three things you could do", which
 * has not existed since 26 Sep — a comment defending removed copy is worse than
 * no comment, because the next person reads it as the standing decision.
 */
/**
 * 🔴🔴 REWRITTEN 26 Sep. Daniel, on the live page: "this is still not really
 * speaking to me — inside, how it's designed, is more on point."
 *
 * The old headline was "You probably already know three things you could do."
 * It is a riddle: it asks the reader to work out what the product is before it
 * has given them a reason to care, and "three things" names no thing at all. And
 * it argued the WEAKEST version of the promise — that you have options — to
 * somebody whose whole problem is that they already have options.
 *
 * ⭐⭐ THE PROMISE IS ELIMINATION, AND IT IS THE ONE THING NOTHING ELSE OFFERS.
 * Being stuck is almost never a shortage of ideas. It is four plausible routes,
 * no way to choose, and a year lost to half-doing two of them. There are exactly
 * four paths in PATHS below, the diagnostic names one and says why the other
 * three do not fit — so "three of them are wrong for you" is not copy, it is
 * literally what the next three minutes produce.
 *
 * ⚠️ "earning more or needing less" is load-bearing, not balance. Without it this
 * reads as a make-money quiz, and the person who has done well and wants a
 * smaller life — half the product — closes the tab on the first screen.
 *
 * ⚠️ NO HANDWRITING HERE. Caveat is used exactly once in the whole product, on
 * the paid opening screen. A second one and neither means anything.
 *
 * 🔴 AND CONTRACTIONS ALONE WERE NOT IT. That was my first fix and Daniel came
 * back: "looks good but doesn't have the Tony Robbins sound to it." He was right
 * twice. Casual grammar on an ANALYTICAL STRUCTURE is still analysis — "being
 * stuck is rarely a shortage of options" describes a category, and describing
 * somebody's category to them is what a report does, not a person.
 *
 * ⭐⭐ THE DEVICE IS THE REVERSAL: tell them the problem is not the one they
 * think it is. It is not a rhetorical trick here — it is the product's actual
 * position, which is why it can be said flatly and still be true. Everything
 * else in the world sells them another idea; this says which of four is open.
 *
 * 🔴🔴 AND THE FIRST REVERSAL ASSUMED THEY HAD IDEAS, WHICH IS A PREMISE ABOUT
 * THEM THAT CAN BE FALSE. It read "You don't have an ideas problem. You've had
 * the ideas for months." Daniel: "also someone might not have an idea." He is
 * right and it is not a nitpick — telling somebody what they have been thinking
 * about for months, when they have not, is this product failing at the only
 * thing it cannot fail at. They stop believing they were read, and every other
 * claim on the page goes with it.
 *
 * ⭐⭐ SO THE LEAD NOW COVERS BOTH ARRIVALS AND LANDS ON WHAT IS TRUE OF EACH.
 * Somebody with three ideas cannot choose between them. Somebody with none does
 * not know what is even available. What unites them is that NOBODY HAS EVER
 * LAID OUT WHICH ROUTES ARE ACTUALLY OPEN GIVEN THEIR SITUATION — which is
 * exactly what the four paths below do, so the lead hands straight to them.
 *
 * ⚠️ "Maybe… maybe…" is also the more spoken shape. It offers rather than
 * asserts, which is what somebody does when they do not yet know who they are
 * talking to.
 *
 * ⚠️ Short sentences carry it. A reversal inside a long flowing clause stops
 * being a reversal and becomes a comparison.
 *
 * ⭐⭐ AND IT IS WRITTEN SPOKEN, WITH CONTRACTIONS. Daniel on the first version:
 * "it sounds kind of AI like — it needs that human touch." He was right and the
 * tell was mechanical: balanced clauses, "it is not X, it is Y", and not one
 * contraction anywhere. Nobody talks like that. The four PATHS below already
 * used them — "you're sitting on the thing most people spend three years trying
 * to build" — and read twice as human as the screen introducing them.
 *
 * 🔴 SPOKEN IS NOT HYPED. The lead names a private moment: turning it over at
 * night and landing somewhere different each time. Specific, and true of almost
 * everybody who arrives here. It is never "you've got this", which WAYOUT_VOICE
 * bans outright for carrying no information — the warmth comes from naming what
 * actually happens to them, not from adjectives.
 *
 * ⚠️ THE REGISTER IS DELIBERATELY WARMER HERE THAN IN THE PLAN. This page talks
 * to a stranger who owes us nothing; the plan talks to somebody who has just
 * handed over their money and what they are frightened of, and that conversation
 * is quieter. The difference is intended — do not "fix" one to match the other.
 */
export const DIAGNOSTIC_OPENING = {
  headline: 'There are four ways out of this. Only one of them is yours.',
  /**
   * 🔴🔴 THE MARK GOES ON THE WAY OUT, NOT ON THE COST. Daniel, 27 Sep: "i like
   * the highlight but do you think it's highlighting the negative part of this
   * statement, not the positive?" It was, and it is the loudest element on the
   * page — the one thing a reader takes in before they have read a word of the
   * sentence around it. "cost you a year" made that a threat.
   *
   * ⭐⭐ AND IT CONTRADICTED THE PRODUCT. The whole posture here is that you do
   * not have to act from fear; somebody arriving at eleven at night is already
   * frightened and does not need the page adding to it. "four ways out" is the
   * genuinely hopeful claim on this screen — that ways out exist at all, and
   * that they can be counted. The cost stays in the sentence, doing its work
   * quietly, which is where a stake belongs.
   *
   * ⚠️ It also lands clean on the first line rather than straddling the wrap.
   *
   * 🔴🔴 AND THE SECOND SENTENCE WENT THE SAME WAY, ONE ROUND LATER. It read
   * "Three of them will cost you a year." Daniel: "cost you a year — for the
   * first intro to this page it wouldn't make sense to someone." He is right on
   * two counts at once and both are worth keeping:
   *
   *   1. IT ASSUMED CONTEXT THEY DO NOT HAVE. Cost you a year of WHAT? The
   *      sentence only parses once you already know this thing picks one path
   *      and that the other three are time spent going nowhere — which is the
   *      thing the page is trying to explain. A headline cannot depend on its
   *      own conclusion.
   *   2. IT WAS STILL THE NEGATIVE HALF, one commit after the highlight was
   *      moved off the cost for exactly that reason. Moving the mark and leaving
   *      the threat in the sentence is doing half the job.
   *
   * ⭐⭐ "Only one of them is yours" is immediately legible with no setup, it is
   * literally true — the diagnostic names exactly one — and it hands straight to
   * "Which one is yours?" over the four cards below. The elimination promise
   * survives in full; it is just told from the side where somebody gains
   * something rather than the side where they lose a year.
   */
  highlight: 'four ways out',
  lead: 'Maybe you’ve got three ideas and can’t pick. Maybe you’ve got none at all. Either way, nobody has told you which of these four is actually open to you.',
  body: 'A handful of questions and you’ll know which one is yours, and exactly why the other three aren’t, whether getting out means earning more or needing less. Keep going from there and it becomes the plan. About twenty minutes, start to finish.',
  cta: 'Show me which one',
  // ⭐⭐ THE WHOLE POSITION, ON THE FIRST PAGE. Daniel: "just being straight,
  // first page, no bait and switch." "This part is free" implies other parts
  // are not, which is the sentence a person braced for a bait-and-switch is
  // scanning for. Say the entire arrangement in one breath, before a single
  // tap, and there is nothing left to dread.
  // ⚠️ Kept true to what happens: these six taps need no account; the plan
  // needs one at the end, to keep it; nothing is charged while payments are off.
  fine: 'No card. These questions need no account; you make one at the end to keep your plan. Nothing is charged.',
}

export const DIAGNOSTIC_QUESTIONS = [
  {
    key: 'goalType',
    // ⭐ The kicker is what stops six screens reading as one form repeated —
    // each question gets a reason to exist before it is asked.
    kicker: 'First, the point of all this',
    // 🔴 SINGLE-SELECT WAS WRONG AND IT WAS THE FIRST THING ANYONE SAW. Wanting
    // more time AND more money is the normal case, not an edge case — forcing
    // one gives a wrong answer and tells the person on screen one that this
    // thing does not understand ordinary life.
    multi: true,
    question: 'What are you actually after?',
    hint: 'Pick as many as are true.',
    options: [
      { key: 'money',       label: 'More money' },
      { key: 'time',        label: 'More time' },
      { key: 'independent', label: 'Not working for someone else' },
      { key: 'mobile',      label: 'Freedom to move' },
    ],
  },
  {
    key: 'horizon',
    // ⭐ The kicker is what stops six screens reading as one form repeated —
    // each question gets a reason to exist before it is asked.
    kicker: 'The clock',
    question: 'How long are you giving it?',
    options: [
      { key: '6m', label: '6 months' },
      { key: '1y', label: '1 year' },
      { key: '3y', label: '3 years' },
      { key: '5y', label: '5+ years' },
    ],
  },
  {
    key: 'immovable',
    // ⭐ The kicker is what stops six screens reading as one form repeated —
    // each question gets a reason to exist before it is asked.
    kicker: 'The things that are not up for debate',
    multi: true,
    question: 'What can’t move?',
    hint: 'Pick any that are true. The plan gets built around these.',
    options: [
      { key: 'kids',    label: 'Kids or custody' },
      { key: 'partner', label: 'A partner’s job' },
      { key: 'parent',  label: 'Family who needs me nearby' },
      { key: 'nothing', label: 'Nothing, really' },
    ],
  },
  {
    // 🔴 FOUR OPTIONS COULD NOT HOLD THE PEOPLE THIS IS FOR. Daniel: "what if i
    // have cash or selling house or something else". Someone with savings or a
    // property to sell has the strongest position of anyone who reaches this
    // screen — and had to answer "not much".
    key: 'asset',
    // ⭐ The kicker is what stops six screens reading as one form repeated —
    // each question gets a reason to exist before it is asked.
    kicker: 'What you are working with',
    multi: true,
    question: 'What have you already got?',
    hint: 'Pick any that apply.',
    options: [
      { key: 'vehicle',  label: 'A vehicle or tools' },
      { key: 'space',    label: 'A spare room, garage or land' },
      { key: 'skill',    label: 'A skill, trade or free evenings' },
      { key: 'cash',     label: 'Savings or cash' },
      { key: 'property', label: 'A property I could sell' },
      { key: 'business', label: 'A business already' },
      { key: 'other',    label: 'Something else' },
      { key: 'none',     label: 'Not much', exclusive: true },
    ],
  },
  {
    // ⚠️ It stopped at "more than a thousand", so the person who is doing well
    // and wants a different life — half of who this is for — had no true
    // answer. The top of the scale matters as much as the bottom.
    key: 'money',
    // ⭐ The kicker is what stops six screens reading as one form repeated —
    // each question gets a reason to exist before it is asked.
    kicker: 'The room you have',
    question: 'After the bills, what’s left in a month?',
    options: [
      { key: 'negative', label: 'Nothing. It doesn’t stretch' },
      { key: 'tight',    label: 'A little' },
      { key: 'some',     label: 'A few hundred' },
      { key: 'lots',     label: 'More than a thousand' },
      { key: 'plenty',   label: 'Plenty, money isn’t the problem' },
    ],
  },
  {
    /**
     * ⚠️ HISTORY, KEPT BECAUSE THE TRAP IS STILL LIVE. A `climate` question sat
     * here. It had been renamed FROM `region` on 26 Sep because it collided with
     * the country chip on the note screen — both wrote `region`, so the climate
     * answer was overwritten on every submission and set to null outright
     * whenever somebody skipped the country. Three weeks of diagnostics recorded
     * a climate for nobody. 🔴 TWO DIFFERENT QUESTIONS CANNOT SHARE A KEY.
     *
     * 🔴 THIS REPLACED A `climate` QUESTION THAT ASKED THE SAME WORDS AND MEANT
     * SOMETHING ELSE. It read "Where are you?" and offered "Real winters / Mild
     * year-round / Hot summers / Rural or remote" — the key had been renamed
     * after the region collision and the QUESTION TEXT never was, so people were
     * answering "where are you" with a season.
     *
     * ⚠️ AND IT FED NOTHING. looksColdClimate() in mapContract reads
     * `locationText` and `seasonNote` from the INTAKE, never this chip, and
     * choosePath does not look at it either. It was recorded and never used.
     *
     * ⭐⭐ THE COUNTRY IS THE OPPOSITE — it decides which crisis numbers are real.
     * 988 does not exist outside Canada and the US, 211 is North American, and a
     * number that rings nothing reaches somebody who has one attempt in them. So
     * the sixth tap asks the thing that can actually hurt someone if unknown, and
     * "six questions" stays true.
     */
    key: 'region',
    kicker: 'Last one',
    question: 'Where are you?',
    hint: 'It changes what is actually possible, and what half of the advice out there is even written for.',
    options: [
      { key: 'ca',    label: 'Canada' },
      { key: 'us',    label: 'United States' },
      { key: 'uk',    label: 'UK or Ireland' },
      { key: 'other', label: 'Somewhere else' },
    ],
  },
]

/**
 * ⭐ The one place to write on the free side. Daniel: "there is no where to
 * write in depth about your situation" — true of the diagnostic, where every
 * answer was a tap. Optional, one line, and it is what the result screen can
 * actually speak to.
 */
export const DIAGNOSTIC_NOTE = {
  question: 'Anything the taps missed?',
  label: 'In a sentence, what’s actually going on?',
  placeholder: 'Sold a business, economy turned, five kids, new job abroad…',
  hint: 'Optional. The full version asks properly.',
}

/**
 * ⭐⭐ WHERE THEY ARE. Daniel: "maybe we should ask where they live so it can
 * adjust accordingly, also it's good for knowing who's coming to the page."
 *
 * ⚠️ THE COMMENT AT THE TOP OF THIS FILE HAS SAID "six enum answers AND A
 * REGION" SINCE THE DAY IT WAS WRITTEN. The region was designed in and never
 * built, which is why nothing in three weeks of diagnostics knows whether the
 * people arriving are in Saskatchewan or Surrey.
 *
 * It earns its place twice over. It changes the ANSWER — what a benefit is
 * called, which crisis number is real, whether half this shelf's caveats about
 * American tax apply to them. And it is the only thing on the free side that
 * tells us who is actually finding this, which is the question every other
 * number on the page depends on.
 *
 * ⚠️ IT IS NOT A SEVENTH QUESTION. It sits on the note screen, which was never
 * counted, so the promise of six taps on the first breath stays true. One tap,
 * no typing, and skippable like the note beside it.
 *
 * ⚠️ COUNTRY, NOT TOWN. The free side does not need a town and should not ask
 * for one — this is a public page with no account behind it, and the narrower
 * the question the more it feels like being tracked rather than helped. The
 * intake asks properly, once somebody has chosen to be here.
 */
/**
 * ⭐⭐ WHERE THEY ARE IS THE SIXTH TAP, NOT ITS OWN SCREEN. Daniel, on the page
 * that used to hold it: "this page may be redundant." It was — a whole screen
 * carrying one optional sentence and one chip row, sitting between the last tap
 * and the payoff, and breaking the rhythm at the worst possible moment.
 *
 * ⚠️ AND THE SENTENCE REALLY WAS ASKED TWICE. That box fed `story`, which the
 * intake now REQUIRES and prompts properly — so the free side was collecting a
 * thinner version of something the next screen would demand anyway.
 *
 * ⚠️ Options come from DIAGNOSTIC_REGION rather than being retyped: the country
 * decides which crisis numbers are real, and two lists that can drift is how a
 * person in Sheffield gets told to call 988.
 */
export const DIAGNOSTIC_REGION = {
  label: 'Where are you?',
  hint: 'It changes what is actually possible, and what half of the advice out there is even written for.',
  options: [
    { key: 'ca',    label: 'Canada' },
    { key: 'us',    label: 'United States' },
    { key: 'uk',    label: 'UK or Ireland' },
    { key: 'other', label: 'Somewhere else' },
  ],
}

/**
 * ⚠️ `gist` is what the rail shows WHILE they answer — a neutral description of
 * the path, true of anybody. `lead`/`body` are the defaults for the RESULT, and
 * pathCopy() below replaces them with lines that only claim what they said.
 * 🔴 1 Oct audit: the rail showed each path's `lead` under every question, so
 * after "Kids or custody" it still read "Nothing is holding you in place".
 */
export const PATHS = {
  'side-income': {
    gist: 'Earn from something you already have, before changing anything else.',
    name: 'The side-income ladder',
    lead: 'You own something that can earn before you change anything else.',
    body: 'The first rung pays inside a week, and each one buys the next. Nothing here asks you to quit, move, or borrow.',
  },
  'cut-delegate': {
    gist: 'Keep more of what already comes in.',
    name: 'Cut and delegate',
    lead: 'The fastest money you have is money you’re already earning and not keeping.',
    body: 'Adding income costs hours you said you don’t have. Subtracting costs none, needs no customer, and starts this week.',
  },
  'asset-play': {
    gist: 'Put savings, space or a property to work.',
    name: 'The asset play',
    lead: 'You’re sitting on the thing most people spend three years trying to build.',
    body: 'Space, equity or a ticket someone else is short of. It earns without asking for your evenings.',
  },
  'relocate-or-stay': {
    gist: 'Move somewhere it is easier, or decide for good not to.',
    name: 'Relocate, or decide not to',
    lead: 'Nothing is holding you in place, which makes location the biggest lever you have, and the one you’ve been avoiding deciding.',
    body: 'Either moving is the plan or it isn’t. Half-deciding costs more than either answer.',
  },
}

/**
 * Pick the path.
 *
 * ⭐ ORDER MATTERS — the checks are a ladder, not a score, and the first one
 * that fires wins. A weighted score across six taps produces ties and a path
 * nobody can explain, and the whole value of the result screen is being able to
 * say why the other three don't fit.
 */
/**
 * ⚠️ goalType is now a LIST. Everything below reads membership rather than
 * equality, and the ladder's order does the work of resolving a combination:
 * if time is anywhere in the answer, a plan that spends evenings is wrong
 * whatever else they also want.
 */
const wants = (a, k) => Array.isArray(a?.goalType) ? a.goalType.includes(k) : a?.goalType === k
/** ⚠️ `immovable` and `asset` are lists now; everything below reads membership. */
const has = (a, f, k) => Array.isArray(a?.[f]) ? a[f].includes(k) : a?.[f] === k
const none = (a, f) => { const v = a?.[f]; return !v || (Array.isArray(v) && (!v.length || v.includes('none'))) }

export function choosePath(a) {
  // Someone with nothing left over cannot start anything that needs money or
  // evenings first. Cutting is the only move that pays immediately and asks
  // nobody's permission — and this has to be checked before assets, or we hand
  // a truck-based plan to someone who can't fill the tank.
  if (a.money === 'negative') return 'cut-delegate'

  // Space and equity earn without taking evenings, so they beat a hustle for
  // anyone whose constraint is hours rather than capital.
  // Cash or a property to sell is the strongest hand anyone arrives with, and
  // it was previously unsayable.
  //
  // 🔴🔴 THESE USED TO SIT BELOW A BARE `wants(a, 'time')` CHECK, AND IT MADE THE
  // LADDER CONTRADICT ITS OWN COMMENT. "More time" is one of four goals, it is
  // multi-select, and it is the most ticked thing on the first screen — so
  // anybody who wanted time went to cut-delegate before their assets were
  // looked at ONCE. Somebody with a spare room, a property or cash in the bank
  // who also wanted their evenings back — precisely the person the sentence
  // above is about — never saw the asset play.
  //
  // ⚠️ FOUND IN THE DATA, NOT BY READING: 9 of the first 10 diagnostics landed
  // on cut-delegate. At that volume it is mostly test traffic, but it is exactly
  // the shape a mis-ordered ladder makes — the first check that fires wins, so a
  // wrong order does not fail loudly, it answers the same thing for everybody
  // with total confidence. See supabase/maintenance/diagnostic-signal.sql.
  if (has(a, 'asset', 'cash') || has(a, 'asset', 'property')) return 'asset-play'
  if (has(a, 'asset', 'space')) return 'asset-play'
  // Money is not their constraint, so nothing that earns more is the answer.
  if (a.money === 'plenty') return 'cut-delegate'

  // Nothing pinning them down and a horizon long enough to act on it. This is
  // the only branch where relocation is honest — everyone else has an immovable
  // and a plan that ignores it is worthless to them.
  if (has(a, 'immovable', 'nothing') && (wants(a, 'mobile') || a.horizon === '3y' || a.horizon === '5y')) {
    return 'relocate-or-stay'
  }

  // ⭐ THE TIME CHECK, IN ITS RIGHT PLACE. The intent was always sound and it
  // still stands: a second job spends the exact thing they came here short of.
  // It just has to run AFTER the moves that earn without touching an evening,
  // because those are the better answer for the same person.
  if (wants(a, 'time')) return 'cut-delegate'

  // A vehicle or a ticket is a business that hasn't sent an invoice yet.
  if (has(a, 'asset', 'vehicle') || has(a, 'asset', 'skill') || has(a, 'asset', 'business')) return 'side-income'

  // No obvious asset and no room in the budget to buy one: start by finding the
  // money that is already there.
  if (none(a, 'asset') && (a.money === 'tight' || a.money === 'some')) return 'cut-delegate'

  return 'side-income'
}

/**
 * Why the other three don't fit — written per (path, answers) rather than as
 * static copy, because "it doesn't fit YOU" is the whole reason this screen
 * converts and a generic reason reads as a horoscope.
 */
export function whyNot(chosen, a) {
  const reasons = {
    'side-income': a.money === 'negative'
      ? 'Starting something new needs a float you told us you don’t have this month.'
      : wants(a, 'time')
        ? 'It works, but it spends evenings, and time is the thing you said you’re short of.'
        : 'Your fastest money isn’t a new venture right now.',
    'cut-delegate': (a.money === 'lots' || a.money === 'plenty')
      ? 'You already have room in the budget. Cutting further buys less than using what you own.'
      : 'Worth doing, but on its own it won’t get you out. It buys runway, not a destination.',
    'asset-play': none(a, 'asset')
      ? 'This one needs space, equity or a ticket, and you told us there isn’t much there yet.'
      : 'You have the asset, but something else pays faster from where you’re standing.',
    'relocate-or-stay': !has(a, 'immovable', 'nothing')
      ? `You named something that keeps you here. A plan that ignores it isn’t a plan.`
      : 'Moving is a big lever, but it’s not the first one from where you are.',
  }
  return Object.entries(reasons)
    .filter(([key]) => key !== chosen)
    .map(([key, why]) => ({ name: PATHS[key].name, why }))
}

/**
 * ⭐⭐ THE RESULT, IN SENTENCES THEIR ANSWERS JUSTIFY.
 * 🔴 1 Oct audit: the copy was fixed per path, so everyone sent to "Cut and
 * delegate" read "Adding income costs hours you said you don't have" — whether
 * or not they had said a word about hours — and someone with savings read
 * "Space, equity or a ticket". Each line here is chosen by the answer that
 * makes it true; the defaults in PATHS only claim what is true of anybody.
 */
export function pathCopy(key, a = {}) {
  const base = PATHS[key]
  if (key === 'cut-delegate') {
    if (a.money === 'negative') return { lead: 'Nothing is left at the end of the month, so the first money is money already coming in.', body: 'Cutting needs no customer, no float and nobody’s permission, and it starts this week.' }
    if (a.money === 'plenty') return { lead: 'Money is not what is missing, so earning more is not the answer.', body: 'What is missing is room, and room comes from taking things off, not adding them.' }
    if (wants(a, 'time')) return { lead: base.lead, body: 'Adding income costs hours, and time is what you said you want back. Subtracting costs none, needs no customer, and starts this week.' }
    return { lead: base.lead, body: 'Subtracting needs no customer and no float, and it starts this week.' }
  }
  if (key === 'asset-play') {
    const what = has(a, 'asset', 'property') ? 'a property you could sell'
      : has(a, 'asset', 'cash') ? 'savings'
      : 'space'
    return { lead: `You already have ${what}, the thing most people spend years trying to build.`, body: 'It can earn, or buy you time, without asking for your evenings.' }
  }
  if (key === 'side-income') {
    const what = has(a, 'asset', 'vehicle') ? 'a vehicle or tools'
      : has(a, 'asset', 'skill') ? 'a skill, a trade or free evenings'
      : has(a, 'asset', 'business') ? 'a business already'
      : null
    return what
      ? { lead: `You have ${what}, and that can earn before you change anything else.`, body: base.body }
      : { lead: 'The fastest start is a small first earner, before you change anything else.', body: base.body }
  }
  return { lead: base.lead, body: base.body }
}
