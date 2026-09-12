import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { Field } from './fields'
import { isAnswered } from '../../lib/wayout/validate'
import { WAYOUT_OPENING, WAYOUT_OPEN, WAYOUT_SCREENS, WAYOUT_TOTAL_SCREENS } from '../../content/wayoutIntake'
import { loadOrCreateSession, saveAnswers, markComplete, reflect } from '../../lib/wayout/session'
import { WAYOUT_BASE } from '../../lib/wayout/brand'

/**
 * The way out — the opening screen and the six intake screens.
 *
 * ⭐ The order of the questions is the product (see wayoutIntake.js): what
 * can't move, who's affected, what you own, the money, what you'd trade, and
 * only then where you want to end up. Asking the destination first is the
 * pleasant version and it produces a plan nobody can follow.
 */

/** Split a headline on its highlight phrase so the mark can wrap it. */
function Marked({ text, highlight }) {
  if (!highlight || !text?.includes(highlight)) return text
  const [before, ...rest] = text.split(highlight)
  return <>{before}<mark>{highlight}</mark>{rest.join(highlight)}</>
}

/**
 * ⚠️ `preview` is DEV ONLY (see Preview routes in App.jsx) and does exactly
 * three things: skips the session load, skips every write, and serves a canned
 * reflection. It changes no rendering at all — the screens, the validation and
 * the field components are the same ones a paying person gets, which is the
 * entire reason it is a prop here rather than a second copy of the intake that
 * would drift from this one within a week.
 */
export default function Intake({ preview = false, previewReflections = null }) {
  const navigate = useNavigate()

  // step 0 is the opening screen; 1..6 are the intake screens.
  const [step, setStep]         = useState(0)
  const [answers, setAnswers]   = useState({})
  const [session, setSession]   = useState(null)
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(!preview)
  const [saving, setSaving]     = useState(false)
  const [loadError, setLoadError] = useState('')

  // Reflections are keyed by the screen they were generated FROM, and rendered
  // on the screen after it. Held in a ref as well as state so the fetch can
  // check for one already in flight without re-running on every render.
  const [reflections, setReflections] = useState({})
  const inFlight = useRef(new Set())

  useEffect(() => {
    if (preview) return undefined
    let cancelled = false
    loadOrCreateSession()
      .then(s => {
        if (cancelled) return
        setSession(s)
        setAnswers(s.answers ?? {})
        // A paid session is finished — send them to the plan they bought
        // rather than showing an empty form on top of it.
        if (s.status === 'paid') navigate(`${WAYOUT_BASE}/plan`, { replace: true })
        // Someone who got part-way through resumes where they stopped rather
        // than re-reading questions they already answered.
        else if (s.answers && Object.keys(s.answers).length > 0) {
          setStep(firstUnansweredStep(s.answers))
        }
      })
      .catch(err => { if (!cancelled) setLoadError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [navigate, preview])

  const screen = step === 0 ? null : WAYOUT_SCREENS[step - 1]

  function setValue(key, value) {
    setAnswers(a => ({ ...a, [key]: value }))
    // Clear the inline error the moment they answer, rather than making them
    // press Next again to find out they fixed it.
    setErrors(e => (e[key] ? { ...e, [key]: undefined } : e))
  }

  /**
   * Kick off the reflection for the screen just completed.
   *
   * ⭐ Fire-and-forget, deliberately. It runs while the person is reading the
   * next question, so by the time they look up it is usually there — and if it
   * never arrives, nothing waited on it. Blocking Next on a model call would
   * put a spinner between every screen of a fifteen-minute form.
   */
  function kickOffReflection(fromScreen) {
    if (!fromScreen?.reflectAfter) return
    if (inFlight.current.has(fromScreen.id)) return
    inFlight.current.add(fromScreen.id)

    const screenAnswers = Object.fromEntries(
      fromScreen.fields
        .map(f => [f.key, answers[f.key]])
        .filter(([, v]) => v != null && v !== ''),
    )

    if (preview) {
      // ⚠️ The sample copy is passed IN, not written here. Left inline it ended
      // up in the production Intake chunk — unreachable, since nothing sets
      // `preview` in a prod build, but sample text has no business riding along
      // in the component a paying person loads.
      const text = previewReflections?.[fromScreen.id]
      if (text) setTimeout(() => setReflections(r => ({ ...r, [fromScreen.id]: text })), 600)
      return
    }

    reflect(screenAnswers)
      .then(text => { if (text) setReflections(r => ({ ...r, [fromScreen.id]: text })) })
      .catch(() => { /* reflect() already swallows; nothing to show either way */ })
  }

  async function next() {
    if (step === 0) {
      const f = WAYOUT_OPENING.field
      if (!isAnswered(f, answers[f.key])) {
        setErrors({ [f.key]: f.emptyMessage })
        return
      }
      if (!preview) {
        setSaving(true)
        try { await saveAnswers(session.id, answers) } catch { /* keep going; saved again on the next step */ }
        setSaving(false)
      }
      setStep(1)
      return
    }

    const missing = {}
    for (const f of screen.fields) {
      if (!isAnswered(f, answers[f.key])) missing[f.key] = f.emptyMessage ?? 'Add an answer.'
    }
    if (Object.keys(missing).length) { setErrors(missing); return }

    kickOffReflection(screen)

    if (preview) {
      if (step > WAYOUT_TOTAL_SCREENS) { navigate(`${WAYOUT_BASE}/preview`); return }
      setStep(step + 1)
      return
    }

    setSaving(true)
    try {
      if (step > WAYOUT_TOTAL_SCREENS) {
        await markComplete(session.id, answers)
        navigate(`${WAYOUT_BASE}/plan`)
        return
      }
      await saveAnswers(session.id, answers)
      setStep(step + 1)
    } catch (err) {
      setErrors({ _save: err.message })
    } finally {
      setSaving(false)
    }
  }

  function back() {
    setErrors({})
    setStep(s => Math.max(0, s - 1))
  }

  if (loading) {
    return <WayoutShell><p className="wayout__lead">One moment.</p></WayoutShell>
  }

  if (loadError) {
    return (
      <WayoutShell>
        <p className="wayout__q">That didn’t load.</p>
        <p className="wayout__lead">{loadError}</p>
        <button className="wayout__btn" onClick={() => window.location.reload()}>Try again</button>
      </WayoutShell>
    )
  }

  // ── S0 ────────────────────────────────────────────────────────────────────
  if (step === 0) {
    const f = WAYOUT_OPENING.field
    return (
      <WayoutShell wide>
        <div className="wayout__spread">
        <div className="wayout__col">
        <h1><Marked text={WAYOUT_OPENING.headline} highlight={WAYOUT_OPENING.highlight} /></h1>
        <p className="wayout__lead">{WAYOUT_OPENING.lead}</p>
        </div>

        <div className="wayout__col">
        <label className="wayout__label" htmlFor="wayout-out">{f.label}</label>
        <textarea
          id="wayout-out"
          className="wayout__textarea"
          placeholder={f.placeholder}
          value={answers[f.key] ?? ''}
          onChange={e => setValue(f.key, e.target.value)}
        />
        {errors[f.key] && <p className="wayout__error">{errors[f.key]}</p>}
        <p className="wayout__hint">{f.hint}</p>

        <button className="wayout__btn" onClick={next} disabled={saving}>
          {WAYOUT_OPENING.cta}
        </button>

        <p className="wayout__fine">
          {WAYOUT_OPENING.fine}<br />
          <span className="wayout__hand">{WAYOUT_OPENING.handwritten}</span>
        </p>
        </div>
        </div>
      </WayoutShell>
    )
  }

  // ── The open door ─────────────────────────────────────────────────────────
  // ⚠️ Deliberately NOT counted in the brand mark. The opening screen promises
  // six questions and this is a seventh box; presenting it as "7 of 6" would
  // make the promise a lie at the exact moment someone is deciding whether to
  // tell the truth.
  if (step > WAYOUT_TOTAL_SCREENS) {
    const f = WAYOUT_OPEN.field
    return (
      <WayoutShell wide>
        <div className="wayout__spread">
        <div className="wayout__col">
          <p className="wayout__q">{WAYOUT_OPEN.question}</p>
          <p className="wayout__lead">{WAYOUT_OPEN.lead}</p>
        </div>
        <div className="wayout__col">
          <label className="wayout__label" htmlFor="wayout-story">{f.label}</label>
          <textarea
            id="wayout-story"
            className="wayout__textarea wayout__textarea--tall"
            placeholder={f.placeholder}
            value={answers[f.key] ?? ''}
            onChange={e => setValue(f.key, e.target.value)}
          />
          <p className="wayout__hint">{WAYOUT_OPEN.hint}</p>
          {errors._save && <p className="wayout__error">{errors._save}</p>}
          <div className="wayout__nav">
            <button className="wayout__back" onClick={back} aria-label="Back">←</button>
            <button className="wayout__btn" onClick={next} disabled={saving}>{WAYOUT_OPEN.cta}</button>
          </div>
        </div>
        </div>
      </WayoutShell>
    )
  }

  // ── S1–S6 ─────────────────────────────────────────────────────────────────
  // The reflection shown here was generated from the PREVIOUS screen.
  const prev = WAYOUT_SCREENS[step - 2]
  const reflection = prev ? reflections[prev.id] : null

  return (
    <WayoutShell wide count={`${step} of ${WAYOUT_TOTAL_SCREENS}`}>
      <div className="wayout__spread">

      {/* ⭐ The left panel exists because a single question floating in the
          middle of a wide screen reads as an unfinished page. It is not filler:
          it answers the two things someone silently wants to know fifteen
          minutes into a form — how much further, and was any of that heard.
          On a phone `display: contents` collapses it and the reflection sits
          back above the question where it always was. */}
      <div className="wayout__col wayout__aside">
        <p className="wayout__step">Question {step} of {WAYOUT_TOTAL_SCREENS}</p>
        <div className="wayout__pips" aria-hidden="true">
          {WAYOUT_SCREENS.map((sc, i) => (
            <span
              key={sc.id}
              className={`wayout__pip${i + 1 < step ? ' wayout__pip--done' : ''}${i + 1 === step ? ' wayout__pip--now' : ''}`}
            />
          ))}
        </div>
        {/* ⚠️ Only what is BEHIND them. Listing the questions still to come
            would show the destination question early, and the whole reason the
            order runs constraints-first is that seeing the dream first teaches
            people to answer the constraints in a way that protects it. */}
        {reflection && <div className="wayout__reflect">{reflection}</div>}
        <p className="wayout__fine wayout__asidefine">Nothing to buy until you’ve seen your plan.</p>
      </div>

      <div className="wayout__col">
      <p className="wayout__q">{screen.question}</p>

      {screen.fields.map(f => (
        <div key={f.key}>
          {f.label && <label className="wayout__label">{f.label}</label>}
          <Field field={f} value={answers[f.key]} onChange={v => setValue(f.key, v)} />
          {f.hint && <p className="wayout__hint">{f.hint}</p>}
          {errors[f.key] && <p className="wayout__error">{errors[f.key]}</p>}
        </div>
      ))}

      {screen.hint && <p className="wayout__hint">{screen.hint}</p>}
      {errors._save && <p className="wayout__error">{errors._save}</p>}

      <div className="wayout__nav">
        <button className="wayout__back" onClick={back} aria-label="Back">←</button>
        <button className="wayout__btn" onClick={next} disabled={saving}>
          {step === WAYOUT_TOTAL_SCREENS ? 'Almost done' : 'Next'}
        </button>
      </div>
      </div>
      </div>
    </WayoutShell>
  )
}

/**
 * Where to drop someone resuming a draft.
 *
 * ⚠️ The first screen with a REQUIRED field unanswered, not the last screen
 * with anything on it. Someone who skipped an optional free text on screen two
 * and filled in screen three should not be sent back to two.
 */
function firstUnansweredStep(answers) {
  for (let i = 0; i < WAYOUT_SCREENS.length; i++) {
    const unanswered = WAYOUT_SCREENS[i].fields.some(f => !isAnswered(f, answers[f.key]))
    if (unanswered) return i + 1
  }
  return WAYOUT_TOTAL_SCREENS
}
