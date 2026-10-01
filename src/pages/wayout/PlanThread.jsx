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
  thread = [], onSay, onRedo, onDropDraft, onSwitch, busy = false, rebuilding = false,
  pending = null, error = '', liveMap = null,
}) {
  const [text, setText] = useState('')
  const [err, setErr]   = useState('')
  const [dropping, setDropping] = useState(false)

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
  const draft     = thread.slice(open)
  const drafting  = draft.some(m => m.role === 'user') || Boolean(pending)
  const nextN     = pending?.n ?? (plans.length || 1) + 1
  const lastReply = [...draft].reverse().find(m => m.role === 'assistant')
  // ⚠️ "Answer that" is only true when the reply ASKED something. It was
  // printed under every reply, including ones with no question in them.
  const asked     = /\?/.test(lastReply?.content ?? '')
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
                <span>
                  {v.key === -1 ? 'Original — from your answers' : `“${v.about ?? 'Rewritten'}”`}
                  {/* ⭐ Two versions built from the same sentence read
                      identically — the first move is what tells them apart. */}
                  {v.map?.moves?.[0]?.title && <small>Move 1: {v.map.moves[0].title}</small>}
                </span>
                {showing === v.key && <em>Showing</em>}
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* ⭐⭐ THE IDEA IN PROGRESS IS ONE THING, SHAPED LIKE THE VERSIONS IT IS
          ABOUT TO JOIN. Daniel: "half is good half is still messy." The good
          half was the version list; the messy half was this — a bubble, a
          floating "Take that back", a quoted reply, and "Answer that and it will
          tell you what moves" printed under a reply that had asked nothing.
          Now: one box, labelled with the version it will become, an × to drop
          it (the same idiom as the version chips), the reply, and one button
          that says exactly what it does — "Make it V4".
          ⭐ THE MODEL'S JUDGEMENT DECIDES WHAT IS OFFERED, NOT WHAT IS ALLOWED:
          when the reply says the plan moved, the button is the loud one; when
          it did not, the same button is quiet — still there, because "no button
          to make this the new plan" was the original complaint. */}
      {drafting && (
        <div className={`wayout__draft${pending ? ' is-building' : ''}`} role={pending ? 'status' : undefined}>
          <div className="wayout__drafthead">
            <p className="wayout__versionhead">New idea · will be V{nextN}</p>
            {onDropDraft && !quiet && (
              <button type="button" className="wayout__versionx" aria-label="Drop this idea" onClick={() => setDropping(true)}>
                ×
              </button>
            )}
          </div>
          {draft.map((m, i) => (
            m.role === 'user'
              ? <p key={i} className="wayout__draftsaid">“{m.content}”</p>
              : !m.rebuilt && <p key={i} className="wayout__draftreply">{m.content}</p>
          ))}
          {busy && (
            <div className="wayout__draftwait"><div className="wayout__working" aria-hidden="true"><i /><i /><i /></div><span>Reading that.</span></div>
          )}
          {pending ? (
            <div className="wayout__draftwait">
              <div className="wayout__working" aria-hidden="true"><i /><i /><i /></div>
              <span>Building V{nextN}. Up to a minute — your plan stays as it is until it is ready.</span>
            </div>
          ) : !quiet && onRedo && lastReply && (
            <div className="wayout__draftact">
              {moved && <p className="wayout__draftmoved">{moved.whatChanged ?? 'That changes the order.'}</p>}
              {!moved && asked && (
                <p className="wayout__draftnote">It asked you something. Answer below to sharpen it first, or make it now.</p>
              )}
              <button
                type="button"
                className={`wayout__btn ${moved ? 'wayout__btn--sun' : 'wayout__btn--quiet'}`}
                onClick={onRedo}
              >
                Make it V{nextN}
              </button>
            </div>
          )}
        </div>
      )}
      {error && !pending && <p className="wayout__error">{error}</p>}
      {busy && !drafting && <p className="wayout__threadreply wayout__askwait">Reading that.</p>}

      {onDropDraft && (
        <Confirm
          open={dropping}
          title="Drop this idea?"
          body="What you said and the reply go. Your plan does not change."
          yes="Drop it"
          onYes={() => { setDropping(false); onDropDraft() }}
          onNo={() => setDropping(false)}
        />
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
            {drafting ? 'Add to this idea' : plans.length || lastMine > -1 ? 'Something new changed?' : 'What changed?'}
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
      {onRemove && (
        <Confirm
          open={Boolean(doomed)}
          title={doomed ? `Delete ${doomed.label}?` : ''}
          quote={doomed?.about ? `Rewritten around “${doomed.about}”` : null}
          body={doomed && showing === doomed.key
            ? 'Its plan cannot be brought back, and your plan steps back to the version before it.'
            : 'Its plan cannot be brought back.'}
          yes="Delete it"
          onYes={() => { const k = doomed.key; setAsking(null); onRemove(k) }}
          onNo={() => setAsking(null)}
        />
      )}
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

/**
 * ⭐ THE ONE CONFIRMATION, used by every destructive control on the plan.
 * Daniel: "can we make sure the x has a pop up to confirm delete." A native
 * <dialog> opened with showModal(): the page behind is inert, Escape and a
 * backdrop click cancel, and focus is held inside. ⚠️ Never window.confirm —
 * it blocks the page and cannot say what will happen in this product's words.
 * 🔴 showModal focuses the FIRST button, which is the destructive one — Enter
 * by reflex would delete. Focus is moved to the safe answer.
 */
function Confirm({ open, title, quote = null, body, yes, onYes, onNo }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal?.()
      d.querySelector('[data-keep]')?.focus()
    }
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="wayout__dialog"
      aria-label={title}
      onClose={() => { if (open) onNo() }}
      onClick={e => { if (e.target === e.currentTarget) onNo() }}
    >
      {open && (
        <div className="wayout__dialogbody">
          <h3>{title}</h3>
          {quote && <p className="wayout__dialogabout">{quote}</p>}
          <p>{body}</p>
          <div className="wayout__dialogactions">
            <button type="button" className="wayout__btn wayout__btn--danger" onClick={onYes}>{yes}</button>
            <button type="button" className="wayout__threadundo" data-keep onClick={onNo}>Keep it</button>
          </div>
        </div>
      )}
    </dialog>
  )
}
