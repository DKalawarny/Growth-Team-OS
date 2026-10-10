/**
 * The arithmetic behind the quick price check. Kept out of the component so it
 * is tested: this is the one place in the product that turns a price into a
 * margin for an owner, and a wrong margin said confidently is worse than none.
 *
 * Margin here is gross margin on the job: (price - direct cost) / price.
 * Direct cost is labour (hours x loaded hourly cost) plus materials and
 * anything else bought for this job. Overhead is not in it, on purpose: the
 * owner is comparing against his own past jobs, which are measured the same way.
 */
const num = v => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

export function checkPrice({ price, hours, hourlyCost, materials }) {
  const p = num(price), h = num(hours), c = num(hourlyCost), m = num(materials) ?? 0
  if (p == null || p <= 0 || h == null || c == null) return null
  const cost = h * c + m
  const profit = p - cost
  return { price: p, cost, profit, marginPct: Math.round((profit / p) * 1000) / 10 }
}

/** The price that gives `targetPct` gross margin on this cost. Null if the target is 100% or more. */
export function priceForMargin(cost, targetPct) {
  const t = num(targetPct)
  if (cost == null || t == null || t >= 100 || t < 0) return null
  return Math.ceil(cost / (1 - t / 100))
}

/**
 * Average gross margin across finished jobs that have both an invoiced amount
 * and a cost. Null when there are none, which the UI must say rather than hide.
 */
export function pastMargin(jobs) {
  const priced = (jobs ?? []).filter(j => j.invoiced_amount > 0 && j.cost_amount != null)
  if (priced.length === 0) return null
  const avg = priced.reduce((a, j) => a + (j.invoiced_amount - j.cost_amount) / j.invoiced_amount, 0) / priced.length
  return { count: priced.length, marginPct: Math.round(avg * 1000) / 10 }
}
