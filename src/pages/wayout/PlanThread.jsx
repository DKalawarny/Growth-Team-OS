import { useState } from 'react'
import { WAYOUT_MAX_PLAN_ASKS } from '../../lib/wayout/session'

/**
 * ⭐⭐ THE RUNNING THREAD — "tell it what changed".
 *
 * Daniel: "a chat part of it — thought is to have people keep it as a guide, a
 * way to retain people." He is right about the need and I pushed back on the
 * shape, which he accepted: a general chat is another place to ask questions
 * instead of acting, and this product exists to end that state.
 *
 * ⭐⭐ SO THE BOX IS NOT LABELLED "ASK ME ANYTHING". It is labelled with the one
 * thing it is for. The placeholder is three real events, because a blank box
 * with an open invitation gets small talk and a blank box with examples gets
 * the sale falling through.
 *
 * ⭐⭐ AND THE PAYOFF IS A BUTTON, NOT A PARAGRAPH. When something genuinely
 * moves the plan, the reply says what it moved and the REDO appears — the plan
 * gets rewritten on the plan, where it can be found tomorrow. A plan rewritten
 * inside a chat message is a plan nobody can find again.
 *
 * ⚠️ IT STOPS INVITING WHEN IT IS BEING USED AS A SUBSTITUTE FOR DOING THE MOVE.
 * `stalling` comes back from the model under an explicit rule — three replies
 * that neither changed the plan nor sent them to do something, and the fourth
 * says so. Same spine as the twelve-ask cap on a move: the next real answer is
 * on the other side of trying it.
 */
export default function PlanThread({ thread = [], onSay, onRedo, onUndo, onRestore, busy = false }) {
  const [text, setText] = useState('')
  const [err, setErr]   = useState('')

  const mine  = thread.filter(m => m.role === 'user').length
  const spent = mine >= WAYOUT_MAX_PLAN_ASKS
  const last  = [...thread].reverse().find(m => m.role === 'assistant')

  /**
   * 🔴🔴 THE OFFER WAS TIED TO THE LAST REPLY, SO A LATER REPLY COULD WITHDRAW
   * IT. Daniel said the same thing twice; the second reply was "you already
   * said that" — correctly `changesPlan: false` — and the rebuild button
   * vanished. The plan still needed rewriting, he had been told so, and the
   * only control that could do it had been taken off the screen by an answer
   * that was not about whether the plan had moved. "i even tried it again and
   * it didnt work and no way to delete it or go back."
   *
   * ⭐⭐ A PLAN THAT NEEDS REWRITING DOES NOT STOP NEEDING IT BECAUSE THE NEXT
   * SENTENCE WAS ABOUT SOMETHING ELSE. So the offer stands on the most recent
   * reply that said the plan moved, and is withdrawn only by the rebuild
   * actually happening — which writes its own entry below.
   */
  const lastMine  = thread.map(m => m.role === 'user').lastIndexOf(true)
  /**
   * ⚠️ ONCE THE PLAN HAS BEEN REWRITTEN AROUND SOMETHING, IT CANNOT BE TAKEN
   * BACK. The plan in front of them is built on it, so withdrawing the sentence
   * would leave a plan standing on a message that no longer exists — and would
   * delete the only entry that can put the old plan back.
   */
  const canUndo   = !thread.slice(thread.map(m => m.role === 'user').lastIndexOf(true))
    .some(m => m.rebuilt === true)
  const rebuiltAt = thread.map(m => m.rebuilt === true).lastIndexOf(true)
  const movedAt   = thread.map(m => m.role === 'assistant' && m.changesPlan === true).lastIndexOf(true)
  const moved     = movedAt > -1 && movedAt > rebuiltAt ? thread[movedAt] : null

  async function send() {
    const said = text.trim()
    if (!said || busy) return
    setErr(''); setText('')
    try { await onSay(said) } catch (e) { setErr(e.message) }
  }

  return (
    <section className="wayout__card wayout__thread">
      <h3 className="wayout__label">Something changed?</h3>
      <p className="wayout__threadlead">
        The plan is built on what was true when you answered. When that stops
        being true, say so here and it will tell you what it moves.
      </p>

      {/* ⭐⭐ A WAY BACK OUT OF SOMETHING YOU JUST SAID. There was none — every
          message was permanent the moment it sent, so a typo, a duplicate or a
          sentence that came out wrong sat in the plan's history forever and
          went into the next rebuild as if it were meant. Daniel: "no way to
          delete it or go back."
          ⚠️ THE LAST EXCHANGE ONLY, and only their own. Editing further back
          would rewrite a conversation the plan was already built on; taking
          back the thing you just said is a different act from revising
          history. */}
      {thread.map((m, i) => (
        <div key={i} className={m.role === 'user' ? 'wayout__threadmine' : 'wayout__threadreply'}>
          <p>{m.content}</p>
          {onUndo && canUndo && m.role === 'user' && i === lastMine && !busy && (
            <button type="button" className="wayout__threadundo" onClick={onUndo}>
              Take that back
            </button>
          )}
          {/* ⭐⭐ UNDOING A MESSAGE WAS NEVER GOING TO UNDO A PLAN, and Daniel
              reasonably expected it to — "the take it back doesnt change it to
              the previose". They are two different acts and now they are two
              different controls, each sitting on the thing it actually undoes:
              this one on the entry that says the plan was rewritten.
              ⚠️ It disappears once used, because `mapBefore` is stripped as it
              is spent. A plan should not ping-pong between two versions. */}
          {onRestore && m.rebuilt && m.mapBefore && !busy && (
            <button type="button" className="wayout__threadundo" onClick={onRestore}>
              Put the plan back
            </button>
          )}
        </div>
      ))}

      {busy && <p className="wayout__threadreply wayout__askwait">Reading that.</p>}

      {/* ⭐⭐ THE ONE CONTROL THAT MATTERS. It only exists when the model said the
          plan actually moved — offering "redo" after every message would make
          the plan feel provisional, which is the opposite of what it is for. */}
      {/* 🔴🔴 A CONTROL MUST NOT EXIST WITHOUT ITS HANDLER, and this rendered on
          `changesPlan` alone. When the parent decided not to pass `onRedo` the
          button still drew itself — enabled, full strength, doing nothing on
          click. That is not a small styling miss: "it does nothing" is the
          hardest kind of bug for somebody to report usefully, and it was
          reported four times before it was measured.
          ⭐ Requiring the handler makes the failure impossible rather than
          unlikely — the same posture as passing no write functions at all on a
          past chapter instead of disabling them in the UI. */}
      {!busy && onRedo && moved && (
        <div className="wayout__threadmoved">
          <b>{moved.whatChanged ?? 'That changes the order.'}</b>
          <button type="button" className="wayout__btn wayout__btn--sun" onClick={onRedo}>
            Rebuild the plan around it
          </button>
        </div>
      )}

      {spent ? (
        <p className="wayout__hint">
          That is a lot of back and forth on one plan. Whatever is next is
          probably on the other side of doing move one.
        </p>
      ) : last?.stalling ? (
        // ⚠️ Not a lock. They can still type — the screen simply stops asking
        // for more, which is the difference between a limit and a telling-off.
        <p className="wayout__hint">
          Nothing here has changed the plan for a while. The next real answer is
          on the other side of trying it.
        </p>
      ) : null}

      {!spent && (
        <>
          <textarea
            id="wayout-thread"
            className="wayout__textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="The buyer pulled out. I got offered a job. The rental has been empty two months."
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
          />
          <button className="wayout__btn" onClick={send} disabled={busy || !text.trim()}>
            {busy ? 'Reading…' : 'Tell it'}
          </button>
          {err && <p className="wayout__error">{err}</p>}
        </>
      )}
    </section>
  )
}
