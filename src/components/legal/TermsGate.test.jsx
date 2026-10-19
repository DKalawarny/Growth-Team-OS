import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import TermsGate from './TermsGate'

/**
 * 🔴 18 Oct 2026: the Sarlia Digital TERMS_VERSION bump put the pilot agreement
 * in front of every demo visitor, because each demo is a copy of the sample
 * company and carries its old acceptance. The demo must never show the gate;
 * a real user who has not accepted must always see it.
 *
 * No DOM here, so effects never run: useState is stubbed so the gate's
 * "accepted" state starts as false (has not accepted), which is the case
 * that matters.
 */
vi.mock('react', async orig => {
  const real = await orig()
  return { ...real, useState: init => [init === null ? false : init, () => {}] }
})

let company = null
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } }, profile: { company_id: 'c1' }, company }),
}))
vi.mock('../../lib/terms', () => ({
  TERMS_VERSION: 'test-version',
  OPERATOR_LEGAL_NAME: 'Sarlia Digital Inc.',
  hasAcceptedCurrentTerms: async () => false,
  recordAcceptance: async () => ({}),
}))

const render = () => renderToStaticMarkup(
  <MemoryRouter><TermsGate><p>THE APP</p></TermsGate></MemoryRouter>,
)

describe('TermsGate', () => {
  it('asks a real user who has not accepted', () => {
    company = { id: 'c1', is_demo: false }
    const html = render()
    expect(html).toContain('Accept and continue')
  })
  it('never asks a demo visitor', () => {
    company = { id: 'demo-copy', is_demo: true }
    const html = render()
    expect(html).toContain('THE APP')
    expect(html).not.toContain('Accept and continue')
  })
})
