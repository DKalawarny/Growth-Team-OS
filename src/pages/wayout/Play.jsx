import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import Playbook from './Playbook'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import {
  loadOrCreateSession, generatePlaybook, generateMoveQuestions, loadPlaybook, savePlaybook,
  playbookIsStale, loadProgress, markMoveDone, moveIsOpen,
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
/**
 * ⭐⭐ KEYED BY THE MOVE, AND THAT IS THE WHOLE FIX.
 *
 * 🔴 Daniel: "i moved ahead to move two and its the same as one". It was — for
 * the twenty-seven seconds move two took to write. Going from /play/1 to
 * /play/2 is a PARAM CHANGE, not a remount, so React kept every piece of state:
 * the previous move's play stayed on screen, `loading` was false because
 * nothing had set it true again, and the page confidently rendered move one's
 * instructions under move two's heading until the new one landed.
 *
 * ⚠️ The stored data was correct the entire time — each move had its own play.
 * That is what makes this class of bug expensive: nothing is wrong anywhere a
 * query can find it, and the person is simply reading the wrong week.
 *
 * ⚠️ Resetting each piece of state by hand in the effect works and is fragile
 * — it is a list that has to be kept in step with the useState calls above it,
 * and the failure mode of forgetting one is exactly this bug again, quieter.
 * A key means the state CANNOT leak between moves, because there is none to
 * leak: React unmounts and builds a fresh one.
 */
export default function Play() {
  const { move: moveParam } = useParams()
  // ⚠️ A URL segment is a string from anywhere — a typo, a stale link, or a
  // handler that passed an event object. NaN must not fall through as a move.
  const order = Number.parseInt(moveParam, 10)
  return <PlayMove key={order} order={order} />
}

function PlayMove({ order }) {
  const navigate = useNavigate()

  const [play, setPlay]       = useState(null)
  const [move, setMove]       = useState(null)
  const [stale, setStale]     = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [isDone, setIsDone]   = useState(false)
  const [locked, setLocked]   = useState(false)
  // ⭐ The questions asked before the play is written. See Asking below.
  const [ask, setAsk]         = useState(null)
  const [session, setSession] = useState(null)
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

        setSessionId(s.id)
        const current = s.map.moves[order - 1]
        setMove(current)

        // 🔴 THE GATE IS ENFORCED HERE TOO, NOT ONLY IN THE UI. The plan page
        // only shows the door once the move above is ticked — but the URL is
        // just a URL, and a product whose ordering can be skipped by typing
        // /play/3 does not have an order, it has a menu. Generating move
        // three's play-by-play for somebody who has not done move one also
        // spends real money writing instructions that cannot work yet.
        const prog = await loadProgress(s.id)
        if (cancelled) return
        setIsDone(prog.done.has(order))
        if (!moveIsOpen(order, prog.done)) {
          setLocked(true)
          setLoading(false)
          return
        }

        const stored = await loadPlaybook(s.id, order)
        if (cancelled) return

        if (stored?.play) {
          setStale(playbookIsStale(stored, current))
          setPlay(stored.play)
          return
        }

        if (busy.current) return
        busy.current = true
        setSession(s)

        // ⭐⭐ ASK BEFORE ANSWERING. The intake asked about a LIFE; this is
        // about one MOVE, and the questions that decide whether the advice is
        // right could not have been asked earlier — they depend on which move
        // the plan chose. Cheap, fast, and the reason this is worth paying for
        // rather than a gate with a price on it.
        const qs = await generateMoveQuestions({ answers: s.answers, map: s.map, move: current })
        if (cancelled) return
        if (qs.length) { setAsk({ questions: qs }); setLoading(false); busy.current = false; return }

        // ⚠️ No questions is a valid outcome, not a failure. Some moves have
        // nothing whose answer would change the week, and inventing one to
        // have a gate would be a form.
        //
        // ⚠️ Inlined rather than calling `write` — the effect runs once per
        // move and adding a function to its dependencies re-runs it on every
        // render, which on this page means regenerating a play-by-play.
        const written = await generatePlaybook({ answers: s.answers, map: s.map, move: current })
        if (cancelled) return
        if (!written?.crisis) {
          await savePlaybook({ sessionId: s.id, moveOrder: order, move: current, play: written, asked: null })
        }
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

  /**
   * Write the play, with whatever they told us about this move.
   *
   * ⚠️ A crisis answer is never stored. It is about right now, not about this
   * move, and keeping it would hand it back weeks later as though it were
   * still true.
   */
  async function write(s, current, asked) {
    setLoading(true)
    busy.current = true
    try {
      const written = await generatePlaybook({ answers: s.answers, map: s.map, move: current, asked })
      if (!written?.crisis) {
        await savePlaybook({ sessionId: s.id, moveOrder: order, move: current, play: written, asked })
      }
      setAsk(null)
      setPlay(written)
    } catch (err) {
      setError(err.message)
    } finally {
      busy.current = false
      setLoading(false)
    }
  }

  /**
   * ⭐ Ask again and rewrite this move's play-by-play.
   *
   * 🔴 Daniel changed the prompt, reloaded /play/1, and saw the old advice —
   * "CORRECTION ISNT SHOWING". It was not: a stored play is loaded and the
   * questions step never runs, which is correct for a person mid-week and
   * useless for the person writing the thing. Exactly the same trap as the
   * plan's rebuild cap locking the author out of his own product.
   *
   * ⚠️ DEV ONLY. For a real person the play is written once ON PURPOSE —
   * coming back mid-week to different words to send would mean the
   * instructions changed underneath them while they were following them. The
   * product answer to "this does not fit" is the stale path and the questions,
   * not a re-roll button.
   */
  async function rewrite() {
    const s = await loadOrCreateSession()
    const current = s.map.moves[order - 1]
    setPlay(null)
    setAsk(null)
    setLoading(true)
    setSession(s)
    setMove(current)
    const qs = await generateMoveQuestions({ answers: s.answers, map: s.map, move: current })
    if (qs.length) { setAsk({ questions: qs }); setLoading(false); return }
    await write(s, current, null)
  }

  async function toggleDone(next) {
    setIsDone(next)
    try {
      await markMoveDone(sessionId, order, next)
      // ⭐ Straight on. They said the gate is true, which is precisely the
      // moment the next move becomes worth wanting — making them find their
      // own way there is how a product loses somebody who was ready.
      if (next) navigate(order < 3 ? `${WAYOUT_BASE}/play/${order + 1}` : `${WAYOUT_BASE}/done`)
    } catch (err) { setError(err.message) }
  }

  if (error) {
    return (
      <WayoutShell title="This week">
        <p className="wayout__q">That didn’t come through.</p>
        <p className="wayout__lead">{error}</p>
        <button className="wayout__btn" onClick={() => navigate(0)}>Try again</button>
      </WayoutShell>
    )
  }

  // ⚠️ Not an error, and not a wall with a price on it. They are early, which
  // is the plan working — so it says which move they are on and sends them
  // back to it rather than making them feel refused.
  if (locked) {
    return (
      <WayoutShell title="Not this one yet">
        <p className="wayout__q">Move {order - 1} comes first.</p>
        <p className="wayout__lead">
          {move?.title
            ? `This one starts once that is done. It is written for where you will be then, not where you are now.`
            : 'This one starts once the move before it is done.'}
        </p>
        <button className="wayout__btn" onClick={() => navigate(`${WAYOUT_BASE}/play/${order - 1}`)}>
          Open move {order - 1}
        </button>
        <p className="wayout__rebuild">
          <button type="button" className="wayout__again" onClick={() => navigate(`${WAYOUT_BASE}/plan`)}>
            Back to the plan
          </button>
        </p>
      </WayoutShell>
    )
  }

  // ⚠️ Before the loading check: the questions ARE the page at this point, and
  // there is nothing to wait for.
  if (ask && !play) {
    return (
      <Asking
        move={move}
        questions={ask.questions}
        busy={loading}
        onSubmit={answers => write(session, move, { questions: ask.questions, answers })}
      />
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

      {/* ⭐⭐ THE ONE ACTION THAT MOVES THE PRODUCT FORWARD. Ticking this is
          what opens the next move — it is not a progress bar, it is the gate
          the plan has been promising under every move since the first screen.

          ⚠️ Their claim, and nothing asks for proof. Requiring evidence turns
          this into something that audits people, and being audited is what
          they are already avoiding. */}
      <div className="wayout__doneit">
        {isDone ? (
          <p>
            <b>Done.</b>{' '}
            {order < 3
              ? <button type="button" className="wayout__again" onClick={() => navigate(`${WAYOUT_BASE}/play/${order + 1}`)}>Open move {order + 1}</button>
              : <button type="button" className="wayout__again" onClick={() => navigate(`${WAYOUT_BASE}/done`)}>That was the last one</button>}
            {' · '}
            <button type="button" className="wayout__again" onClick={() => toggleDone(false)}>Not yet, actually</button>
          </p>
        ) : (
          <>
            {/* 🔴 "That is done" read as a HEADING, not a button — Daniel:
                "this doesnt really show you how to go to the next thing". The
                gate text sat under it as grey hint, so the one action that
                moves the product forward looked like a caption. Now the
                condition comes FIRST, as the thing to check, and the button
                says what happens rather than what state you are in. */}
            <p className="wayout__gatecheck">{play.done_when}</p>
            <button className="wayout__btn wayout__btn--sun" onClick={() => toggleDone(true)}>
              {order < 3 ? `That's true — open move ${order + 1}` : 'That’s true — I’ve done all three'}
            </button>
            <p className="wayout__hint">
              Only when it is actually true. Move {order < 3 ? order + 1 : 3} is written for where you
              are after this one, so ticking it early gets you a plan for somebody else.
            </p>
          </>
        )}
        <p className="wayout__rebuild">
          <button type="button" className="wayout__again" onClick={() => navigate(`${WAYOUT_BASE}/plan`)}>
            Back to the plan
          </button>
          {/* Dev only — see rewrite(). The guard is inline so Vite can drop the
              branch at build time; on the prop it would ship the markup. */}
          {import.meta.env.DEV && (
            <>
              {' · '}
              <button type="button" className="wayout__again" onClick={rewrite}>
                Ask again and rewrite
              </button>
              {' — dev only'}
            </>
          )}
        </p>
      </div>
    </>
  )
}
