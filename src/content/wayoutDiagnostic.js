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
 * table holds six enum answers and a region, and nothing a person wrote.
 */

/**
 * The opening beat, before question one.
 *
 * 🔴 WITHOUT IT A COLD VISITOR GOT "1 of 6" AND "What are you actually after?"
 * with no idea what they had clicked, how long it would take, or whether they
 * were about to be sold something. This is the free front door, so it is the
 * first thing anyone ever sees of this product.
 *
 * ⭐ IT DOES NOT MAKE A CLAIM, IT NAMES THE SITUATION. "You probably already
 * know three things you could do" is something a person recognises about
 * themselves; "get unstuck today" is advertising, and advertising register is
 * what got nine headlines rejected on the other product. The proof is not in
 * the copy, it is that thirty seconds later the thing tells them which path
 * fits AND why the other three do not — which no landing page can claim as
 * convincingly as the product can just do.
 *
 * ⚠️ "earning more or needing less" is load-bearing, not balance. Without it
 * this reads as a make-money quiz, and the person who has done well and wants a
 * smaller life — half the product — closes the tab on the first screen.
 *
 * ⚠️ NO HANDWRITING HERE. Caveat is used exactly once in the whole product, on
 * the paid opening screen. A second one and neither means anything.
 */
export const DIAGNOSTIC_OPENING = {
  headline: 'You probably already know three things you could do.',
  highlight: 'three things',
  lead: 'The hard part is which one is first — and what to ignore.',
  body: 'Six questions, about three minutes. At the end it names the path that actually fits you, and why the other three don\'t. Whether getting out means earning more or needing less.',
  cta: 'Start',
  fine: 'No account, and this part is genuinely free.',
}

export const DIAGNOSTIC_QUESTIONS = [
  {
    key: 'goalType',
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
    multi: true,
    question: 'What can’t move?',
    hint: 'Pick any that are true — the plan gets built around these.',
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
    question: 'After the bills, what’s left in a month?',
    options: [
      { key: 'negative', label: 'Nothing — it doesn’t stretch' },
      { key: 'tight',    label: 'A little' },
      { key: 'some',     label: 'A few hundred' },
      { key: 'lots',     label: 'More than a thousand' },
      { key: 'plenty',   label: 'Plenty — money isn’t the problem' },
    ],
  },
  {
    key: 'region',
    question: 'Where are you?',
    options: [
      { key: 'cold',  label: 'Real winters' },
      { key: 'mild',  label: 'Mild year-round' },
      { key: 'hot',   label: 'Hot summers, easy winters' },
      { key: 'rural', label: 'Rural or remote' },
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
  label: 'In a sentence — what’s actually going on?',
  placeholder: 'Sold a business, economy turned, five kids, new job abroad…',
  hint: 'Optional. The full version asks properly.',
}

export const PATHS = {
  'side-income': {
    name: 'The side-income ladder',
    lead: 'You own something that can earn before you change anything else.',
    body: 'The first rung pays inside a week, and each one buys the next. Nothing here asks you to quit, move, or borrow.',
  },
  'cut-delegate': {
    name: 'Cut and delegate',
    lead: 'The fastest money you have is money you’re already earning and not keeping.',
    body: 'Adding income costs hours you said you don’t have. Subtracting costs none, needs no customer, and starts this week.',
  },
  'asset-play': {
    name: 'The asset play',
    lead: 'You’re sitting on the thing most people spend three years trying to build.',
    body: 'Space, equity or a ticket someone else is short of. It earns without asking for your evenings.',
  },
  'relocate-or-stay': {
    name: 'Relocate, or decide not to',
    lead: 'Nothing is holding you in place, which makes location the biggest lever you have — and the one you’ve been avoiding deciding.',
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

  // They told us time is the scarce thing. A second job spends the exact thing
  // they came here short of.
  if (wants(a, 'time')) return 'cut-delegate'

  // Space and equity earn without taking evenings, so they beat a hustle for
  // anyone whose constraint is hours rather than capital.
  // Cash or a property to sell is the strongest hand anyone arrives with, and
  // it was previously unsayable.
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
        ? 'It works, but it spends evenings — and time is the thing you said you’re short of.'
        : 'Your fastest money isn’t a new venture right now.',
    'cut-delegate': (a.money === 'lots' || a.money === 'plenty')
      ? 'You already have room in the budget. Cutting further buys less than using what you own.'
      : 'Worth doing, but on its own it won’t get you out — it buys runway, not a destination.',
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
