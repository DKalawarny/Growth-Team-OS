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
 * and the rest count up, so deleting one closes the gap. ⚠️ A crossed-off
 * version keeps its number (it is still listed, under "Crossed off"), so the
 * live chips can skip one; that is honest rather than a gap.
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
    out.push({ key: i, n, label: `Version ${n}`, map: m.map, about: versionAbout(t, i), crossed: m.crossed ?? null })
  })
  return out
}

/** The versions still in play — everything not crossed off. The original always is. */
export function liveVersions(thread = []) {
  return versionList(thread).filter(v => !v.crossed)
}

/**
 * ⭐⭐ GO WITH ONE: the other versions are CROSSED OFF, ON PURPOSE — the same
 * idiom as the plan's own cut list, with the reason each was not chosen.
 * Not deleted: crossing off says "considered, and here is why not", and it can
 * be undone. ⚠️ The original is never crossed off — Daniel: "to get rid of the
 * original plan doesnt make sense."
 * `why` maps a version key to its reason; a missing reason gets a plain one.
 */
export function crossOffOthers(thread = [], keep, why = {}) {
  const at = new Date().toISOString()
  return (thread ?? []).map((m, i) => {
    if (!m?.rebuilt || !m.map) return m
    const { choice: _spent, ...rest } = m
    if (i === keep || m.crossed) return rest
    return { ...rest, crossed: { why: why[i] ?? 'Not the one you went with.', at } }
  })
}

/** Bring a crossed-off version back into play. */
export function bringBack(thread = [], key) {
  return (thread ?? []).map((m, i) => {
    if (i !== key || !m?.crossed) return m
    const { crossed: _gone, ...rest } = m
    return rest
  })
}

/**
 * The comparison is kept on the newest version entry, with the keys it
 * compared, and is only shown while those are still exactly the versions in
 * play. ⚠️ Kept on an entry the prompts never read — the thread reaches a model
 * only as { role, content }.
 */
export function storeChoice(thread = [], choice) {
  const t = thread ?? []
  const newest = t.map(m => Boolean(m?.rebuilt && m.map)).lastIndexOf(true)
  if (newest < 0) return t
  const keys = liveVersions(t).map(v => v.key)
  return t.map((m, i) => (i === newest ? { ...m, choice: { ...choice, keys, at: new Date().toISOString() } } : m))
}

export function currentChoice(thread = []) {
  const t = thread ?? []
  const newest = t.map(m => Boolean(m?.rebuilt && m.map)).lastIndexOf(true)
  const c = newest > -1 ? t[newest].choice : null
  if (!c) return null
  const keys = liveVersions(t).map(v => v.key)
  return JSON.stringify(c.keys) === JSON.stringify(keys) ? c : null
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

  // 🔴 STEP BACK TO A VERSION STILL IN PLAY, judged by what is SHOWING rather
  // than by comparing maps — two versions can be identical, and stepping back
  // onto a crossed-off one left no chip lit and an empty note. The original is
  // never crossed off, so there is always somewhere to land.
  const restore = showingKey(t, currentMap) === key
    ? (list.slice(0, at).filter(v => !v.crossed).pop() ?? list[0])?.map ?? null
    : null

  // 🔴 THE ORIGINAL MUST OUTLIVE THE ENTRY THAT CARRIED IT. Deleting the only
  // version used to take `base` with it. If no version is left to inherit it,
  // the entry stays as a holder with no plan of its own.
  const heir = entry.base
    ? t.findIndex((m, i) => i !== key && m?.rebuilt && m.map)
    : -1
  let next = t.map((m, i) => {
    if (i === heir) return { ...m, base: entry.base }
    if (i === key && entry.base && heir < 0) return { role: 'assistant', rebuilt: true, holder: true, base: entry.base, at: entry.at }
    return m
  })
  if (!(entry.base && heir < 0)) next = next.filter((_, i) => i !== key)

  // 🔴 THE WHOLE IDEA, NOT ITS LAST LINE. An idea can take several turns
  // ("sell the house" … "about 400k" … "ok"), and deleting its version used to
  // remove only the last thing they said, so the rest came back as a new idea
  // and fed the next rebuild. Its turns are everything between the version
  // before it and this one — unless a later version was built from the same
  // turns (nothing they said in between), in which case the idea stays.
  let start = key - 1
  while (start >= 0 && !t[start]?.rebuilt) start--
  let end = key + 1
  while (end < t.length && t[end]?.role !== 'user') end++
  const stillBuilt = t.slice(key + 1, end).some(m => m?.rebuilt && m.map)
  if (!stillBuilt) {
    const turns = new Set(t.slice(start + 1, key).filter(m => !m?.rebuilt))
    next = next.filter(m => !turns.has(m))
  }
  return { thread: next, restore }
}

/**
 * The turns a rebuild should read: everything they said, EXCEPT the turns of
 * an idea whose every version they crossed off. 🔴 A crossed-off idea kept
 * steering new versions, because the rebuild took every sentence ever said —
 * which contradicted "crossed off" outright.
 */
export function rebuildTurns(thread = []) {
  const t = thread ?? []
  const out = []
  let segment = []
  const flush = owners => {
    if (!owners.length || owners.some(m => !m.crossed)) out.push(...segment)
    segment = []
  }
  let owners = []
  t.forEach(m => {
    if (m?.role === 'user') {
      if (owners.length) { flush(owners); owners = [] }
      segment.push(m)
    } else if (m?.rebuilt && m.map) {
      owners.push(m)
    }
  })
  flush(owners)
  return out.filter(m => m.content).map(m => String(m.content))
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
