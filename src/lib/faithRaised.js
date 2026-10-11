import { supabase } from './supabase'

/**
 * Has this owner brought faith up himself?
 *
 * ⚠️ 11 Oct 2026, Daniel, on whether faith books should appear on pages: "I
 * think it's the same as the rest, when it is appropriate and brought up. I
 * don't want to hide from it."
 *
 * So the rule is the one Solomon already lives by, applied to the pages: a
 * book written from Christian conviction is offered on the same footing as any
 * other, to an owner who has raised the subject. It is not hidden from him,
 * and it is not put in front of an owner who never mentioned it (the Creed
 * principle: attraction, not persuasion; the product never steers).
 *
 * "Brought up" is read from his own words: what Solomon remembers him saying
 * (which includes why he runs the business, from onboarding), or the text on
 * the page itself. The words below are ones a person uses about his own
 * conviction. "Church" and "ministry" are left out on purpose: a landscaper
 * with a church for a client has not raised his faith.
 */
const FAITH = /\b(god|christ|christian|jesus|pray(?:er|ers|ing|ed)?|scripture|bible|biblical|gospel|kingdom|steward(?:ship)?|my faith|our faith|his faith|a man of faith|tithe|tithing)\b/i

export function textRaisesFaith(text) {
  return FAITH.test(String(text ?? ''))
}

const cache = new Map()   // companyId -> Promise<boolean>

/** True when anything Solomon remembers this owner saying raises faith. Asked once per company per page load. */
export function fetchFaithRaised(companyId) {
  if (!companyId) return Promise.resolve(false)
  if (!cache.has(companyId)) {
    cache.set(companyId, supabase
      .from('solomon_memory')
      .select('statement, detail')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .limit(200)
      .then(({ data }) => (data ?? []).some(r => textRaisesFaith(`${r.statement ?? ''} ${r.detail ?? ''}`)))
      .catch(() => false))
  }
  return cache.get(companyId)
}
