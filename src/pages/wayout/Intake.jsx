import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { Field, Dictate } from './fields'
import { isAnswered } from '../../lib/wayout/validate'
import { WAYOUT_OPENING, WAYOUT_OPEN, WAYOUT_SCREENS, WAYOUT_TOTAL_SCREENS } from '../../content/wayoutIntake'
import { loadOrCreateSession, saveAnswers, markComplete, reflect, adoptDraftInto } from '../../lib/wayout/session'
import { saveDraft, loadDraft } from '../../lib/wayout/draft'
import { supabase } from '../../lib/supabase'
import { WAYOUT_BASE, timeLine } from '../../lib/wayout/brand'
import { priceLine, priceShort, guaranteeLine } from '../../lib/wayout/pricing'

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
  const [params] = useSearchParams()

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

    // ⭐ NO ACCOUNT NEEDED TO ANSWER. Someone signed out works from a local
    // draft and is not asked for anything until the end — a wall in front of a
    // product that has not done anything yet is the worst place to put one.
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      if (!data?.user) {
        const d = loadDraft()
        // ⭐ A COLD ARRIVAL GOES TO THE FRONT DOOR, NOT THE TILL. This screen
        // is the start of the fifteen-minute paid flow; the diagnostic is three
        // minutes, free, and proves something before asking for anything. A
        // stranger landing straight here is being asked for the big commitment
        // by a product that has not yet done a single thing for them.
        //
        // ⚠️ Only when there is genuinely nothing in progress: a draft means
        // they are mid-flow, and `?start=1` is how the diagnostic's own result
        // screen sends people here deliberately, so neither gets bounced.
        if (!d && !params.get('start')) {
          navigate(`${WAYOUT_BASE}/start`, { replace: true })
          return
        }
        if (d) {
          setAnswers(d.answers ?? {})
          /**
           * 🔴🔴 ARRIVING FROM THE DIAGNOSTIC MUST NOT RE-INTRODUCE THE PRODUCT.
           * Daniel, walking the live journey: "i think it needs to be more
           * streamline, it's confusing — the 3 min thing, all the questions
           * should keep going."
           *
           * He is right and it was worse than untidy. Somebody answered six
           * questions, was told "this was the three-minute version", and landed
           * on a SECOND opening screen — new headline, new promise, another box
           * to type in — which reads as arriving at a different product rather
           * than continuing in this one. Their diagnostic answers were already
           * carried across, so step 0 was asking for a commitment they had
           * already made.
           *
           * ⚠️ Only when something was actually carried. A cold `?start=1` with
           * an empty draft still gets the opening screen, because then it really
           * is the beginning.
           */
          const carried = Object.keys(d.answers ?? {}).length > 0
          setStep(carried ? firstUnansweredStep(d.answers) : (d.step ?? 0))
        }
        setLoading(false)
        return
      }
      loadOrCreateSession()
        .then(adoptDraftInto)
        .then(s => {
          if (cancelled) return
          setSession(s)
          setAnswers(s.answers ?? {})
          // ⭐⭐ ?edit=1 IS HOW YOU CHANGE A PLAN. Daniel: "shouldn't they be
          // able to tweak it once registered?" — and the deeper reason he is
          // right is that rebuilding on the SAME answers hands back a different
          // plan for no reason, which quietly says neither one meant anything.
          // A plan should only change when something about the life changed.
          // So the way back in is through the questions, with their own answers
          // already in the boxes.
          if (params.get('edit')) setStep(1)
          // A paid session is finished — send them to the plan they bought
          // rather than showing an empty form on top of it.
          else if (s.status === 'paid') navigate(`${WAYOUT_BASE}/plan`, { replace: true })
          /**
           * 🔴🔴 THE DEAD END AT THE END OF THE WHOLE FLOW. Daniel: "when i went
           * to create an account and did that here is where it brought me" — back
           * into the questions, on a screen he had already answered.
           *
           * Somebody signed out answers everything into a local draft, hits the
           * account wall, signs up, and lands on `/plan`. `markComplete` is only
           * called on the branch that HAS a session, and they never had one while
           * answering — so the session stayed `draft`, `/plan` bounced them to the
           * intake, and the intake put them back on a question.
           *
           * ⭐⭐ THE FIX IS TO ASK THE ANSWERS, NOT THE ROUTE. If there is nothing
           * left to ask, there is nothing to show them here — mark it complete and
           * send them to the plan they just finished earning. That is true however
           * they got here, which the draft's step number was not.
           */
          else if (intakeIsComplete(s.answers ?? {})) {
            markComplete(s.id, s.answers)
              .then(() => { if (!cancelled) navigate(`${WAYOUT_BASE}/plan`, { replace: true }) })
              .catch(err => { if (!cancelled) setLoadError(err.message) })
            return
          }
          // Someone part-way through resumes where they stopped rather than
          // re-reading questions they already answered.
          else if (s.answers && Object.keys(s.answers).length > 0) {
            setStep(firstUnansweredStep(s.answers))
          }
        })
        .catch(err => { if (!cancelled) setLoadError(err.message) })
        .finally(() => { if (!cancelled) setLoading(false) })
    })

    return () => { cancelled = true }
  }, [navigate, preview, params])

  const screen = step === 0 ? null : WAYOUT_SCREENS[step - 1]

  // 🔴 EVERY ADVANCE LANDED WHEREVER THE LAST ONE ENDED. These screens are long
  // enough to scroll, and React keeps the scroll position across a state
  // change, so pressing Next at the bottom of screen three dropped you at the
  // bottom of screen four — past the question you were being asked. The app
  // shell has ScrollToTopOnNavigate for route changes; this is a step change
  // inside one route, so nothing was watching it.
  //
  // ⚠️ 'instant', not smooth: a half-second scroll animation between every
  // question reads as the page fighting you.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [step])

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
        if (session) {
          setSaving(true)
          try { await saveAnswers(session.id, answers) } catch { /* saved again next step */ }
          setSaving(false)
        } else {
          saveDraft(answers, 1)
        }
      }
      setStep(1)
      return
    }

    // 🔴 `screen` IS UNDEFINED ON THE OPEN-BOX STEP — it is step 7 of a
    // six-screen array. This loop ran unconditionally and threw before reaching
    // the navigation, so "See the plan" never worked for anybody, and the crash
    // was silent: a TypeError in a click handler just does nothing visible.
    if (screen) {
      const missing = {}
      for (const f of visibleFields(screen, answers)) {
        if (!isAnswered(f, answers[f.key])) missing[f.key] = f.emptyMessage ?? 'Add an answer.'
      }
      if (Object.keys(missing).length) { setErrors(missing); return }
      kickOffReflection(screen)
    }

    if (preview) {
      if (step > WAYOUT_TOTAL_SCREENS) { navigate(`${WAYOUT_BASE}/preview`); return }
      setStep(step + 1)
      return
    }

    // ── No account yet ──────────────────────────────────────────────────
    // 🔴 THE WALL MOVED TO THE END. They answer everything as a stranger, and
    // are only asked for an account at the point where they can see what they
    // would be keeping. Nothing is lost by saying no — the draft is still here.
    if (!session) {
      if (step > WAYOUT_TOTAL_SCREENS) {
        saveDraft(answers, step)
        navigate(`${WAYOUT_BASE}/enter?next=${encodeURIComponent(`${WAYOUT_BASE}/plan`)}`)
        return
      }
      saveDraft(answers, step + 1)
      setStep(step + 1)
      return
    }

    setSaving(true)
    try {
      if (step > WAYOUT_TOTAL_SCREENS) {
        await markComplete(session.id, answers)
        // ⚠️ `rebuild` is what tells the plan their answers moved. Without it a
        // stored map that still passes the contract renders untouched and they
        // would walk every question to see the same plan — which is exactly
        // what happened to Daniel this morning, one layer up.
        navigate(`${WAYOUT_BASE}/plan${params.get('edit') ? '?rebuild=1' : ''}`)
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
      <WayoutShell wide signIn>
        {/* ⚠️ THIS SCREEN AND THE OPEN BOX WERE THE LAST TWO STILL ON THE OLD
            TWO-COLUMN LAYOUT, and they render a raw <textarea> rather than going
            through <Field> — so the dictation added everywhere else never reached
            either of them. One is the first question anybody answers; the other is
            `story`, the required catch-all that carries an illness, a bankruptcy
            or a record. Both are exactly where somebody would rather talk. */}
        <div className="wayout__ask2">
          <div className="wayout__askstage">
            <h1 className="wayout__bigq wayout__rise">
              <Marked text={WAYOUT_OPENING.headline} highlight={WAYOUT_OPENING.highlight} />
            </h1>
            <p className="wayout__lead wayout__rise wayout__r1" style={{ maxWidth: '54ch' }}>
              {WAYOUT_OPENING.lead}
            </p>

            <label className="wayout__label wayout__rise wayout__r2" htmlFor="wayout-out">{f.label}</label>
            <div className="wayout__withmic wayout__rise wayout__r3">
              <textarea
                id="wayout-out"
                className="wayout__textarea"
                placeholder={f.placeholder}
                value={answers[f.key] ?? ''}
                onChange={e => setValue(f.key, e.target.value)}
              />
              <Dictate value={answers[f.key]} onChange={v => setValue(f.key, v)} label={f.label} />
            </div>
            {f.hint && <p className="wayout__hint wayout__rise wayout__r4">{f.hint}</p>}
            {errors[f.key] && <p className="wayout__error">{errors[f.key]}</p>}

            <button className="wayout__btn wayout__rise wayout__r4" onClick={next} disabled={saving}>
              {WAYOUT_OPENING.cta}
            </button>
            <p className="wayout__fine wayout__rise wayout__r4" style={{ textAlign: 'left' }}>
              {timeLine()} {priceShort()}
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
        <div className="wayout__ask2">
          <div className="wayout__prog"><b style={{ width: '100%' }} /></div>
          <div className="wayout__askstage">
            <p className="wayout__kicker wayout__rise">Last one</p>
            <h1 className="wayout__bigq wayout__rise wayout__r1">{WAYOUT_OPEN.question}</h1>
            <p className="wayout__lead wayout__rise wayout__r2" style={{ maxWidth: '56ch' }}>
              {WAYOUT_OPEN.lead}
            </p>

            <label className="wayout__label wayout__rise wayout__r3" htmlFor="wayout-story">{f.label}</label>
            <div className="wayout__withmic wayout__rise wayout__r3">
              <textarea
                id="wayout-story"
                className="wayout__textarea wayout__textarea--tall"
                placeholder={f.placeholder}
                value={answers[f.key] ?? ''}
                onChange={e => setValue(f.key, e.target.value)}
              />
              <Dictate value={answers[f.key]} onChange={v => setValue(f.key, v)} label={f.label} />
            </div>
            {WAYOUT_OPEN.hint && <p className="wayout__hint wayout__rise wayout__r4">{WAYOUT_OPEN.hint}</p>}
            {errors[f.key] && <p className="wayout__error">{errors[f.key]}</p>}
            {errors._save && <p className="wayout__error">{errors._save}</p>}

            <button className="wayout__btn wayout__rise wayout__r4" onClick={next} disabled={saving}>
              {WAYOUT_OPEN.cta}
            </button>
          </div>
          <div className="wayout__nav">
            <button className="wayout__back" onClick={back} aria-label="Back">←</button>
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
    <WayoutShell wide>
      {/* ⭐⭐ THE SAME OBJECT AS THE SIX TAPS BEFORE IT. Daniel walked the live
          journey and the complaint was that it stopped feeling like one thing:
          "it needs to be more streamline." The handoff was fixed first — no
          second introduction — but the DESIGN still changed underneath you at
          the same moment, because the diagnostic had been rebuilt and this had
          not. Kicker, progress bar, big question, rising entrance: identical.

          ⚠️ THE OLD LEFT PANEL IS NOT SIMPLY DELETED, IT IS REDISTRIBUTED. Every
          piece of it was there for a reason and each reason still holds — the
          section and its WHY (a question with no stated reason reads as data
          collection, and people answer that carefully rather than honestly), how
          much further, what was heard, and the price. They now sit where the
          equivalent sits on a tap screen, so nothing was lost and the dead
          column on the left went with it. */}
      <div className="wayout__ask2">
        <div className="wayout__prog">
          <b style={{ width: `${((step - 1) / WAYOUT_TOTAL_SCREENS) * 100}%` }} />
        </div>

        <div className="wayout__askstage" key={step}>
          {screen?.section && (
            <p className="wayout__kicker wayout__rise">{screen.section}</p>
          )}
          <h1 className="wayout__bigq wayout__rise wayout__r1">{screen.question}</h1>
          {screen?.why && (
            <p className="wayout__lead wayout__rise wayout__r2" style={{ maxWidth: '58ch' }}>
              {screen.why}
            </p>
          )}

          <div className="wayout__fields wayout__rise wayout__r3">
            {/* ⭐⭐ ONLY WHAT APPLIES. Daniel: "make sure the questions have value,
                no redundancy… smarter questions that answer more than one thing to
                speed up the onboarding." The audit found no dead questions — every
                one of the 37 is consumed somewhere — but NO field was conditional,
                so a single person was still asked what their partner wants and
                somebody who ticked "doesn't apply" on faith was still asked which
                practice and what it holds in their week.
                🔴 On the screen whose whole job is being listened to, that is the
                worst possible place for the form to prove it is not. */}
            {visibleFields(screen, answers).map(f => (
              <div key={f.key}>
                {f.label && <label className="wayout__label">{f.label}</label>}
                <Field field={f} value={answers[f.key]} onChange={v => setValue(f.key, v)} />
                {f.hint && <p className="wayout__hint">{f.hint}</p>}
                {errors[f.key] && <p className="wayout__error">{errors[f.key]}</p>}
              </div>
            ))}
          </div>

          {screen.hint && <p className="wayout__hint wayout__rise wayout__r4">{screen.hint}</p>}
          {errors._save && <p className="wayout__error">{errors._save}</p>}

          <button className="wayout__btn wayout__rise wayout__r4" onClick={next} disabled={saving}>
            {step === WAYOUT_TOTAL_SCREENS ? 'Almost done' : 'Next'}
          </button>
        </div>

        {/* ⚠️ Only what is BEHIND them. Listing the questions still to come would
            show the destination question early, and the whole reason the order
            runs constraints-first is that seeing the dream first teaches people
            to answer the constraints in a way that protects it. */}
        <div className="wayout__sofar">
          <em>Question {step} of {WAYOUT_TOTAL_SCREENS}</em>
          {reflection
            ? <span className="wayout__tok">{reflection}</span>
            : <span className="wayout__soempty">{priceShort()}</span>}
        </div>

        <div className="wayout__nav">
          <button className="wayout__back" onClick={back} aria-label="Back">←</button>
          {/* ⭐ Stays on screen throughout. Somebody who reads the price at
              minute one cannot be ambushed at minute fifteen. */}
          {reflection && <span className="wayout__fine">{priceShort()}</span>}
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
/**
 * 🔴 THE FIELDS ACTUALLY ON SCREEN, WHICH IS NOT THE SAME AS THE FIELDS DEFINED.
 *
 * Every place that walks a screen's fields must walk THIS, not `screen.fields`.
 * A hidden field that is also required would block the form with an error
 * rendered nowhere — the button does nothing, no message appears, and there is
 * no way for the person to find out why. None of today's five conditionals are
 * required, so this is a guard against the next one rather than a live bug.
 */
function visibleFields(screen, answers) {
  return (screen?.fields ?? []).filter(f => !f.showIf || f.showIf(answers))
}

/**
 * 🔴🔴 THIS RETURNED THE LAST SCREEN WHEN EVERY SCREEN WAS ANSWERED, and that
 * off-by-one is half of the worst bug in the product: somebody finished all the
 * questions, was asked to make an account, made one — and was dropped back onto
 * a question they had already answered.
 *
 * ⭐ Past the last screen is `WAYOUT_TOTAL_SCREENS + 1`, which is the open box.
 * Returning `WAYOUT_TOTAL_SCREENS` means "go and read screen six again".
 */
function firstUnansweredStep(answers) {
  for (let i = 0; i < WAYOUT_SCREENS.length; i++) {
    const unanswered = visibleFields(WAYOUT_SCREENS[i], answers)
      .some(f => !isAnswered(f, answers[f.key]))
    if (unanswered) return i + 1
  }
  return WAYOUT_TOTAL_SCREENS + 1
}

/** Every screen answered AND the open box written. Nothing left to ask. */
function intakeIsComplete(answers) {
  return firstUnansweredStep(answers) > WAYOUT_TOTAL_SCREENS
    && isAnswered(WAYOUT_OPEN.field, answers[WAYOUT_OPEN.field.key])
}
