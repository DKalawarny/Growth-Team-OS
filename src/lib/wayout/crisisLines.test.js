import { describe, it, expect } from 'vitest'
import { crisisLinesFor, CRISIS_COUNTRIES } from './crisisLines'
import { WAYOUT_SCREENS } from '../../content/wayoutIntake'

describe('crisisLinesFor', () => {
  it('🔴 988 only in Canada and the US', () => {
    for (const r of CRISIS_COUNTRIES) {
      const has988 = crisisLinesFor(r).lines.some(l => /988/.test(l.how))
      expect(has988).toBe(r === 'ca' || r === 'us')
    }
  })
  it('the UK gets Samaritans and 999, never 911', () => {
    const uk = crisisLinesFor('uk')
    expect(uk.emergency).toBe('999')
    expect(uk.lines[0].how).toMatch(/116 123/)
  })
  it('every country, known or not, gets the worldwide directory', () => {
    for (const r of [...CRISIS_COUNTRIES, 'other', '', undefined]) expect(crisisLinesFor(r).directory).toBe('findahelpline.com')
  })
  it('an unknown country gets no national number at all — never a guess', () => {
    const x = crisisLinesFor('other')
    expect(x.known).toBe(false)
    expect(x.lines).toEqual([])
    expect(x.emergency).toBe(null)
  })
  it('every country the intake offers is either in the table or "other"', () => {
    const field = WAYOUT_SCREENS.flatMap(s => s.fields ?? []).find(f => f.key === 'region')
    expect(field).toBeTruthy()
    for (const o of field.options) expect(o.key === 'other' || CRISIS_COUNTRIES.includes(o.key)).toBe(true)
  })
})
