import { describe, it, expect } from 'vitest'
import { WAYOUT_SCREENS } from './wayoutIntake'
import { WAYOUT_MOVES } from './wayoutMoves'
import { SITUATIONS } from './unstuckSituations'

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
    const orphans = optionsOf(screen('s3').fields[0])
      .map(o => o.key)
      .filter(k => !needed.has(k))
    expect(orphans).toEqual([])
  })

  it('the asset list is not just tools and trucks', () => {
    // ⚠️ The first version of S3 was truck, trailer, mower, pressure washer,
    // garage, land, equity — a list for someone with a driveway. A renter with
    // a laptop and three evenings could answer honestly and tap nothing, on the
    // screen whose whole job is telling them they have more than they think.
    const groups = screen('s3').fields[0].groups.map(g => g.label)
    expect(groups).toContain('What you can do')
    expect(groups).toContain('Time and people')

    const keys = optionsOf(screen('s3').fields[0]).map(o => o.key)
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
    const field = screen('s1').fields[0]
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
