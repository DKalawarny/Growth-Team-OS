import { useState } from 'react'
import { WAYOUT_MAX_PLAN_ASKS } from '../../lib/wayout/session'
import { threadVersions, versionList, showingVersion, dropIdea, versionAbout } from '../../lib/wayout/planVersions'

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
  thread = [], onSay, onRedo, onDrop, onSwitch, busy = false, rebuilding = false,
  pending = null, error = '', liveMap = null,
}) {
  const [text, setText] = useState('')
  const [err, setErr]   = useState('')
  // ⚠️ Dropping removes what they said, so it asks once, inline — never a
  // browser dialog.
  const [confirmAt, setConfirmAt] = useState(-1)

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
  const versions  = threadVersions(thread)
  const plans     = versionList(thread)
  const showing   = showingVersion(thread, liveMap)
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

      {/* ⭐⭐ ANY IDEA CAN BE DROPPED, NOT ONLY THE LAST ONE BEFORE A REBUILD.
          "Take that back" vanished the moment a rebuild happened, which left
          an idea in the plan for good. Daniel: "there is no way to just get rid
          of the idea." Dropping now takes the sentence, its reply and every
          version built from it, and says first exactly what it will do. */}
      {thread.map((m, i) => m.rebuilt ? (
        <Version
          key={i}
          m={m}
          v={versions.at[i]}
          about={versionAbout(thread, i)}
          showing={showing === versions.at[i]?.version}
          onSwitch={onSwitch && m.map && !quiet ? () => onSwitch(versions.at[i].version) : null}
        />
      ) : (
        <div key={i} className={m.role === 'user' ? 'wayout__threadmine' : 'wayout__threadreply'}>
          <p>{m.content}</p>
          {/* ⚠️ INSIDE THE BUBBLE'S BLOCK AND ALIGNED TO IT — a control sits on
              the thing it acts on. */}
          {onDrop && m.role === 'user' && !quiet && (
            <Drop
              thread={thread} i={i}
              asking={confirmAt === i}
              onAsk={() => setConfirmAt(i)}
              onCancel={() => setConfirmAt(-1)}
              onDrop={() => { setConfirmAt(-1); onDrop(i) }}
            />
          )}
        </div>
      ))}

      {/* The version being written, in the place it will land. */}
      {pending && (
        <div className="wayout__version wayout__version--pending" role="status">
          <p className="wayout__versionhead">Version {pending.version}</p>
          {pending.about && <p className="wayout__versionabout">Rewriting the plan around “{pending.about}”</p>}
          <div className="wayout__working" aria-hidden="true"><i /><i /><i /></div>
          <p className="wayout__versionnote">Up to a minute. Your plan stays on {nameOf(pending.from)} until this one is ready.</p>
        </div>
      )}
      {error && !pending && <p className="wayout__error">{error}</p>}

      {/* ⭐⭐ WHICH PLAN IS SHOWING, AND EVERY OTHER ONE A CLICK AWAY. Daniel:
          "you cant switch between the options or go back to original idea."
          Read from the plan itself, so it cannot claim a version is showing
          when it is not. Switching regenerates nothing. */}
      {plans.length > 1 && (
        <div className="wayout__versions" role="group" aria-label="Which plan is showing">
          <p className="wayout__versionshead">Showing on your plan</p>
          <div className="wayout__versionsrow">
            {plans.map(v => (
              <button
                key={v.version}
                type="button"
                className={`wayout__versionchip${showing === v.version ? ' is-on' : ''}`}
                aria-pressed={showing === v.version}
                disabled={!onSwitch || quiet || showing === v.version}
                onClick={() => onSwitch(v.version)}
              >
                {v.label}
              </button>
            ))}
          </div>
          {showing == null && (
            <p className="wayout__versionnote">
              Your plan was rebuilt since — none of these is showing.
            </p>
          )}
        </div>
      )}

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

function nameOf(version) {
  return version === 1 ? 'the original plan' : `version ${version}`
}

/**
 * "Drop this idea", with the consequence stated before it happens.
 * ⚠️ Everything after it goes too — see planVersions.dropIdea for why.
 */
function Drop({ thread, i, asking, onAsk, onCancel, onDrop }) {
  const out = dropIdea(thread, i)
  if (!out) return null
  const more = thread.slice(i + 1).some(m => m?.role === 'user')
  const back = out.restore ? (out.to === 'Original' ? 'the original plan' : out.to.toLowerCase()) : null
  if (!asking) {
    return (
      <button type="button" className="wayout__threadundo" onClick={onAsk}>
        Drop this idea
      </button>
    )
  }
  return (
    <div className="wayout__dropask">
      <p>
        {more ? 'This and everything said after it goes' : 'This and the reply to it go'}
        {back ? `, and your plan goes back to ${back}.` : '. Your plan does not change.'}
      </p>
      <button type="button" className="wayout__btn" onClick={onDrop}>Drop it</button>
      <button type="button" className="wayout__threadundo" onClick={onCancel}>Keep it</button>
    </div>
  )
}

/**
 * ⭐⭐ ONE REWRITE OF THE PLAN — numbered, saying what it was built around and
 * what it moved, and saying whether it is the one on the plan right now. Any
 * version can be switched to from here or from the row below; nothing about
 * an older version is locked because a newer one exists.
 */
function Version({ m, v, about, showing, onSwitch }) {
  const version = v?.version ?? 2
  const changes = Array.isArray(m.changes) ? m.changes : null
  return (
    <div className={`wayout__version${showing ? ' is-on' : ''}`}>
      <p className="wayout__versionhead">
        Version {version}
        {showing && <span className="wayout__versionbadge">On your plan now</span>}
      </p>
      {about && <p className="wayout__versionabout">Rewritten around “{about}”</p>}

      {changes && changes.length > 0 && (
        <ul className="wayout__versionchanges">
          {changes.slice(0, 4).map(c => (
            <li key={c.order}>
              <span>Move {c.order}</span>
              {c.before && <s>{c.before}</s>}
              {c.after ? <b>{c.after}</b> : <em>dropped</em>}
            </li>
          ))}
        </ul>
      )}
      {changes && changes.length === 0 && (
        <p className="wayout__versionnote">Same moves in the same order — the detail under them changed.</p>
      )}

      {showing ? (
        <a className="wayout__versionlook" href="#wayout-moves">See it on the plan ↑</a>
      ) : onSwitch ? (
        <button type="button" className="wayout__threadundo wayout__versionuse" onClick={onSwitch}>
          Put version {version} on the plan
        </button>
      ) : null}
    </div>
  )
}
