import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import { loadOrCreateSession, loadProgress, recordOutcome } from '../../lib/wayout/session'

/**
 * The way out — after the third move.
 *
 * ⭐⭐ THE ONE PAGE THAT ASKS INSTEAD OF TELLING. Everywhere else this product
 * produces something: a path, a plan, a week of instructions. Here it has
 * nothing left to produce, and the only useful thing it can do is find out
 * whether any of it worked.
 *
 * 🔴 IT DOES NOT CONGRATULATE ANYBODY. Three ticked boxes is not the same as
 * being out, and a page that celebrates somebody who is still stuck has stopped
 * listening — which is the single failure this thing cannot survive. Nothing
 * here says well done, and nothing assumes.
 *
 * ⚠️ No confetti, no score, no streak. The register is the same as the rest:
 * direct about the situation, never directive about the person.
 */
const OPTIONS = [
  { key: 'landed',  label: 'Yes — that is where I am',        hint: 'The thing you were aiming at actually happened.' },
  { key: 'partly',  label: 'Better, but not there',           hint: 'Real ground gained, and still short of it.' },
  { key: 'no',      label: 'I did the work and it did not land', hint: 'Worth saying plainly. It is the most useful thing you can tell us.' },
  { key: 'changed', label: 'I want something different now',  hint: 'That happens, and it is not a failure.' },
]

export default function Done() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [moves, setMoves]     = useState([])
  const [picked, setPicked]   = useState('')
  const [note, setNote]       = useState('')
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    let cancelled = false
    loadOrCreateSession()
      .then(async s => {
        if (cancelled) return
        if (!s.map?.moves?.length) { navigate(`${WAYOUT_BASE}/plan`, { replace: true }); return }
        setSession(s)
        setMoves(s.map.moves)
        if (s.outcome) { setPicked(s.outcome); setSaved(true) }
        // ⚠️ Reachable early on purpose — somebody may want to say "this did
        // not land" long before three boxes are ticked, and refusing them the
        // page because they did not finish would collect only the happy
        // answers. Progress is read to say something true, not to gate.
        const p = await loadProgress(s.id)
        if (!cancelled) setMoves(m => m.map((mv, i) => ({ ...mv, done: p.done.has(i + 1) })))
      })
      .catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [navigate])

  async function submit() {
    if (!picked || !session) return
    try {
      await recordOutcome(session.id, picked, note)
      setSaved(true)
    } catch (err) { setError(err.message) }
  }

  const allDone = moves.length > 0 && moves.every(m => m.done)

  if (saved) {
    return (
      <WayoutShell title="Thank you">
        <p className="wayout__q">Noted, and read.</p>
        <p className="wayout__lead">
          {picked === 'no'
            ? 'That is the answer that changes the product, and almost nobody gives it. Thank you for it.'
            : 'That is the only measure of this that means anything.'}
        </p>
        <p className="wayout__lead">
          Your life is not the one you answered about any more. When you want a
          plan for the person you are now, it starts from the questions again —
          and the answers will be different, which is the point.
        </p>
        <button className="wayout__btn" onClick={() => navigate(`${WAYOUT_BASE}?edit=1`)}>
          Start a new plan
        </button>
        <p className="wayout__rebuild">
          <button type="button" className="wayout__again" onClick={() => navigate(`${WAYOUT_BASE}/plan`)}>
            Back to the plan
          </button>
        </p>
      </WayoutShell>
    )
  }

  return (
    <WayoutShell title="What happened">
      <p className="wayout__q">
        {allDone ? 'Three moves. You worked all three.' : 'Where did it get to?'}
      </p>

      {/* Their own moves, in their own words. Not a summary of what we did — a
          record of what they did, which is the only thing worth showing here. */}
      <ul className="wayout__ledger">
        {moves.map((m, i) => (
          <li key={i} className={m.done ? 'is-done' : ''}>
            <span>{m.done ? '✓' : '—'}</span> {m.title}
          </li>
        ))}
      </ul>

      <p className="wayout__lead">
        The plan said what to do and in what order. Whether it worked is the one
        thing only you know, and the one thing nobody ever asks.
      </p>

      <div className="wayout__chips" style={{ marginTop: 22 }}>
        {OPTIONS.map(o => (
          <button
            key={o.key}
            type="button"
            className={`wayout__chip${picked === o.key ? ' wayout__chip--on' : ''}`}
            aria-pressed={picked === o.key}
            onClick={() => setPicked(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {picked && <p className="wayout__hint">{OPTIONS.find(o => o.key === picked)?.hint}</p>}

      {picked && (
        <>
          <label className="wayout__label" htmlFor="wayout-outcome-note" style={{ marginTop: 20 }}>
            Anything worth saying about it?
          </label>
          <textarea
            id="wayout-outcome-note"
            className="wayout__textarea"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={picked === 'no'
              ? 'Where it stopped, and what got in the way.'
              : 'What actually changed, or what surprised you.'}
          />
          <button className="wayout__btn" onClick={submit}>Send it</button>
        </>
      )}

      {error && <p className="wayout__hint">{error}</p>}

      <p className="wayout__rebuild">
        <button type="button" className="wayout__again" onClick={() => navigate(`${WAYOUT_BASE}/plan`)}>
          Back to the plan
        </button>
      </p>
    </WayoutShell>
  )
}
