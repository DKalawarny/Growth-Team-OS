import { useState } from 'react'
import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { supabase } from '../../lib/supabase'
import { loadDraft, saveDraft } from '../../lib/wayout/draft'
import { DIAGNOSTIC_OPENING, DIAGNOSTIC_NOTE, DIAGNOSTIC_REGION, DIAGNOSTIC_QUESTIONS, PATHS, choosePath, whyNot } from '../../content/wayoutDiagnostic'
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
  // The one place to write on the free side.
  const [note, setNote]       = useState('')
  // ⚠️ Not one of the six — see DIAGNOSTIC_REGION. It rides on the note screen.
  const [region, setRegion]   = useState('')

  const q = DIAGNOSTIC_QUESTIONS[step]

  /** Record and land. Split out so the note step can call it too. */
  function finish(all, written, where) {
    setDone(true)
    const path = choosePath(all)
    const carried = {}
    if (Array.isArray(all.goalType) && all.goalType.length) carried.goalType = all.goalType
    if (all.horizon) carried.horizon = all.horizon
    const IMM = {
      kids:    { key: 'kids-home',   label: 'Kids at home' },
      partner: { key: 'partner-job', label: 'Partner’s job' },
      parent:  { key: 'parent',      label: 'Aging parent' },
      nothing: { key: 'nothing',     label: 'Nothing, really' },
    }
    const imm = (Array.isArray(all.immovable) ? all.immovable : [all.immovable])
      .map(k => IMM[k]).filter(Boolean).map(o => ({ ...o, custom: false }))
    if (imm.length) carried.immovables = imm
    // ⭐ What they wrote here is the best sentence on the free side — carry it
    // into the intake's open box rather than losing it at the paywall.
    if (written?.trim()) carried.story = written.trim()
    // ⭐ Carried like the rest, so somebody who goes on to the full version is
    // not asked the same thing twice thirty seconds apart.
    if (where) carried.region = where
    if (Object.keys(carried).length) {
      const existing = loadDraft()
      saveDraft({ ...carried, ...(existing?.answers ?? {}) }, existing?.step ?? 0)
    }
    supabase.from('wayout_diagnostics').insert({ answers: { ...all, note: written || null, region: where || null }, path })
      .then(({ error }) => { if (error) console.warn('[wayout] diagnostic not recorded:', error.message) })
  }

  function pick(key) {
    // ⚠️ A multi question does NOT advance on tap — it toggles, and the person
    // says when they are done. Advancing on the first tap would make "pick as
    // many as are true" a lie the moment they tried it.
    if (q.multi) {
      const cur = Array.isArray(answers[q.key]) ? answers[q.key] : []
      const opt = q.options.find(o => o.key === key)
      const exclusives = q.options.filter(o => o.exclusive).map(o => o.key)
      let next
      if (cur.includes(key)) next = cur.filter(k => k !== key)
      else if (opt?.exclusive) next = [key]
      else next = [...cur.filter(k => !exclusives.includes(k)), key]
      setAnswers({ ...answers, [q.key]: next })
      return
    }

    const next = { ...answers, [q.key]: key }
    setAnswers(next)

    if (step < DIAGNOSTIC_QUESTIONS.length - 1) {
      setStep(step + 1)
      return
    }

    setStep(DIAGNOSTIC_QUESTIONS.length)   // hand off to the note
  }

  if (done) return <Result answers={answers} note={note} />

  // ── The note ────────────────────────────────────────────────────────────
  if (step === DIAGNOSTIC_QUESTIONS.length) {
    return (
      <WayoutShell wide noindex>
        <div className="wayout__spread">
          <div className="wayout__col">
            <p className="wayout__q">{DIAGNOSTIC_NOTE.question}</p>
            <p className="wayout__lead">Six taps can’t hold a situation. One line, if there’s one worth saying.</p>
          </div>
          <div className="wayout__col">
            <label className="wayout__label" htmlFor="wayout-note">{DIAGNOSTIC_NOTE.label}</label>
            <textarea
              id="wayout-note"
              className="wayout__textarea"
              placeholder={DIAGNOSTIC_NOTE.placeholder}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <p className="wayout__hint">{DIAGNOSTIC_NOTE.hint}</p>

            <p className="wayout__label" style={{ marginTop: 22 }}>{DIAGNOSTIC_REGION.label}</p>
            <div className="wayout__chips">
              {DIAGNOSTIC_REGION.options.map(o => (
                <button
                  type="button"
                  key={o.key}
                  className={`wayout__chip${region === o.key ? ' wayout__chip--on' : ''}`}
                  aria-pressed={region === o.key}
                  onClick={() => setRegion(region === o.key ? '' : o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="wayout__hint">{DIAGNOSTIC_REGION.hint}</p>

            <div className="wayout__nav">
              <button className="wayout__back" onClick={() => setStep(step - 1)} aria-label="Back">←</button>
              <button className="wayout__btn" onClick={() => finish(answers, note, region)}>See where you land</button>
            </div>
          </div>
        </div>
      </WayoutShell>
    )
  }

  if (step === -1) {
    return (
      <WayoutShell wide noindex>
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

function Result({ answers, note }) {
  const key  = choosePath(answers)
  const path = PATHS[key]
  const others = whyNot(key, answers)

  return (
    <WayoutShell title="The path that fits you">
      <p className="wayout__who">The path that fits you</p>
      <h2>{path.name}</h2>
      <p className="wayout__lead">{path.lead}</p>
      <p className="wayout__body">{path.body}</p>

      {/* ⭐ Their own sentence, back on the screen. It is the only thing here
          they wrote rather than tapped, and showing it is the cheapest proof
          available that something was actually read. */}
      {note?.trim() && (
        <div className="wayout__seen" style={{ marginTop: 22 }}>
          <q>{note.trim()}</q>
          <b>The full version plans around this. It’s the part six taps can’t hold.</b>
        </div>
      )}

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

      {/* ⭐ Daniel: the result should also ask HOW they'd want to get there.
          It is the one question the free side can pose without answering —
          and it is what the six honest questions are for. */}
      <h3 className="wayout__label">What it doesn’t know yet</h3>
      <ul className="wayout__list">
        <li>How you’d actually <b>want</b> to get there — and what you’d refuse to do.</li>
        <li>What “enough” is for you, as a number or a week.</li>
        <li>What you’ve already tried, and why it stopped.</li>
        <li>Who else this has to work for.</li>
      </ul>
      <p className="wayout__hint">
        Those change the order of the steps more than anything you just tapped.
      </p>

      {/* ⭐ Daniel: the result should also ask HOW they'd want to get there.
          These are the questions the free side can pose without answering, and
          naming them is what makes the next fifteen minutes feel worth it. */}
      <h3 className="wayout__label">What it doesn’t know yet</h3>
      <ul className="wayout__list">
        <li>How you’d actually <b>want</b> to get there — and what you’d refuse to do.</li>
        <li>What “enough” is for you, as a number or as a week.</li>
        <li>What you’ve already tried, and why it stopped.</li>
        <li>Who else this has to work for.</li>
      </ul>
      <p className="wayout__hint">Those change the order of the steps more than anything you just tapped.</p>

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
