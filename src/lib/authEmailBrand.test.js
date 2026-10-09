import { describe, it, expect } from 'vitest'
import { brandFor } from '../../supabase/functions/auth-email/brand.ts'

// Known good AND known bad: the guard is only worth anything if a lookalike fails it.
describe('brandFor', () => {
  it('picks Unstuck on its own domain', () => {
    expect(brandFor('https://getunstuckmap.com/reset')).toBe('unstuck')
    expect(brandFor('https://www.getunstuckmap.com/reset')).toBe('unstuck')
  })
  it('picks Unstuck under /wayout on an Eliv8 host', () => {
    expect(brandFor('https://eliv8os.com/wayout/reset')).toBe('unstuck')
    expect(brandFor('http://localhost:5173/wayout/reset')).toBe('unstuck')
  })
  it('picks Eliv8 for its own pages', () => {
    expect(brandFor('https://eliv8os.com/reset-password')).toBe('eliv8')
    expect(brandFor('http://localhost:5173/reset-password')).toBe('eliv8')
    expect(brandFor('https://eliv8os.com/wayoutish')).toBe('eliv8')
  })
  it('never matches a lookalike by substring', () => {
    expect(brandFor('https://getunstuckmap.com.evil.io/reset')).toBe('eliv8')
    expect(brandFor('https://evil.io/getunstuckmap.com/reset')).toBe('eliv8')
    expect(brandFor('https://evil.io/wayout/reset')).toBe('eliv8')
    expect(brandFor('https://notgetunstuckmap.com/reset')).toBe('eliv8')
  })
  it('falls back to Eliv8 on nothing or garbage', () => {
    expect(brandFor('')).toBe('eliv8')
    expect(brandFor(undefined)).toBe('eliv8')
    expect(brandFor('not a url')).toBe('eliv8')
  })
})

import { compose, render } from '../../supabase/functions/auth-email/copy.ts'

describe('auth email copy', () => {
  const types = ['recovery', 'magiclink', 'signup', 'email', 'invite', 'email_change', 'reauthentication', 'unknown']
  for (const brand of ['unstuck', 'eliv8']) {
    for (const t of types) {
      it(`${brand} ${t} reads clean`, () => {
        const c = compose(t, brand)
        const { text, html } = render(c, t === 'reauthentication' ? null : 'https://x.test/v?a=1&b=2', '123456')
        for (const s of [c.subject, text]) {
          expect(s).not.toMatch(/[—–]/)
          expect(s).not.toMatch(/ - /)
          expect(s).not.toMatch(/supabase/i)
          expect(s).not.toMatch(/tuesday/i)
        }
        expect(html).not.toMatch(/supabase/i)
        expect(text).toMatch(/ignore/)
        if (t !== 'reauthentication') expect(html).toContain('&amp;b=2')
        else expect(text).toContain('123456')
      })
    }
  }
  it('the dash check catches a dash (known bad)', () => {
    expect('Set it now — please').toMatch(/[—–]/)
  })
})
