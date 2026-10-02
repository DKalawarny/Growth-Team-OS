import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { Field } from './fields'
import { currencyFor } from '../../lib/wayout/currency'
import { isAnswered } from '../../lib/wayout/validate'
import { sessionHome } from '../../lib/wayout/sessionHome'
import { visibleChapterFields, CHAPTER_LEAD } from '../../content/wayoutChapter'
import { loadOrCreateSession, saveAnswers, markComplete, chapterChain } from '../../lib/wayout/session'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import { tidyQuote, firstSentences } from '../../lib/wayout/tidyQuote'
import { humanError } from '../../lib/wayout/humanError'

/**
 * The way out — the door into a new chapter.
 *
 * 🔴🔴 IT HAS TO FEEL LIKE A DIFFERENT ROOM. Daniel: "it needs to be different,
 * like entering a new level — not the same background, different questions. If
 * it's the same, people will stop using it."
 *
 * Before this, "start the next one" dropped somebody into the middle of the six
 * intake screens with every box already filled and asked them to press Next to
 * the end. The machinery was right — only four answers were actually cleared —
 * and the EXPERIENCE was identical to starting over, which on a product whose
 * whole shape is "three moves and out" is the difference between a subscription
 * and a churn.
 *
 * ⭐⭐ SO TWO THINGS CHANGE AT ONCE, AND NEITHER WORKS ALONE.
 *   1. THE QUESTIONS ARE ONES ONLY A RETURNING PERSON CAN BE ASKED — see
 *      wayoutChapter.js. Nobody arriving for the first time has a last time.
 *   2. THE GROUND IS DARK. Every other screen in this product is cream. This one
 *      is not, and that is the entire visual argument: you are somewhere else
 *      now. It is the only inversion in the product, so it cannot become a
 *      pattern and cannot stop meaning anything.
 *
 * ⭐⭐ AND THEIR OWN FIRST WORDS ARE AT THE TOP. Not a progress bar, not a streak
 * — the sentence they wrote about what "out" looked like before any of it
 * happened. It is the one piece of credit that cannot be read as flattery,
 * because they wrote it. See chapterChain() for why the old MAP never appears
 * here and only their own answers do.
 */
export default function Chapter() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [session, setSession] = useState(null)
  const [chain, setChain]     = useState([])
  const [answers, setAnswers] = useState({})
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let cancelled = false
    loadOrCreateSession()
      .then(async s => {
        if (cancelled) return
        // ⚠️ A first plan has no chapter to open. Anyone who lands here without
        // one belongs in the ordinary questions, not on a page about last time.
        if ((s.chapter ?? 1) < 2) { navigate(`${WAYOUT_BASE}/questions`, { replace: true }); return }
        // 🔴 THIS ASKED WHETHER THEY HAD PAID, WHICH CANNOT BE TRUE YET, SO THE
        //    DOOR TO A FINISHED CHAPTER NEVER CLOSED. See lib/wayout/sessionHome.js
        //    — the decision lives there so the test can check the real thing.
        //
        // ⭐⭐ `?edit=1` IS THE ONE THING THAT REOPENS IT, and it has to, because
        //    this screen is BOTH the door into a chapter and the place that
        //    chapter's answers are edited. "Rebuild the plan around it" sends
        //    people here on purpose — a plan changes when the life changes, not
        //    on a button — and closing the door to them would take away the only
        //    way a chapter-two plan can be changed at all.
        //    ⚠️ Exactly the shape the intake already uses for chapter one.
        if (!params.get('edit') && sessionHome(s) === 'plan') {
          navigate(`${WAYOUT_BASE}/plan`, { replace: true }); return
        }
        setSession(s)
        setAnswers(s.answers ?? {})
        const c = await chapterChain(s)
        if (!cancelled) { setChain(c); setLoading(false) }
      })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [navigate, params])

  const outcome = session?.continues_from_outcome ?? null
  /**
   * ⚠️ RECOMPUTED ON EVERY RENDER, because tapping "where I live" has to reveal
   * a field immediately. And validation reads THIS list, not the full one —
   * demanding an answer to a question the screen never showed is the oldest
   * form-bug there is.
   */
  const fields  = visibleChapterFields(outcome, answers)
  const first   = chain[0] ?? null
  const chapter = session?.chapter ?? 2

  async function submit() {
    const missing = {}
    for (const f of fields) {
      if (f.required && !isAnswered(f, answers[f.key])) missing[f.key] = f.emptyMessage ?? 'Add an answer.'
    }
    if (Object.keys(missing).length) { setErrors(missing); return }
    setSaving(true)
    try {
      await saveAnswers(session.id, answers)
      // ⚠️ Everything else carried over from the last chapter, so answering
      // these IS finishing — there is no further screen to send them to.
      await markComplete(session.id, answers)
      /**
       * 🔴🔴 EDITING THE ANSWERS CHANGED NOTHING ON THE SCREEN. /plan regenerates
       * only when there is NO map or when it is told to, so somebody who came
       * back here, corrected what was wrong and pressed the button landed on
       * the identical plan they had before. Verified in the data: answers saved
       * at 00:34Z, stored map still the one written fourteen hours earlier.
       * ⚠️ `?rebuild=1` is the existing instruction for this, and it is capped
       * and stripped from the URL on arrival — so a reload cannot spend money
       * twice. A chapter being finished for the FIRST time has no map, and
       * /plan builds it without being asked.
       */
      navigate(session.map ? `${WAYOUT_BASE}/plan?rebuild=1` : `${WAYOUT_BASE}/plan`)
    } catch (err) {
      setErrors({ _save: err.message })
      setSaving(false)
    }
  }

  if (loading) return <WayoutShell><p className="wayout__lead">One moment.</p></WayoutShell>
  if (error)   return <WayoutShell><p className="wayout__lead">{humanError(error)}</p></WayoutShell>

  return (
    <WayoutShell title={`Chapter ${chapter}`} wide>
      <div className="wayout__chapter">
        <p className="wayout__chapterkick">Chapter {chapter}</p>
        <h1 className="wayout__chapterh">A different plan, for who you are now.</h1>
        {outcome && CHAPTER_LEAD[outcome] && (
          <p className="wayout__chapterlead">{CHAPTER_LEAD[outcome]}</p>
        )}

        {/* ⭐⭐ WHERE THEY STARTED, IN THEIR OWN WORDS. The single most valuable
            row in the whole history — what "out" meant to them before anything
            had moved. ⚠️ Their answer only. Never a figure from an old map. */}
        {first?.answers?.out && (
          <div className="wayout__origin">
            <span>When you started{first.createdAt ? `, ${new Date(first.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}` : ''}, you wrote:</span>
            {/* ⚠️ TRIMMED HERE, AND ONLY HERE. `out` asks for one sentence and
                accepts a paragraph — a 905-character answer set in the
                handwriting face filled this entire screen and read as somebody
                else's text. The full answer is what the plan is built from and
                /history shows it whole. */}
            <q>{firstSentences(tidyQuote(first.answers.out))}</q>
            {chain.length > 1 && (
              <Link className="wayout__originlink" to={`${WAYOUT_BASE}/history`}>
                See the whole way here →
              </Link>
            )}
          </div>
        )}

        <div className="wayout__chapterfields">
          {fields.map(f => (
            <div key={f.key} className="wayout__chapterfield">
              {/* ⚠️ `Field` renders the CONTROL ONLY — the label and hint are the
                  caller's job, exactly as the intake does it. Rendering Field on
                  its own produced a column of unlabelled inputs, which is the
                  form asking questions it has not asked. */}
              {f.label && <label className="wayout__label">{f.label}</label>}
              <Field
                field={f}
                currency={currencyFor(answers.region).symbol}
                value={answers[f.key]}
                onChange={v => {
                  setAnswers(a => ({ ...a, [f.key]: v }))
                  setErrors(e => (e[f.key] ? { ...e, [f.key]: undefined } : e))
                }}
              />
              {f.hint && <p className="wayout__hint">{f.hint}</p>}
              {errors[f.key] && <p className="wayout__error">{errors[f.key]}</p>}
            </div>
          ))}
        </div>

        {errors._save && <p className="wayout__error">{errors._save}</p>}

        <button className="wayout__btn wayout__btn--sun" onClick={submit} disabled={saving}>
          {saving ? 'One moment…' : 'Build this one'}
        </button>
        <p className="wayout__chapterfine">
          Everything else you told us is still here — your town, your hours, what
          you will not do. Only what moved gets asked again.
        </p>
      </div>
    </WayoutShell>
  )
}
