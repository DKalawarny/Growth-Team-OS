import { useEffect, useState } from 'react'
import { hasUnstuckPlan, latestHandoff, saveHandoff, DRAFT_FROM_ELIV8 } from '../../lib/handoffs'

/**
 * ⭐ The shared summary, Eliv8 OS side (6 Oct 2026). Only for someone who also
 * has a plan on Unstuck Map, so it never pitches anyone. A few lines they write
 * about what the business can pay them; only the box crosses, only to them.
 * Also shows what they shared from Unstuck, so they can see what Solomon has.
 */
export default function ShareWithUnstuck() {
  const [show, setShow] = useState(false)
  const [text, setText] = useState('')
  const [had, setHad] = useState(false)
  const [fromPlan, setFromPlan] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      const [has, mine, plan] = await Promise.all([hasUnstuckPlan(), latestHandoff('eliv8'), latestHandoff('unstuck')])
      if (!live) return
      setShow(has); setHad(!!mine); setText(mine?.body ?? DRAFT_FROM_ELIV8); setFromPlan(plan)
    })()
    return () => { live = false }
  }, [])

  async function share() {
    setBusy(true); setMsg('')
    try { await saveHandoff('eliv8', text); setHad(true); setMsg('Shared with your plan on Unstuck Map. Only these lines went across.') }
    catch (e) { setMsg(e.message) }
    finally { setBusy(false) }
  }

  if (!show) return null
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">Your personal plan on Unstuck Map</p>
      {fromPlan && (
        <p className="text-[14px] leading-[1.6] text-ink-700">
          <span className="font-semibold text-ink-900">You shared from your plan:</span> “{fromPlan.body}” Solomon reads this as something you told him. Only you can see it.
        </p>
      )}
      <p className="text-[14px] leading-[1.6] text-ink-600">
        Share a few lines back, so your personal plan works from what the business can really pay you. Only what is in this box goes across, and only to you.
      </p>
      <textarea rows={3} maxLength={1200} value={text} onChange={e => setText(e.target.value)}
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-[14px] leading-[1.5] focus:outline-none focus:ring-2 focus:ring-brand-300" />
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || text.includes('___') || text.trim().length < 3} onClick={share}
          className="px-4 py-2 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold disabled:opacity-50">
          {had ? 'Update what is shared' : 'Share these lines'}
        </button>
        {text.includes('___') && <span className="text-[12.5px] text-ink-400">Fill in the blank first.</span>}
      </div>
      {msg && <p className="text-[13px] text-green-700" role="status">{msg}</p>}
    </section>
  )
}
