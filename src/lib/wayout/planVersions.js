/**
 * ⭐⭐ VERSIONS OF THE PLAN, AS THE RUNNING THREAD SEES THEM.
 *
 * Daniel, looking at two identical "Rewritten around that." lines, each with
 * its own "Put the plan back": "if its more then one change it gets lost there
 * is nothing differentiating between them." He was right on both counts — the
 * lines were indistinguishable, and so were the buttons: all of them popped the
 * same shared stack, so the one on the FIRST rewrite undid the LAST.
 *
 * So every rewrite is a numbered version that knows which version it replaced,
 * what it was built around, and what it moved. The plan they answered into is
 * version 1. Pure functions, so the rules are tested rather than eyeballed.
 */

/**
 * Number every rebuild entry in the thread.
 * ⚠️ Entries written before 30 Sep carry no `version`; they are numbered in
 * order, so an old thread reads the same way a new one does.
 * ⚠️ An undone version hands "current" back to the one it replaced — the next
 * rewrite is built on THAT, and says so.
 */
export function threadVersions(thread = []) {
  let current = 1
  let highest = 1
  const at = {}
  ;(thread ?? []).forEach((m, i) => {
    if (!m?.rebuilt) return
    const version = m.version ?? highest + 1
    const from = m.from ?? current
    highest = Math.max(highest, version)
    at[i] = { version, from }
    current = m.undone ? from : version
  })
  return { at, current, next: highest + 1 }
}

/**
 * What a rewrite moved, in their plan's own words: each move whose title
 * changed, before and after. Computed from the two maps — no model call, so it
 * cannot describe a change that did not happen.
 */
export function planChanges(before, after) {
  const b = Array.isArray(before?.moves) ? before.moves : []
  const a = Array.isArray(after?.moves) ? after.moves : []
  const out = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const was = b[i]?.title ?? null
    const now = a[i]?.title ?? null
    if (was !== now) out.push({ order: i + 1, before: was, after: now })
  }
  return out
}

/**
 * May the version at thread[i] go back to the plan it replaced?
 *
 * ⭐⭐ ONLY IF THE NEWEST SAVED PLAN IS PROVABLY THE ONE IT REPLACED. The
 * history entry is tagged `thread:<id>` when the version is made; anything
 * that rewrote the plan since (another version, a rebuild from the answers)
 * puts its own entry on top, and this one stops offering a way back rather
 * than restoring somebody else's plan.
 * ⚠️ Legacy entries have no id. The newest one may still go back if the top of
 * the history is an untagged rebuild — the behaviour it always had.
 */
export function canGoBack(thread = [], i, history = []) {
  const m = thread?.[i]
  if (!m?.rebuilt || m.undone || m.kept) return false
  const newest = (thread ?? []).map(e => e?.rebuilt === true).lastIndexOf(true)
  if (i !== newest) return false
  const head = (history ?? [])[0]
  if (!head?.map) return false
  if (m.id) return head.why === `thread:${m.id}`
  return (head.why ?? 'rebuild') === 'rebuild'
}

/** The sentence a version was built around — stored, or for an old entry the last thing they said before it. */
export function versionAbout(thread = [], i) {
  const m = thread?.[i]
  if (m?.about) return m.about
  for (let j = i - 1; j >= 0; j--) if (thread[j]?.role === 'user') return thread[j].content
  return null
}
