import { useEffect, useRef } from 'react'

/**
 * useToolDraft — keep the last generated tool result on the page across
 * navigation, so leaving a tool and coming back does not silently lose the
 * read you just made. Daniel, 7 Oct: "when i come back its gone, shouldn't it
 * stay up." The tools render a result then offer "Save to library"; saving
 * sends it to Documents, but an unsaved result used to vanish the moment you
 * left the route.
 *
 * Kept per company in localStorage (per-viewer, per-browser — never shared,
 * never read back by anyone else), so it is a convenience, not storage of
 * record; everything that must persist still goes to Documents on save. Every
 * read and write is wrapped so a private window or blocked storage degrades to
 * the old behaviour rather than throwing.
 *
 * Wiring in a tool (all share the same stage/result/form shape):
 *   useToolDraft({
 *     toolId:    'hiring',
 *     companyId: profile?.company_id,
 *     result,
 *     payload:   { form, contextSummary },
 *     onRestore: (d) => { setResult(d.result); if (d.form) setForm(d.form)
 *                         if (d.contextSummary != null) setContextSummary(d.contextSummary)
 *                         setStage('result') },
 *   })
 * and call clearToolDraft(toolId, companyId) in the tool's "Start over" reset.
 *
 * CFO has its own bespoke version: it also reloads saved reads on mount, so it
 * needs to weigh a draft against the newest saved doc. This hook is for the
 * tools that otherwise just reset to the form.
 */
const key = (toolId, cid) => `eliv8:tooldraft:${toolId}:${cid}`

export function readToolDraft(toolId, cid) {
  try { const r = localStorage.getItem(key(toolId, cid)); return r ? JSON.parse(r) : null } catch { return null }
}

export function clearToolDraft(toolId, cid) {
  try { localStorage.removeItem(key(toolId, cid)) } catch { /* ignore */ }
}

export function useToolDraft({ toolId, companyId, result, payload, onRestore }) {
  const restored   = useRef(false)
  const payloadRef = useRef(payload);   payloadRef.current = payload
  const restoreRef = useRef(onRestore); restoreRef.current = onRestore

  // Restore once, when the company is known and the page has no result yet.
  useEffect(() => {
    if (restored.current || !companyId) return
    restored.current = true
    if (result) return                 // already showing something; nothing to restore
    const d = readToolDraft(toolId, companyId)
    if (d && d.result) restoreRef.current(d)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, toolId])

  // Persist whenever the result changes (covers first generate and refines).
  useEffect(() => {
    if (!companyId || !result) return
    try {
      localStorage.setItem(key(toolId, companyId), JSON.stringify({ ...payloadRef.current, result, savedAt: Date.now() }))
    } catch { /* private mode / quota — ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, companyId, toolId])
}
