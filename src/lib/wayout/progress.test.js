import { describe, it, expect } from 'vitest'
import { tapProgress, intakeProgress, TAP_COUNT } from './progress'
import { WAYOUT_TOTAL_SCREENS } from '../../content/wayoutIntake'

const n = s => parseFloat(s)

describe('one bar across the taps and the questions', () => {
  it('never goes backwards from the first tap to the open box', () => {
    const walk = [
      ...Array.from({ length: TAP_COUNT + 1 }, (_, i) => n(tapProgress(i))),
      ...Array.from({ length: WAYOUT_TOTAL_SCREENS + 2 }, (_, i) => n(intakeProgress(i))),
    ]
    for (let i = 1; i < walk.length; i++) expect(walk[i]).toBeGreaterThanOrEqual(walk[i - 1])
  })

  it('the result of the taps and the opening sentence sit at the same place', () => {
    expect(tapProgress(TAP_COUNT)).toBe(intakeProgress(0))
  })

  it('is not full until the plan is being built', () => {
    expect(n(intakeProgress(WAYOUT_TOTAL_SCREENS + 1))).toBeLessThan(100)
    expect(n(tapProgress(0))).toBe(0)
  })
})
