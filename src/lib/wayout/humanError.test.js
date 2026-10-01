import { describe, it, expect, vi } from 'vitest'
import { humanError } from './humanError'

describe('humanError', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  it('a dropped connection becomes a sentence', () => {
    expect(humanError('Failed to fetch (ufhduewbamnmoiksqgfq.supabase.co)')).toMatch(/could not reach your plan/)
  })
  it('database and runtime errors never reach the person raw', () => {
    for (const t of ['Could not save: new row violates row-level security policy', 'TypeError: x is undefined', '{"error":"x"}', 'duplicate key value'])
      expect(humanError(t)).toBe('Something went wrong on our side. Try again in a moment.')
  })
  it('our own sentences pass through', () => {
    for (const t of ['That did not rewrite. Your plan has not changed — try it again.', 'You have used both comparisons for today. They come back within 24 hours.'])
      expect(humanError(t)).toBe(t)
  })
  it('takes an Error too', () => {
    expect(humanError(new Error('Load failed'))).toMatch(/could not reach/)
  })
})
