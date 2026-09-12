import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { Field } from './fields'
import { isAnswered } from '../../lib/wayout/validate'
import { WAYOUT_OPENING, WAYOUT_SCREENS, WAYOUT_TOTAL_SCREENS } from '../../content/wayoutIntake'
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

export default function Intake() {
  const navigate = useNavigate()

  // step 0 is the opening screen; 1..6 are the intake screens.
  const [step, setStep]         = useState(0)
  const [answers, setAnswers]   = useState({})
  const [session, setSession]   = useState(null)
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [loadError, setLoadError] = useState('')

  // Reflections are keyed by the screen they were generated FROM, and rendered
  // on the screen after it. Held in a ref as well as state so the fetch can
  // check for one already in flight without re-running on every render.
  const [reflections, setReflections] = useState({})
  const inFlight = useRef(new Set())

  useEffect(() => {
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
  }, [navigate])

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
      setSaving(true)
      try { await saveAnswers(session.id, answers) } catch { /* keep going; saved again on the next step */ }
      setSaving(false)
      setStep(1)
      return
    }

    const missing = {}
    for (const f of screen.fields) {
      if (!isAnswered(f, answers[f.key])) missing[f.key] = f.emptyMessage ?? 'Add an answer.'
    }
    if (Object.keys(missing).length) { setErrors(missing); return }

    kickOffReflection(screen)

    setSaving(true)
    try {
      if (step === WAYOUT_TOTAL_SCREENS) {
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
      <WayoutShell>
        <h1><Marked text={WAYOUT_OPENING.headline} highlight={WAYOUT_OPENING.highlight} /></h1>
        <p className="wayout__lead">{WAYOUT_OPENING.lead}</p>

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
      </WayoutShell>
    )
  }

  // ── S1–S6 ─────────────────────────────────────────────────────────────────
  // The reflection shown here was generated from the PREVIOUS screen.
  const prev = WAYOUT_SCREENS[step - 2]
  const reflection = prev ? reflections[prev.id] : null

  return (
    <WayoutShell count={`${step} of ${WAYOUT_TOTAL_SCREENS}`}>
      {reflection && <div className="wayout__reflect">{reflection}</div>}

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
          {step === WAYOUT_TOTAL_SCREENS ? 'See the plan' : 'Next'}
        </button>
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
