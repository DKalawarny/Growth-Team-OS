import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import Playbook from './Playbook'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import {
  loadOrCreateSession, generatePlaybook, loadPlaybook, savePlaybook, playbookIsStale,
} from '../../lib/wayout/session'

/**
 * The way out — the play-by-play for one move.
 *
 * ⭐⭐ THIS IS THE PAID HALF, AND TODAY IT IS FREE. `WAYOUT_PAYMENTS_LIVE` is
 * off and migration 055 makes finishing the intake the entitlement, so the
 * database agrees with what the plan page already promises: free while this is
 * being built. When payments go live, 055 reverts in the same commit that
 * flips the flag — a paywall appearing while the button still says free is
 * worse than either state alone.
 *
 * ⚠️ Written ONCE and kept. A person comes back mid-week having half-done the
 * thing; finding different words to send would mean the instructions changed
 * underneath them while they were following them.
 */
export default function Play() {
  const navigate = useNavigate()
  const { move: moveParam } = useParams()
  const order = Number(moveParam)

  const [play, setPlay]       = useState(null)
  const [move, setMove]       = useState(null)
  const [stale, setStale]     = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  // Same guard as the plan page: in dev the effect runs twice, and without this
  // both runs reach the model. See Plan.jsx for what that cost when it did.
  const busy = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function go() {
      try {
        const s = await loadOrCreateSession()
        if (cancelled) return

        // No plan, no play. The order is the product and it applies here too.
        if (!s.map?.moves?.length) { navigate(`${WAYOUT_BASE}/plan`, { replace: true }); return }
        if (!(order >= 1 && order <= s.map.moves.length)) {
          navigate(`${WAYOUT_BASE}/plan`, { replace: true }); return
        }

        const current = s.map.moves[order - 1]
        setMove(current)

        const stored = await loadPlaybook(s.id, order)
        if (cancelled) return

        if (stored?.play) {
          setStale(playbookIsStale(stored, current))
          setPlay(stored.play)
          return
        }

        if (busy.current) return
        busy.current = true
        setLoading(true)
        const written = await generatePlaybook({ answers: s.answers, map: s.map, move: current })
        if (cancelled) return
        // ⚠️ A crisis answer is never stored. It is about right now, not about
        // this move, and keeping it would hand it back weeks later as though it
        // were still true.
        if (!written?.crisis) await savePlaybook({ sessionId: s.id, moveOrder: order, move: current, play: written })
        if (!cancelled) setPlay(written)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        busy.current = false
        if (!cancelled) setLoading(false)
      }
    }

    go()
    return () => { cancelled = true }
  }, [navigate, order])

  if (error) {
    return (
      <WayoutShell title="This week">
        <p className="wayout__q">That didn’t come through.</p>
        <p className="wayout__lead">{error}</p>
        <button className="wayout__btn" onClick={() => navigate(0)}>Try again</button>
      </WayoutShell>
    )
  }

  if (loading || !play) {
    return (
      <WayoutShell title="This week">
        <p className="wayout__q">Working out how.</p>
        <p className="wayout__lead">
          {move?.title
            ? `${move.title} — what to do first, what to say, and what usually goes wrong.`
            : 'What to do first, what to say, and what usually goes wrong.'}
        </p>
        <p className="wayout__lead">Up to a minute.</p>
        <div className="wayout__working" aria-hidden="true"><i /><i /><i /></div>
      </WayoutShell>
    )
  }

  // ⚠️ A crisis answer replaces the whole page, and nothing is offered on it.
  if (play.crisis) {
    return (
      <WayoutShell title="Read this first">
        <div className="wayout__crisis">
          {String(play.message).replace(/\*\*/g, '').split(/\n{2,}/).filter(Boolean).map((p, i) => (
            <p key={i} className={i === 0 ? 'wayout__q' : 'wayout__lead'}>{p.trim()}</p>
          ))}
        </div>
      </WayoutShell>
    )
  }

  return (
    <>
      {/* ⚠️ The plan was rebuilt after this was written, so the move it
          describes is not the move they are on. Said plainly rather than
          silently regenerating — the week they have already spent on it is
          theirs, and we do not get to decide it was wasted. */}
      {stale && (
        <div className="wayout__stale">
          <p>
            Your plan changed after this was written, so this is the play for the
            move you had before.{' '}
            <button
              type="button"
              className="wayout__again"
              onClick={async () => { setPlay(null); setStale(false); busy.current = false
                try {
                  const s = await loadOrCreateSession()
                  const current = s.map.moves[order - 1]
                  const written = await generatePlaybook({ answers: s.answers, map: s.map, move: current })
                  if (!written?.crisis) await savePlaybook({ sessionId: s.id, moveOrder: order, move: current, play: written })
                  setPlay(written)
                } catch (err) { setError(err.message) }
              }}
            >
              Write it for the new one
            </button>
          </p>
        </div>
      )}
      <Playbook play={play} index={order} />
    </>
  )
}
