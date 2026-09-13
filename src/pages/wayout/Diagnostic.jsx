import { useState } from 'react'
import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { supabase } from '../../lib/supabase'
import { DIAGNOSTIC_OPENING, DIAGNOSTIC_QUESTIONS, PATHS, choosePath, whyNot } from '../../content/wayoutDiagnostic'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import { WAYOUT_PRICE_LABEL, WAYOUT_PAYMENTS_LIVE } from '../../lib/wayout/pricing'

/**
 * The way out — the free diagnostic. The marketing front door.
 *
 * Public and unauthenticated: six taps, one result screen, no account. The path
 * is decided by rules in wayoutDiagnostic.js, never by a model — see the note
 * at the top of that file for why that is a hard constraint and not a shortcut.
 *
 * ⚠️ One tap advances. No Next button, because a six-question form with a Next
 * on every screen is twelve taps, and the promise on the page is three minutes.
 */
/** Split a headline on its highlight phrase so the mark can wrap it. */
function Marked({ text, highlight }) {
  if (!highlight || !text?.includes(highlight)) return text
  const [before, ...rest] = text.split(highlight)
  return <>{before}<mark>{highlight}</mark>{rest.join(highlight)}</>
}

export default function Diagnostic() {
  // ⚠️ -1 is the opening screen. Not "0 of 6" — it is not a question, and
  // numbering it would make the promise of six into seven on the first breath.
  const [step, setStep]       = useState(-1)
  const [answers, setAnswers] = useState({})
  const [done, setDone]       = useState(false)

  const q = DIAGNOSTIC_QUESTIONS[step]

  function pick(key) {
    // ⚠️ A multi question does NOT advance on tap — it toggles, and the person
    // says when they are done. Advancing on the first tap would make "pick as
    // many as are true" a lie the moment they tried it.
    if (q.multi) {
      const cur = Array.isArray(answers[q.key]) ? answers[q.key] : []
      setAnswers({ ...answers, [q.key]: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] })
      return
    }

    const next = { ...answers, [q.key]: key }
    setAnswers(next)

    if (step < DIAGNOSTIC_QUESTIONS.length - 1) {
      setStep(step + 1)
      return
    }

    setDone(true)
    // Record it, and never let a logging failure stop someone seeing their
    // result. The row is how we find out whether this door converts at all,
    // which is the only reason it exists — but it is our question, not theirs.
    const path = choosePath(next)
    supabase
      .from('wayout_diagnostics')
      .insert({ answers: next, path })
      .then(({ error }) => { if (error) console.warn('[wayout] diagnostic not recorded:', error.message) })
  }

  if (done) return <Result answers={answers} />

  if (step === -1) {
    return (
      <WayoutShell noindex>
        <div className="wayout__spread">
        <div className="wayout__col">
          <h1><Marked text={DIAGNOSTIC_OPENING.headline} highlight={DIAGNOSTIC_OPENING.highlight} /></h1>
          <p className="wayout__lead">{DIAGNOSTIC_OPENING.lead}</p>
        </div>
        <div className="wayout__col">
          <p className="wayout__body">{DIAGNOSTIC_OPENING.body}</p>
          <button className="wayout__btn" onClick={() => setStep(0)}>{DIAGNOSTIC_OPENING.cta}</button>
          <p className="wayout__fine">{DIAGNOSTIC_OPENING.fine}</p>
        </div>
        </div>
      </WayoutShell>
    )
  }

  return (
    <WayoutShell count={`${step + 1} of ${DIAGNOSTIC_QUESTIONS.length}`} noindex>
      <p className="wayout__q">{q.question}</p>
      <div className="wayout__chips">
        {q.options.map(opt => {
          const on = q.multi
            ? (answers[q.key] ?? []).includes(opt.key)
            : answers[q.key] === opt.key
          return (
            <button
              type="button"
              key={opt.key}
              className={`wayout__chip${on ? ' wayout__chip--on' : ''}`}
              aria-pressed={on}
              onClick={() => pick(opt.key)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {q.hint && <p className="wayout__hint">{q.hint}</p>}
      {q.multi && (
        <button
          className="wayout__btn"
          disabled={!(answers[q.key] ?? []).length}
          onClick={() => setStep(step + 1)}
        >
          Next
        </button>
      )}
      <div className="wayout__nav">
        <button className="wayout__back" onClick={() => setStep(step - 1)} aria-label="Back">←</button>
      </div>
    </WayoutShell>
  )
}

function Result({ answers }) {
  const key  = choosePath(answers)
  const path = PATHS[key]
  const others = whyNot(key, answers)

  return (
    <WayoutShell title="The path that fits you">
      <p className="wayout__who">The path that fits you</p>
      <h2>{path.name}</h2>
      <p className="wayout__lead">{path.lead}</p>
      <p className="wayout__lead">{path.body}</p>

      {/* ⭐ Naming what does NOT fit, and why, is the part that earns the next
          click. A result screen that only praises the chosen path reads as a
          horoscope — and "crossed off, on purpose" is the same move the paid
          map makes, so this is an honest sample of the product rather than an
          advert for it. */}
      <h3 className="wayout__label">Why not the other three</h3>
      <div className="wayout__cut">
        {others.map(o => (
          <div key={o.name} className="wayout__cutrow" style={{ cursor: 'default' }}>
            <s>{o.name}</s>
            <span className="wayout__cutwhy">{o.why}</span>
          </div>
        ))}
      </div>

      <Link to={`${WAYOUT_BASE}?start=1`} className="wayout__btn" style={{ textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
        {WAYOUT_PAYMENTS_LIVE ? `Build my full map — ${WAYOUT_PRICE_LABEL}` : 'Answer the six questions'}
      </Link>
      <p className="wayout__hint">
        This was the three-minute version. The full one asks what you own, what
        you’d trade and what can’t move, then puts the moves in order.
      </p>
    </WayoutShell>
  )
}
