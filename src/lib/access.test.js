import { describe, it, expect } from 'vitest'
import { can, canVisit, homeFor, ROLE_AREAS, GRANTABLE_ROLES, ROLE_LABEL } from './access'

/**
 * ⚠️ This holds the APP side of the role table. The database side is
 * `public.can_area()` (migration 075) — the two must agree, and the
 * second-account probe recorded in that migration is what proved the SQL.
 */
describe('who can open what', () => {
  it('Solomon is the owner’s and whoever runs it — nobody else', () => {
    expect(['owner', 'admin', 'cfo', 'manager', 'safety', 'member'].filter(r => canVisit(r, '/advisor'))).toEqual(['owner', 'admin'])
  })
  it('the finances open to the office but not to operations', () => {
    expect(canVisit('cfo', '/tools/cfo')).toBe(true)
    expect(canVisit('cfo', '/tools/cash-flow')).toBe(true)
    expect(canVisit('manager', '/tools/cfo')).toBe(false)
    expect(canVisit('manager', '/documents')).toBe(false)
  })
  it('billing, the team and deleting the workspace are the owner’s alone', () => {
    for (const p of ['/settings/billing', '/settings/team', '/settings/danger']) {
      expect(canVisit('owner', p)).toBe(true)
      expect(canVisit('admin', p)).toBe(false)
    }
  })
  it('runs-the-business gets everything operational, incl. succession', () => {
    for (const p of ['/dashboard', '/roadmap', '/tools/exit-readiness', '/settings/business', '/tools/cfo']) expect(canVisit('admin', p)).toBe(true)
  })
  it('everyone can reach the work itself', () => {
    for (const r of Object.keys(ROLE_AREAS)) for (const p of ['/board', '/logs', '/playbooks', '/help', '/tools/safety']) expect(canVisit(r, p)).toBe(true)
  })
  it('a longer route wins over its prefix', () => {
    expect(canVisit('manager', '/tools')).toBe(true)
    expect(canVisit('manager', '/tools/decision')).toBe(false)
  })
  it('each role lands somewhere it can open', () => {
    for (const r of Object.keys(ROLE_AREAS)) expect(canVisit(r, homeFor(r))).toBe(true)
  })
  it('an unknown role can open nothing but the work', () => {
    expect(can(undefined, 'lead')).toBe(false)
    expect(canVisit('stranger', '/advisor')).toBe(false)
  })
  it('the owner can only give the three presets, each with a name', () => {
    expect(GRANTABLE_ROLES).toEqual(['admin', 'cfo', 'manager'])
    for (const r of GRANTABLE_ROLES) expect(ROLE_LABEL[r]).toBeTruthy()
  })
})
