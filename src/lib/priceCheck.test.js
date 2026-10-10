import { describe, it, expect } from 'vitest'
import { checkPrice, priceForMargin, pastMargin } from './priceCheck'

describe('priceCheck', () => {
  it('turns a price and costs into profit and margin', () => {
    // 20 hours at $45 = 900, plus 250 materials = 1,150 cost on a 1,900 price
    expect(checkPrice({ price: '1,900', hours: 20, hourlyCost: 45, materials: 250 }))
      .toEqual({ price: 1900, cost: 1150, profit: 750, marginPct: 39.5 })
  })
  it('reports a loss as a negative margin instead of hiding it', () => {
    const r = checkPrice({ price: 1000, hours: 30, hourlyCost: 45, materials: 0 })
    expect(r.profit).toBe(-350)
    expect(r.marginPct).toBe(-35)
  })
  it('says nothing until there is a price, hours and an hourly cost', () => {
    expect(checkPrice({ price: 1900, hours: '', hourlyCost: 45 })).toBeNull()
    expect(checkPrice({ price: 0, hours: 5, hourlyCost: 45 })).toBeNull()
  })
  it('finds the price that hits a target margin', () => {
    expect(priceForMargin(1150, 40)).toBe(1917)   // 1150 / 0.6 = 1916.67
    expect(priceForMargin(1150, 100)).toBeNull()
  })
  it('averages margin over past jobs that have both numbers, and only those', () => {
    const jobs = [
      { invoiced_amount: 1000, cost_amount: 600 },  // 40%
      { invoiced_amount: 2000, cost_amount: 1000 }, // 50%
      { invoiced_amount: 500,  cost_amount: null }, // not counted
      { invoiced_amount: null, cost_amount: 100 },  // not counted
    ]
    expect(pastMargin(jobs)).toEqual({ count: 2, marginPct: 45 })
    expect(pastMargin([])).toBeNull()
  })
})
