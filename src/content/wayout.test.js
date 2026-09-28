import { describe, it, expect } from 'vitest'
import { WAYOUT_SCREENS } from './wayoutIntake'
import { WAYOUT_MOVES } from './wayoutMoves'
import { SITUATIONS } from './unstuckSituations'
import { choosePath } from './wayoutDiagnostic'

/**
 * The way out — invariants between the questions and the moves.
 *
 * ⭐ These two files drift apart silently. Adding a chip is a one-line edit in
 * one file; the consequence lands in the other, at generation time, for one
 * person, in production. Nothing errors — the map just quietly has nothing to
 * say about the thing they told you they had.
 */

const screen = id => WAYOUT_SCREENS.find(s => s.id === id)
const optionsOf = field => (field.groups ?? [{ options: field.options ?? [] }]).flatMap(g => g.options)

describe('every answer leads somewhere', () => {
  it('every asset a person can tap is used by at least one move', () => {
    // 🔴 The failure this prevents: someone taps "School hours" — the only
    // thing they have — and no move in the library references it, so the model
    // is asked to build a plan from an asset it was given no options for. It
    // will invent one, which is the one thing the library exists to stop.
    const needed = new Set(WAYOUT_MOVES.flatMap(m => m.needs))
    // ⚠️ BY KEY, NOT BY POSITION. This read `fields[0]` and broke the moment a
    // field was moved onto the screen — the guard failing for a reason that had
    // nothing to do with what it guards. A test that breaks on reordering trains
    // people to ignore it.
    const orphans = optionsOf(screen('s3').fields.find(f => f.key === 'assets'))
      .map(o => o.key)
      .filter(k => !needed.has(k))
    expect(orphans).toEqual([])
  })

  it('the asset list is not just tools and trucks', () => {
    // ⚠️ The first version of S3 was truck, trailer, mower, pressure washer,
    // garage, land, equity — a list for someone with a driveway. A renter with
    // a laptop and three evenings could answer honestly and tap nothing, on the
    // screen whose whole job is telling them they have more than they think.
    const groups = screen('s3').fields.find(f => f.key === 'assets').groups.map(g => g.label)
    expect(groups).toContain('What you can do')
    expect(groups).toContain('Time and people')

    const keys = optionsOf(screen('s3').fields.find(f => f.key === 'assets')).map(o => o.key)
    for (const needsNoProperty of ['evenings', 'weekends', 'school-hours', 'teaching', 'admin', 'employer']) {
      expect(keys).toContain(needsNoProperty)
    }
  })

  it('a person with no vehicle and no property still has moves available', () => {
    const theyHave = ['evenings', 'admin', 'computers', 'employer']
    const available = WAYOUT_MOVES.filter(m => m.needs.some(n => theyHave.includes(n)))
    // Three, because the map must contain exactly three moves. Fewer here and
    // the model has to pad.
    expect(available.length).toBeGreaterThanOrEqual(3)
  })
})

describe('a required question always has a truthful answer', () => {
  it('S1 lets someone say nothing is holding them back', () => {
    // 🔴 `immovables` is required. Without this option, someone genuinely
    // unconstrained cannot pass screen one without inventing a tie — on the
    // screen whose entire job is an honest account of what is fixed.
    const field = screen('s1').fields.find(f => f.key === 'immovables')
    expect(field.required).toBe(true)
    const out = optionsOf(field).find(o => o.exclusive)
    expect(out).toBeTruthy()
    expect(out.label).toMatch(/nothing/i)
  })

  it('S4 lets someone say there is no slack in the money', () => {
    const field = screen('s4').fields.find(f => f.key === 'discretionary')
    expect(optionsOf(field).some(o => o.exclusive)).toBe(true)
  })

  it('every required field carries the message shown when it is empty', () => {
    for (const sc of WAYOUT_SCREENS) {
      for (const f of sc.fields) {
        if (f.required) expect(f.emptyMessage, `${sc.id}.${f.key}`).toBeTruthy()
      }
    }
  })
})

describe('the moves library holds its own rules', () => {
  it('no move is a course, a certification, or recruiting anyone', () => {
    // Also in the prompt — but a library entry the model cannot pick is a
    // stronger guarantee than an instruction it might drift from.
    const banned = /\b(course|certification|franchise|downline|recruit|mlm|crypto|dropship)\b/i
    const offenders = WAYOUT_MOVES
      .filter(m => banned.test(`${m.title} ${m.growsInto}`))
      .map(m => m.key)
    expect(offenders).toEqual([])
  })

  it('every cold-weather move has an off-season pair in the library', () => {
    const pairs = WAYOUT_MOVES.filter(m => m.climateTags.includes('cold-winter-pair'))
    expect(pairs.length).toBeGreaterThan(0)
  })

  it('every move says what it costs the people at home', () => {
    // Constraints before dreams, per move — the spec's first principle.
    for (const m of WAYOUT_MOVES) expect(m.familyCost, m.key).toBeTruthy()
  })
})

/**
 * 🔴🔴 A SLUG IS A URL, NOT PROSE — AND A CONTENT PASS NEARLY SHIPPED ONE BROKEN.
 *
 * 27 Sep: a find-and-replace turning formal constructions into contractions
 * across every string in unstuckSituations.js rewrote `cannot` → `can’t` INSIDE
 * A SLUG, producing `want-to-leave-my-job-but-can’t-afford-to`. That is a live
 * page, an entry in the sitemap, and a URL anything already linking to it would
 * have followed to a 404 — and nothing in the build would have complained,
 * because a curly apostrophe is a perfectly legal JavaScript string.
 *
 * ⚠️ The lesson generalises past this one file: a blind pass over CONTENT will
 * eventually touch a field that is not content. The cheap guard is asserting
 * what the field is allowed to look like.
 */
describe('situation slugs are URLs', () => {
  it('contains only lowercase letters, digits and hyphens', () => {
    const bad = SITUATIONS.filter(s => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug))
    expect(bad.map(s => s.slug)).toEqual([])
  })

  it('has no duplicates', () => {
    expect(new Set(SITUATIONS.map(s => s.slug)).size).toBe(SITUATIONS.length)
  })

  /** ⚠️ Each one is a real page, so an empty answer is a blank result in search. */
  it('gives every page a lead answer an assistant can lift', () => {
    SITUATIONS.forEach(s => {
      expect(s.answer.trim().length).toBeGreaterThan(120)
      expect(s.body.length).toBeGreaterThanOrEqual(4)
      expect(s.faqs.length).toBeGreaterThanOrEqual(3)
    })
  })
})

/**
 * 🔴🔴 THE LADDER MUST ACTUALLY DIVIDE PEOPLE, AND A BROKEN ONE DOES NOT SAY SO.
 *
 * choosePath runs its checks in order and the FIRST match wins. That makes a
 * mis-ordered ladder silent: it does not throw, it does not look wrong in review,
 * it just answers the same thing for everybody with total confidence — and the
 * entire promise of the result screen is "why the other three do not fit".
 *
 * ⚠️ FOUND IN THE DATA, NOT BY READING. Nine of the first ten recorded
 * diagnostics landed on cut-delegate, because a bare `wants(a,'time')` check sat
 * ABOVE the asset checks. "More time" is multi-select and the most-ticked goal
 * there is, so anyone who wanted their evenings back was routed before their
 * spare room, their property or their savings were looked at once — which is
 * exactly the person the asset branch was written for.
 *
 * ⚠️ This asserts the SHAPE of the outcome, not any single answer, because the
 * failure is distributional. See supabase/maintenance/diagnostic-signal.sql.
 */
describe('choosePath divides people', () => {
  const GOALS  = [['money'], ['time'], ['independent'], ['mobile'], ['money', 'time']]
  const ASSETS = [['none'], ['space'], ['cash'], ['property'], ['vehicle'], ['skill']]
  const MONEY  = ['negative', 'tight', 'some', 'lots', 'plenty']
  const IMMOV  = [['nothing'], ['kids']]

  const every = []
  GOALS.forEach(goalType => ASSETS.forEach(asset => MONEY.forEach(money => IMMOV.forEach(immovable =>
    every.push({ goalType, asset, money, immovable, horizon: '3y' })))))

  it('reaches all four paths across plausible answers', () => {
    const hit = new Set(every.map(choosePath))
    expect([...hit].sort()).toEqual(['asset-play', 'cut-delegate', 'relocate-or-stay', 'side-income'])
  })

  it('never lets one path swallow the room', () => {
    const counts = {}
    every.forEach(a => { counts[choosePath(a)] = (counts[choosePath(a)] ?? 0) + 1 })
    const top = Math.max(...Object.values(counts))
    /**
     * ⚠️ A THRESHOLD, NOT A TARGET. Some skew is correct — cut-delegate genuinely
     * is the answer for anybody with nothing spare, and the current ladder tops
     * out at 40%.
     *
     * 🔴 50% RATHER THAN 60% BECAUSE THE MATRIX UNDERSTATES THE REAL SKEW. The
     * broken ladder measured exactly 60.0% here and 9 in 10 in production — the
     * gap is that this matrix ticks "more time" in two of five goal sets, while
     * real people tick it far more often than that. A guard that catches the bug
     * it was written for by a rounding margin has no headroom for the next one.
     */
    expect(top / every.length).toBeLessThan(0.5)
  })

  /** 🔴 The specific regression: a passive asset beats the time shortcut. */
  it('sends somebody who wants time AND owns something to the asset play', () => {
    expect(choosePath({ goalType: ['time'], asset: ['space'],    money: 'some'  })).toBe('asset-play')
    expect(choosePath({ goalType: ['time'], asset: ['property'], money: 'tight' })).toBe('asset-play')
    expect(choosePath({ goalType: ['time'], asset: ['cash'],     money: 'some'  })).toBe('asset-play')
  })

  /** ⚠️ And the intent the time check was always right about still holds. */
  it('still refuses to hand a second job to somebody short of time', () => {
    expect(choosePath({ goalType: ['time'], asset: ['skill'], money: 'some' })).toBe('cut-delegate')
  })

  /** ⚠️ Survival outranks everything, including an asset. */
  it('puts nothing-spare ahead of the asset branch', () => {
    expect(choosePath({ money: 'negative', asset: ['space'] })).toBe('cut-delegate')
  })
})

/**
 * ⭐⭐ ONLY ASK WHAT APPLIES. Daniel, before testing further: "audit the questions,
 * make sure they have value, no redundancy, and if there are smarter questions to
 * ask — some maybe that answer more than one thing to speed up the onboarding."
 *
 * ⚠️ THE AUDIT FOUND NO DEAD QUESTIONS — all 37 fields are consumed by the
 * prompts, the contract guards, the move gating or the session. What it found
 * instead was that NOT ONE FIELD WAS CONDITIONAL: a single person was asked what
 * their partner wants, and somebody who ticked "doesn't apply" on faith was asked
 * which practice and what it holds in their week.
 *
 * 🔴 THE LABELS WERE DOING THE JOB CONDITIONS SHOULD. "IF there's someone else in
 * this" is a hedge written around a missing feature, and on the screen whose only
 * job is being listened to, a question that ignores the answer above it is the
 * worst possible proof that nothing is.
 */
describe('intake asks only what applies', () => {
  const visible = (screen, answers) =>
    screen.fields.filter(f => !f.showIf || f.showIf(answers))
  const count = answers =>
    WAYOUT_SCREENS.reduce((n, sc) => n + visible(sc, answers).length, 0)

  const NOTHING_APPLIES = {
    relationship: 'single', faith: 'na', health: ['na'],
    immovables: [{ key: 'nothing' }], discretionary: [],
  }
  const EVERYTHING_APPLIES = {
    relationship: 'aligned', faith: 'yes', health: ['limits'],
    immovables: [{ key: 'kids-home' }], discretionary: ['takeaway'],
  }

  it('asks fewer questions when less applies', () => {
    expect(count(NOTHING_APPLIES)).toBeLessThan(count(EVERYTHING_APPLIES))
  })

  it('never asks a single person what their partner wants', () => {
    const s2 = WAYOUT_SCREENS.find(sc => sc.fields.some(f => f.key === 'partnerWants'))
    expect(visible(s2, NOTHING_APPLIES).map(f => f.key)).not.toContain('partnerWants')
    expect(visible(s2, EVERYTHING_APPLIES).map(f => f.key)).toContain('partnerWants')
  })

  it('never asks about a practice somebody said does not apply', () => {
    const s1 = WAYOUT_SCREENS.find(sc => sc.fields.some(f => f.key === 'faithNote'))
    expect(visible(s1, NOTHING_APPLIES).map(f => f.key)).not.toContain('faithNote')
    expect(visible(s1, EVERYTHING_APPLIES).map(f => f.key)).toContain('faithNote')
  })

  /**
   * 🔴 THE TRAP THIS EXISTS FOR. A hidden field that is also required blocks the
   * form with an error rendered nowhere: the button does nothing, no message
   * appears, and the person has no way to find out why. Nothing today is both,
   * and this is here so nothing becomes both by accident.
   */
  it('never hides a required field', () => {
    const bad = []
    WAYOUT_SCREENS.forEach(sc => sc.fields.forEach(f => {
      if (f.showIf && f.required) bad.push(`${sc.id}.${f.key}`)
    }))
    expect(bad).toEqual([])
  })
})

/**
 * 🔴🔴 THE OPEN QUESTION GOES FIRST ON ITS SCREEN, AND A REORDER MUST NOT MOVE IT.
 *
 * `tuesday` is documented in wayoutIntake.js as the highest-yield question on the
 * form, with the reason spelled out: asked AFTER a set of category chips, it gets
 * the categories back in sentence form. "An open question asked second is not an
 * open question."
 *
 * ⚠️ I broke exactly that on 28 Sep while rebalancing the screens — two tap
 * questions landed above it and nothing failed. The rule lived only in a comment,
 * which is the same shape as every other rule in this product that drifted.
 */
describe('the open question is never asked second', () => {
  it('s6 opens with the destination in their own words', () => {
    const s6 = screen('s6')
    expect(s6.fields[0].key).toBe('tuesday')
    expect(s6.fields[0].kind).toBe('text')
  })

  it('no chips or choices sit above it', () => {
    const s6 = screen('s6')
    const firstTap = s6.fields.findIndex(f => ['chips', 'choice', 'score', 'rank'].includes(f.kind))
    const openAt = s6.fields.findIndex(f => f.key === 'tuesday')
    expect(openAt).toBeLessThan(firstTap === -1 ? Infinity : firstTap)
  })
})

/**
 * ⭐⭐ THE DIFFICULTY CURVE. Measured 28 Sep: screen five carried SEVEN required
 * answers — two essays and a ranking exercise — arriving after the 231-word money
 * screen. That is where somebody decides whether to finish, and it was the
 * heaviest thing in the product by a distance.
 *
 * ⚠️ This is a CEILING, not a target. It does not say the form is well designed;
 * it says no single screen may quietly become the wall again while nobody is
 * measuring.
 */
describe('no screen is a wall', () => {
  it('no screen asks for more than five required answers', () => {
    for (const s of WAYOUT_SCREENS) {
      const required = (s.fields ?? []).filter(f => f.required)
      expect(`${s.id}: ${required.length}`).toBe(`${s.id}: ${Math.min(required.length, 5)}`)
    }
  })

  it('no screen demands more than two written answers', () => {
    for (const s of WAYOUT_SCREENS) {
      const essays = (s.fields ?? []).filter(f => f.required && f.kind === 'text')
      expect(`${s.id}: ${essays.length}`).toBe(`${s.id}: ${Math.min(essays.length, 2)}`)
    }
  })
})
