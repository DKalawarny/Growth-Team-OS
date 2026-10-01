import { useEffect, useRef, useState } from 'react'
import { WAYOUT_MAX_PLAN_ASKS } from '../../lib/wayout/session'
import { versionList, showingKey, openFrom } from '../../lib/wayout/planVersions'

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
export default function PlanThread({
  thread = [], onSay, onRedo, onTakeBack, onSwitch, busy = false, rebuilding = false,
  pending = null, error = '', liveMap = null,
}) {
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
  const rebuiltAt = thread.map(m => m.rebuilt === true).lastIndexOf(true)
  const movedAt   = thread.map(m => m.role === 'assistant' && m.changesPlan === true).lastIndexOf(true)
  const moved     = movedAt > -1 && movedAt > rebuiltAt ? thread[movedAt] : null
  const plans     = versionList(thread)
  const showing   = showingKey(thread, liveMap)
  const open      = openFrom(thread)
  const quiet     = busy || rebuilding

  async function send() {
    const said = text.trim()
    if (!said || quiet) return
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

      {/* ⭐⭐ THE VERSIONS, NOT THE TRANSCRIPT. Daniel: "this should just show
          v1 v2 v3 and below an option for a new one." Once an idea has been
          built into a version, its back-and-forth has done its job — it folds
          into the one line that says what the version was built around.
          ⚠️ Deleting lives on the × above the moves, not here: two places to
          delete the same thing is how "Drop this idea" came to sit under a
          sentence and read as deleting the original plan. */}
      {plans.length > 0 && (
        <ol className="wayout__versionlist">
          {plans.map(v => (
            <li key={v.key}>
              <button
                type="button"
                className={`wayout__versionrow${showing === v.key ? ' is-on' : ''}`}
                aria-pressed={showing === v.key}
                disabled={!onSwitch || quiet || showing === v.key}
                onClick={() => { onSwitch(v.key); toPlan() }}
              >
                <b>V{v.n}</b>
                <span>{v.key === -1 ? 'Original — from your answers' : `“${v.about ?? 'Rewritten'}”`}</span>
                {showing === v.key && <em>Showing</em>}
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* The conversation still in progress — what has not become a version yet. */}
      {thread.slice(open).map((m, j) => {
        const i = open + j
        return (
          <div key={i} className={m.role === 'user' ? 'wayout__threadmine' : 'wayout__threadreply'}>
            <p>{m.content}</p>
            {onTakeBack && m.role === 'user' && !quiet && (
              <button type="button" className="wayout__threadundo" onClick={() => onTakeBack(i)}>
                Take that back
              </button>
            )}
          </div>
        )
      })}

      {/* The version being written, in the place it will land. */}
      {pending && (
        <div className="wayout__version wayout__version--pending" role="status">
          <p className="wayout__versionhead">V{pending.n}</p>
          {pending.about && <p className="wayout__versionabout">Rewriting the plan around “{pending.about}”</p>}
          <div className="wayout__working" aria-hidden="true"><i /><i /><i /></div>
          <p className="wayout__versionnote">Up to a minute. Your plan stays as it is until this one is ready.</p>
        </div>
      )}
      {error && !pending && <p className="wayout__error">{error}</p>}

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
      {!quiet && onRedo && moved && (
        <div className="wayout__threadmoved">
          <b>{moved.whatChanged ?? 'That changes the order.'}</b>
          <button type="button" className="wayout__btn wayout__btn--sun" onClick={onRedo}>
            Rebuild the plan around it
          </button>
        </div>
      )}

      {/* ⭐⭐ THE MODEL'S JUDGEMENT DECIDES WHAT IS OFFERED. IT DOES NOT DECIDE
          WHAT IS ALLOWED. Daniel proposed a concrete change — a Texas flip
          instead of the Kissimmee hold — and the reply asked him a question
          back rather than concluding the plan had moved. That is usually right:
          it named two bars the new move has to clear first. But it left him
          with a direction he had chosen and nothing on the screen to act on
          it: "no button to make this the new plan."

          ⭐ THIS PRODUCT ALREADY HAS THE ANSWER TO THAT, on the crossed-off
          list — "I want this one anyway — put it in the plan." Being able to
          overrule is an established idiom here, and the thread was the one
          place it was missing.

          ⚠️ QUIETER THAN THE OFFER, ON PURPOSE. When the reply says the plan
          moved, rebuilding is the obvious next thing and gets a button. Here it
          is a choice against advice, so it reads as a link and says what it is
          overruling. A plan is not more provisional for having a way to insist;
          it is more provisional when every message offers to redo it, which is
          why this appears only after the model has actually answered. */}
      {/* ⚠️ IT WAS THE LOUDEST THING IN THE CARD — bold, green, underlined,
          beating the reply it was meant to sit under, and jammed against the
          input so it read as a label for the box. Quiet ink, its own space, and
          the recommended route stated plainly rather than competing with the
          override beside it. */}
      {!quiet && onRedo && !moved && lastMine > -1 && rebuiltAt < lastMine && last && (
        <p className="wayout__threadinsist">
          Answer that and it will tell you what moves.{' '}
          <button type="button" className="wayout__threadundo" onClick={onRedo}>
            Or rebuild around it anyway
          </button>
        </p>
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

      {/* ⚠️ THE BOX HAD NO LABEL AND NO SEPARATION. Three different actions sat
          on one card with nothing saying which belonged to what: take a message
          back, overrule the answer, and say something new. The divider and the
          label are what make the last of those obviously a new turn rather than
          a continuation of the exchange above it. */}
      {!spent && (
        <div className="wayout__threadsay">
          <label className="wayout__label" htmlFor="wayout-thread">
            {lastMine > -1 ? 'Anything else changed?' : 'What changed?'}
          </label>
          <textarea
            id="wayout-thread"
            className="wayout__textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="The buyer pulled out. I got offered a job. The rental has been empty two months."
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
          />
          <button className="wayout__btn" onClick={send} disabled={quiet || !text.trim()}>
            {busy ? 'Reading…' : 'Tell it'}
          </button>
          {err && <p className="wayout__error">{err}</p>}
        </div>
      )}
    </section>
  )
}

/** After switching from down here, take them to where the plan changed. */
function toPlan() {
  document.getElementById('wayout-versions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * ⭐⭐ WHICH PLAN IS SHOWING, ON THE PLAN. Daniel: "the switching between them
 * should switch it up top here" — it lived at the foot of the thread, so the
 * moves changed somewhere off-screen above the button that changed them.
 * It sits over the moves now, so the click and its effect are in one view.
 * ⚠️ Read from the plan itself (`showingVersion`), so it cannot claim a version
 * is showing when it is not. Switching regenerates nothing.
 */
export function VersionSwitch({ thread = [], liveMap = null, onSwitch, onRemove, disabled = false }) {
  const [asking, setAsking] = useState(null)
  const dialog = useRef(null)
  /**
   * ⭐ A REAL POPUP FOR THE DELETE. Daniel: "can we make sure the x has a pop up
   * to confirm delete" — the inline question appeared under the chips, easy to
   * miss and easy to scroll past. A native <dialog> opened with showModal():
   * the page behind is inert, Escape cancels, focus is held inside it, and the
   * browser draws the backdrop. ⚠️ Never window.confirm — it blocks the page
   * and cannot say what will happen in this product's words.
   */
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (asking != null && !d.open) {
      d.showModal?.()
      // ⚠️ showModal focuses the FIRST button, which is Delete — so Enter by
      // reflex would delete. The safe answer gets the focus.
      d.querySelector('[data-keep]')?.focus()
    }
    if (asking == null && d.open) d.close()
  }, [asking])
  const plans = versionList(thread)
  if (plans.length < 2) return null
  const showing = showingKey(thread, liveMap)
  const on = plans.find(v => v.key === showing)
  const doomed = plans.find(v => v.key === asking)
  return (
    <div className="wayout__versions" id="wayout-versions" role="group" aria-label="Which version of your plan is showing">
      <p className="wayout__versionshead">Version showing</p>
      <div className="wayout__versionsrow">
        {plans.map(v => (
          <span key={v.key} className={`wayout__versionchip${showing === v.key ? ' is-on' : ''}`}>
            <button
              type="button"
              aria-pressed={showing === v.key}
              disabled={!onSwitch || disabled || showing === v.key}
              onClick={() => { setAsking(null); onSwitch(v.key) }}
            >
              {v.label}
            </button>
            {/* ⭐⭐ THE ×. Daniel: "to get rid of the original plan doesnt make
                sense i was thinking to get rid of new ideas maybe just having an
                x on the top." So there is none on the original. */}
            {onRemove && v.key !== -1 && (
              <button
                type="button"
                className="wayout__versionx"
                aria-label={`Delete ${v.label}`}
                disabled={disabled}
                onClick={() => setAsking(v.key)}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="wayout__dialog"
        aria-labelledby="wayout-delete-title"
        onClose={() => setAsking(null)}
        onClick={e => { if (e.target === e.currentTarget) setAsking(null) }}
      >
        {doomed && (
          <div className="wayout__dialogbody">
            <h3 id="wayout-delete-title">Delete {doomed.label}?</h3>
            {doomed.about && <p className="wayout__dialogabout">Rewritten around “{doomed.about}”</p>}
            <p>
              Its plan cannot be brought back
              {showing === doomed.key ? ', and your plan steps back to the version before it.' : '.'}
            </p>
            <div className="wayout__dialogactions">
              <button type="button" className="wayout__btn wayout__btn--danger" onClick={() => { const k = doomed.key; setAsking(null); onRemove(k) }}>
                Delete it
              </button>
              <button type="button" className="wayout__threadundo" data-keep onClick={() => setAsking(null)}>
                Keep it
              </button>
            </div>
          </div>
        )}
      </dialog>
      <p className="wayout__versionnote">
          {showing == null
            ? 'Your plan was rebuilt from your answers since — none of these is showing.'
            : showing === -1
              ? 'The plan from your answers, before anything you said below.'
              : on?.about ? `Rewritten around “${on.about}”.` : null}
      </p>
    </div>
  )
}
