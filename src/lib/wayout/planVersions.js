/**
 * ⭐⭐ VERSIONS OF THE PLAN, AS THE RUNNING THREAD SEES THEM.
 *
 * Daniel, looking at two identical "Rewritten around that." lines, each with
 * its own "Put the plan back": "if its more then one change it gets lost there
 * is nothing differentiating between them." So every rewrite became a numbered
 * version. Then, the same evening: "there is no way to just get rid of the idea
 * you cant switch between the options or go back to original idea."
 *
 * ⭐⭐ SO A VERSION IS A PLAN YOU CAN STAND ON, NOT A STEP ON A STACK. Each
 * version entry carries its own map, and the first carries the original as
 * `base`, so any of them — the original included — can be put on the plan in
 * one click, with no model call and byte-for-byte what it was. And an idea can
 * be dropped outright: the sentence goes, the versions built on it go, and the
 * plan returns to what was showing before it was said.
 *
 * ⚠️ MAPS ON THREAD ENTRIES NEVER REACH A PROMPT. The thread goes to the model
 * as `so_far: thread.slice(-8).map(m => ({ role, content }))` and the rebuild
 * reads only `role === 'user'` turns — two explicitly picked fields. Our maps
 * are ours and never become evidence; that line has held since 16 Sep.
 *
 * Pure functions, so the rules are tested rather than eyeballed.
 */

/**
 * Number every rebuild entry in the thread.
 * ⚠️ Entries written before 30 Sep carry no `version`; they are numbered in
 * order, so an old thread reads the same way a new one does.
 */
export function threadVersions(thread = []) {
  let highest = 1
  const at = {}
  ;(thread ?? []).forEach((m, i) => {
    if (!m?.rebuilt) return
    const version = m.version ?? highest + 1
    highest = Math.max(highest, version)
    at[i] = { version, from: m.from ?? version - 1 }
  })
  return { at, next: highest + 1 }
}

/**
 * Every plan the thread can put back: the original, then each version that
 * kept its map. In order, oldest first.
 */
export function versionList(thread = []) {
  const { at } = threadVersions(thread)
  const base = (thread ?? []).find(m => m?.rebuilt && m.base)?.base
  const out = base ? [{ version: 1, label: 'Original', map: base, index: -1 }] : []
  for (const [i, v] of Object.entries(at)) {
    const m = thread[i]
    if (m?.map) out.push({ version: v.version, label: `Version ${v.version}`, map: m.map, index: Number(i) })
  }
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
 * Which version is on the plan right now — or null when none of them is (a
 * rebuild from the answers, say). Read from the plan itself rather than kept
 * as a flag, so it cannot disagree with what is on the screen.
 */
export function showingVersion(thread = [], currentMap) {
  const hit = [...versionList(thread)].reverse().find(v => samePlan(v.map, currentMap))
  return hit ? hit.version : null
}

/**
 * Drop the idea said at thread[i], and everything after it.
 *
 * ⚠️ EVERYTHING AFTER IT, because later turns were answered with it in the
 * room and later versions were built from it — keeping them would keep the
 * idea. When it is the last thing said, that is just the idea and its reply.
 *
 * Returns the thread without it and the plan to put back: the newest version
 * before it, or the original. `restore` is null when no version was built
 * from it, because then the plan never moved and must not be touched.
 */
export function dropIdea(thread = [], i) {
  const t = thread ?? []
  if (t[i]?.role !== 'user') return null
  const builtOnIt = t.slice(i).some(m => m?.rebuilt)
  const kept = t.slice(0, i)
  if (!builtOnIt) return { thread: kept, restore: null, to: null }
  const before = versionList(t).filter(v => v.index > -1 && v.index < i).pop()
  const original = versionList(t).find(v => v.version === 1)
  const target = before ?? original
  if (!target) return { thread: kept, restore: null, to: null }
  return { thread: kept, restore: target.map, to: target.label }
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
