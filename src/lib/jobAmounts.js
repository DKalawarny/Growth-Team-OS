import { supabase } from './supabase'
import { can } from './access'

/**
 * ⭐ JOB AMOUNTS live in their own table (migration 077) so the database can
 * decide who sees them: Owner, Runs the business and Office always; Operations
 * only when the owner switches it on (companies.job_costs_for_operations).
 *
 * Every reader asks for them the same way, as an embedded relation, so a role
 * without access simply gets nothing back rather than an error.
 */
export const AMOUNTS_EMBED = 'amounts:work_order_amounts(quoted_amount, cost_amount, invoiced_amount)'

/** Lift the embedded amounts onto each job, exactly as the columns used to be. */
export function withAmounts(rows) {
  return (rows ?? []).map(({ amounts, ...o }) => {
    const a = Array.isArray(amounts) ? amounts[0] : amounts
    return {
      ...o,
      quoted_amount:   a?.quoted_amount   ?? null,
      cost_amount:     a?.cost_amount     ?? null,
      invoiced_amount: a?.invoiced_amount ?? null,
    }
  })
}

/** Whether this person may see and edit job amounts (the database decides; this keeps the UI honest). */
export function canSeeJobCosts(role, company) {
  return can(role, 'office') || (can(role, 'all') && company?.job_costs_for_operations === true)
}

/** Save the three amounts for one job. Blank stays blank (null), never 0. */
export async function saveJobAmounts({ workOrderId, companyId, quoted, cost, invoiced }) {
  const allNull = quoted == null && cost == null && invoiced == null
  if (allNull) {
    return supabase.from('work_order_amounts').delete().eq('work_order_id', workOrderId)
  }
  return supabase.from('work_order_amounts').upsert({
    work_order_id: workOrderId, company_id: companyId,
    quoted_amount: quoted, cost_amount: cost, invoiced_amount: invoiced,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'work_order_id' })
}

/** Owner only: let Operations see job costs, or stop them. */
export async function setJobCostsForOperations(companyId, on) {
  const { error } = await supabase.from('companies').update({ job_costs_for_operations: !!on }).eq('id', companyId)
  if (error) throw new Error(error.message)
}
