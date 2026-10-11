import { describe, it, expect } from 'vitest'
import { stepProgress, storedProgress } from './milestoneProgress'

const m = { id: 'm1', actions: ['a', 'b', 'c', 'd'], actions_done: ['a', 'b'] }

describe('stepProgress', () => {
  it('counts ticked steps as done and a task under way as half', () => {
    const r = stepProgress(m, [{ milestone_id: 'm1', title: 'c', status: 'in_progress' }])
    expect(r.pct).toBe(63)          // (1 + 1 + 0.5 + 0) / 4
    expect([r.done, r.partial, r.total]).toEqual([2, 1, 4])
  })
  it('counts a task that is not one of the steps as its own unit', () => {
    const r = stepProgress(m, [
      { milestone_id: 'm1', title: 'c', status: 'in_progress' },
      { milestone_id: 'm1', title: 'site onboarding', status: 'backlog' },
    ])
    expect(r.total).toBe(5)
    expect(r.pct).toBe(50)          // 2.5 / 5
  })
  it('a Done task finishes its step without a tick, review counts three quarters', () => {
    expect(stepProgress({ id: 'm1', actions: ['a', 'b'], actions_done: [] }, [
      { milestone_id: 'm1', title: 'a', status: 'done' },
      { milestone_id: 'm1', title: 'b', status: 'review' },
    ]).pct).toBe(88)                // (1 + 0.75) / 2
  })
  it('ignores tasks on other milestones and takes the furthest-along duplicate', () => {
    const r = stepProgress({ id: 'm1', actions: ['a'], actions_done: [] }, [
      { milestone_id: 'm2', title: 'a', status: 'done' },
      { milestone_id: 'm1', title: 'a', status: 'backlog' },
      { milestone_id: 'm1', title: 'a', status: 'in_progress' },
    ])
    expect(r.pct).toBe(50)
  })
  it('returns null when there is nothing to count, so a hand-set number can stand', () => {
    expect(stepProgress({ id: 'm1', actions: [] }, [])).toBeNull()
  })
  it("never stores 100: finished is the owner's decision", () => {
    expect(storedProgress({ pct: 100 })).toBe(95)
    expect(storedProgress({ pct: 63 })).toBe(63)
    expect(storedProgress(null)).toBeNull()
  })
})
