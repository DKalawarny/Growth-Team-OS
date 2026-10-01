/**
 * ⭐⭐ VERSIONS OF THE PLAN, AS THE RUNNING THREAD SEES THEM.
 *
 * How this got its shape, all on 30 Sep, all Daniel:
 * 1. "if its more then one change it gets lost there is nothing
 *    differentiating between them" — so every rewrite became a numbered version.
 * 2. "you cant switch between the options or go back to original idea" — so
 *    each version carries its own map, the first carries the original as
 *    `base`, and any of them goes on the plan in one click, nothing regenerated.
 * 3. "to get rid of the original plan doesnt make sense i was thinking to get
 *    rid of new ideas … just having an x" — so what can be deleted is a
 *    VERSION, never the original, and an idea goes when its last version does.
 *
 * ⭐ A version is identified by its INDEX in the thread (`key`); the original
 * is key -1. Display numbers are positional — Version 1 is always the original
 * and the rest count up with no gaps, so deleting one never leaves "1, 3".
 *
 * ⚠️ MAPS ON THREAD ENTRIES NEVER REACH A PROMPT. The thread goes to the model
 * as `so_far: thread.slice(-8).map(m => ({ role, content }))` and the rebuild
 * reads only `role === 'user'` turns — two explicitly picked fields. Our maps
 * are ours and never become evidence; that line has held since 16 Sep.
 *
 * Pure functions, so the rules are tested rather than eyeballed.
 */

/**
 * Every plan the thread can put back: the original, then each version that
 * kept its map, oldest first.
 */
export function versionList(thread = []) {
  const t = thread ?? []
  const base = t.find(m => m?.rebuilt && m.base)?.base
  if (!base) return []
  const out = [{ key: -1, n: 1, label: 'Original', map: base, about: null }]
  t.forEach((m, i) => {
    if (!m?.rebuilt || !m.map) return
    const n = out.length + 1
    out.push({ key: i, n, label: `Version ${n}`, map: m.map, about: versionAbout(t, i) })
  })
  return out
}

/**
 * Same plan? Key order is normalised because jsonb does not keep it — the map
 * read back from the database and the one we wrote are equal but not
 * identical strings.
 */
export function samePlan(a, b) {
  if (!a || !b) return false
  return stable(a) === stable(b)
}
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
  }
  return JSON.stringify(v)
}

/**
 * Which version is on the plan right now (its key), or null when none of them
 * is — a rebuild from the answers, say. Read from the plan itself rather than
 * kept as a flag, so it cannot disagree with what is on the screen.
 */
export function showingKey(thread = [], currentMap) {
  const hit = [...versionList(thread)].reverse().find(v => samePlan(v.map, currentMap))
  return hit ? hit.key : null
}

/**
 * Delete one version. Never the original.
 *
 * ⭐ WHEN THE LAST VERSION OF AN IDEA GOES, THE IDEA GOES WITH IT — the
 * sentence and the replies to it. Left behind, it would still be read by the
 * next rebuild (which takes every sentence they said), so a deleted idea
 * would quietly come back.
 * ⚠️ If the deleted version is the one showing, the plan steps back to the
 * version before it — the original at the latest, which always survives.
 * ⚠️ The original rides on the first version entry as `base`; if that entry
 * goes, the next surviving version carries it on.
 *
 * Returns { thread, restore } — `restore` is the map to put on the plan, or
 * null when the plan does not need to change.
 */
export function removeVersion(thread = [], key, currentMap) {
  const t = thread ?? []
  const entry = t[key]
  if (key < 0 || !entry?.rebuilt || !entry.map) return null
  const list = versionList(t)
  const at = list.findIndex(v => v.key === key)
  const restore = samePlan(entry.map, currentMap) ? list[at - 1]?.map ?? null : null

  let next = t.filter((_, i) => i !== key)
  if (entry.base) {
    const heir = next.findIndex(m => m?.rebuilt && m.map)
    if (heir > -1) next = next.map((m, i) => (i === heir ? { ...m, base: entry.base } : m))
  }

  // The idea this version came from: the last thing they said before it.
  let idea = -1
  for (let j = key - 1; j >= 0; j--) if (t[j]?.role === 'user') { idea = j; break }
  if (idea > -1) {
    let end = idea + 1
    while (end < next.length && next[end]?.role !== 'user') end++
    const stillBuilt = next.slice(idea + 1, end).some(m => m?.rebuilt && m.map)
    if (!stillBuilt) {
      next = [...next.slice(0, idea), ...next.slice(idea + 1, end).filter(m => m?.rebuilt), ...next.slice(end)]
    }
  }
  return { thread: next, restore }
}

/**
 * Where the conversation still in progress starts: everything after the
 * newest version. Earlier turns are folded into the versions they produced.
 */
export function openFrom(thread = []) {
  return (thread ?? []).map(m => m?.rebuilt === true).lastIndexOf(true) + 1
}

/**
 * Drop the idea in progress: everything after the newest version. Nothing a
 * version was built from can be reached this way, so the plan never moves.
 */
export function dropDraft(thread = []) {
  return (thread ?? []).slice(0, openFrom(thread))
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

/** The sentence a version was built around — stored, or for an old entry the last thing they said before it. */
export function versionAbout(thread = [], i) {
  const m = thread?.[i]
  if (m?.about) return m.about
  for (let j = i - 1; j >= 0; j--) if (thread[j]?.role === 'user') return thread[j].content
  return null
}
