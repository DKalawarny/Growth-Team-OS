import { useState } from 'react'
import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { supabase } from '../../lib/supabase'
import { loadDraft, saveDraft } from '../../lib/wayout/draft'
import { DIAGNOSTIC_OPENING, DIAGNOSTIC_QUESTIONS, PATHS, choosePath, whyNot } from '../../content/wayoutDiagnostic'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import { WAYOUT_PAYMENTS_LIVE } from '../../lib/wayout/pricing'

/**
 * 🔴 CAPPED, AND THE CAP IS THE POINT. Daniel asked for an Other box on every
 * question, "max it at a certain character amount". Forty keeps it a label.
 */
const OTHER_MAX = 40

/**
 * ⭐ Whatever they typed into an Other box, on any of the six.
 *
 * ⚠️ IT IS THE ONLY THING ON THE FREE SIDE THEY WROTE RATHER THAN TAPPED, which
 * is why the result shows it back: quoting somebody their own words is the
 * cheapest proof available that something was read. It replaced a dedicated note
 * screen that asked for a sentence the intake now requires anyway.
 */
function theirWords(answers) {
  return DIAGNOSTIC_QUESTIONS
    .map(q => answers[`${q.key}Other`])
    .filter(t => t && t.trim())
    .join(' · ')
}

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
  // ⚠️ Not one of the six — see DIAGNOSTIC_REGION. It rides on the note screen.

  /**
   * ⭐ The Other box, and its cap. Forty characters is enough for "a boat I
   * could sell" or "my mother's place" and short enough that it stays a LABEL
   * rather than becoming a story — the six real questions after this are where
   * detail belongs, and a paragraph typed here would be read as the whole
   * situation when it is one corner of it.
   */
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherLen, setOtherLen]   = useState(0)

  const q = DIAGNOSTIC_QUESTIONS[step]

  /**
   * ⭐⭐ WHAT THEY HAVE SAID SO FAR, in their own labels, for the strip under
   * the question. Only questions already ANSWERED — showing the current one
   * would make the strip jump as they tap, and the point of it is that it only
   * ever grows.
   */
  const said = DIAGNOSTIC_QUESTIONS.slice(0, Math.max(step, 0)).flatMap(past => {
    const v = answers[past.key]
    const labels = (Array.isArray(v) ? v : v ? [v] : [])
      .map(k => past.options.find(o => o.key === k)?.label)
      .filter(Boolean)
    const own = answers[`${past.key}Other`]
    return own ? [...labels, own] : labels
  })

  /** Record and land. Split out so the note step can call it too. */
  function finish(all) {
    // ⚠️ The country arrives as a tap now, not from a separate screen.
    const where = all.region ?? ''
    // ⭐ Their own words, if there were any — the Other box on any of the six.
    // It is the only thing here they wrote rather than tapped, which is why the
    // result screen shows it back.
    const written = DIAGNOSTIC_QUESTIONS
      .map(q => all[`${q.key}Other`]).filter(Boolean).join(' · ')
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
    // ⚠️ `all` now carries `climate`; `region` is the COUNTRY and nothing else.
    // Before the rename this line destroyed the climate answer on every insert.
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

    /**
     * 🔴 STRAIGHT TO THE ANSWER. This used to hand off to a note screen that
     * carried one optional sentence and the country chip. Daniel: "this page may
     * be redundant." It was — the country is now the sixth tap, and the sentence
     * fed `story`, which the intake REQUIRES and prompts properly, so the free
     * side was collecting a thinner version of the very next question.
     */
    finish(next)
  }

  if (done) return <Result answers={answers} note={theirWords(answers)} />

  // ── The note ────────────────────────────────────────────────────────────

  if (step === -1) {
    // ⭐⭐ INDEXABLE AS OF 26 SEP. It was noindex while the name was unsettled —
    // correct then, because indexing a product about to be renamed spends
    // authority on a URL you are going to abandon. The name is settled and the
    // domain is its own, so the reason is gone.
    // ⚠️ Listed in sitemap-unstuckmap.xml in the SAME commit. A page in a
    // sitemap that says noindex is a contradiction, and doing one without the
    // other is how the answer pages were orphaned.
    return (
      <WayoutShell wide noindex={false} canonicalPath="/wayout/start" signIn>
        {/* 🔴 ONE COLUMN. Daniel: "i don't like how this is laid out, looks messy
            — not sure if centering the text is better or what?"

            The mess was the two-column split, not the alignment: the right block
            floated with no relationship to the headline beside it, and the four
            paths underneath run the full width left-aligned, so the eye crossed
            the page twice before reaching them.

            ⚠️ AND CENTRING WOULD HAVE FOUGHT THE REST. The stronger reason to go
            left in one column is that the six QUESTION screens are now exactly
            this shape — kicker, big type, one measure — so the opening and the
            first question are the same object, and pressing the button changes
            the words rather than the layout. */}
        <div className="wayout__open">
          <h1><Marked text={DIAGNOSTIC_OPENING.headline} highlight={DIAGNOSTIC_OPENING.highlight} /></h1>
          <p className="wayout__lead">{DIAGNOSTIC_OPENING.lead}</p>
          <p className="wayout__body">{DIAGNOSTIC_OPENING.body}</p>
          <button className="wayout__btn" onClick={() => setStep(0)}>{DIAGNOSTIC_OPENING.cta}</button>
          <p className="wayout__fine">{DIAGNOSTIC_OPENING.fine}</p>
        </div>

        {/* ⭐⭐ THE FOUR PATHS, ON SCREEN, BEFORE A SINGLE TAP. The bottom two
            thirds of this page were empty, and the four routes this thing
            actually chooses between — the substance of the entire product —
            were invisible until you had answered six questions.

            🔴 SHOWING THEM IS THE OPPOSITE OF A SPOILER. Nobody is stuck for
            want of hearing "side income" as a phrase; they are stuck because
            all four sound plausible at 11pm and there is no way to tell which
            one is theirs. Naming them makes the promise concrete and makes the
            question personal at the same time: which one am I?

            ⚠️ Verbatim from PATHS, never a second set of words about them. The
            result screen shows these same names, and a marketing paraphrase
            here would quietly become a fifth path nobody built. */}
        <div className="wayout__paths">
          {/* ⚠️ The heading does the PERSONAL work; the headline above already
              said "four ways out", so repeating it here spent a line saying
              nothing. This asks the question the cards are there to provoke. */}
          <h2 className="wayout__label">Which one is yours?</h2>
          <div className="wayout__pathgrid">
            {Object.entries(PATHS).map(([key, path]) => (
              <div className="wayout__path" key={key}>
                <h3>{path.name}</h3>
                <p>{path.lead}</p>
              </div>
            ))}
          </div>
          <p className="wayout__fine wayout__pathnote">
            Three minutes. Then you’ll know which one — and the questions after that build the plan.
          </p>
        </div>
      </WayoutShell>
    )
  }

  // ⭐⭐ THE OTHER BOX. Chips are OUR labels. This is the only place in the
  // diagnostic where somebody uses their own words — and that matters beyond
  // tone: the invention guards downstream treat a person's own free text as a
  // fact they gave us, and have never counted a chip, deliberately. So this is
  // the one control here that can put something into a plan.
  //
  // ⚠️ STORED ON A PARALLEL KEY, never mixed into the answer choosePath reads.
  // Writing "~a boat" into `money` would quietly fail every `a.money === ...`
  // check and route somebody down the wrong path in silence.
  const otherKey = `${q.key}Other`
  const otherText = answers[otherKey] ?? ''
  const chipsPicked = q.multi
    ? (answers[q.key] ?? []).length > 0
    : Boolean(answers[q.key])
  const answered = chipsPicked || otherText.trim().length > 0

  function commitOther(text) {
    const v = text.trim().slice(0, OTHER_MAX)
    const next = { ...answers, [otherKey]: v }
    if (!v) delete next[otherKey]
    setAnswers(next)
    setOtherOpen(false)
    // ⚠️ A single-answer question still advances on its own, but only once
    // something is actually there — otherwise opening the box and changing your
    // mind would skip the question.
    if (!q.multi && v && step < DIAGNOSTIC_QUESTIONS.length - 1) setStep(step + 1)
  }

  return (
    <WayoutShell noindex wide>
      {/* ⚠️ `wide` on an intake screen reverses an earlier call in WayoutShell
          ("the narrow column is the point"). The reason behind that was not
          wanting two questions side by side, and this does not do that — it is
          one question, given room. Daniel, seeing the 570px card in a 1400px
          window: "this is too small by a bit." */}
      <div className="wayout__ask2">

        {/* ⭐ The bar is the spine. It is the one element that says "you are
            moving" on every screen, and it animates on every change — which is
            what "2 of 6" in a corner never did. */}
        <div className="wayout__prog">
          <b style={{ width: `${(step / DIAGNOSTIC_QUESTIONS.length) * 100}%` }} />
        </div>

        <div className="wayout__askstage" key={step}>
          {q.kicker && <p className="wayout__kicker wayout__rise">{q.kicker}</p>}
          <h1 className="wayout__bigq wayout__rise wayout__r1">{q.question}</h1>

          <div className="wayout__chips">
            {q.options.map((opt, i) => {
              const on = q.multi
                ? (answers[q.key] ?? []).includes(opt.key)
                : answers[q.key] === opt.key
              return (
                <button
                  type="button"
                  key={opt.key}
                  className={`wayout__chip wayout__rise wayout__r${Math.min(i + 2, 7)}${on ? ' wayout__chip--on' : ''}`}
                  aria-pressed={on}
                  onClick={() => pick(opt.key)}
                >
                  {opt.label}
                </button>
              )
            })}

            {otherOpen ? (
              <span className="wayout__otherwrap">
                <input
                  className="wayout__otherin"
                  autoFocus
                  maxLength={OTHER_MAX}
                  defaultValue={otherText}
                  placeholder="in your words"
                  aria-label="Something else, in your own words"
                  onChange={e => setOtherLen(e.target.value.length)}
                  onBlur={e => commitOther(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitOther(e.currentTarget.value) }
                    if (e.key === 'Escape') { setOtherOpen(false) }
                  }}
                />
                <span className={`wayout__count2${OTHER_MAX - otherLen <= 8 ? ' is-near' : ''}`}>
                  {OTHER_MAX - otherLen}
                </span>
              </span>
            ) : (
              <button
                type="button"
                className={`wayout__chip wayout__rise wayout__r7${otherText ? ' wayout__chip--on' : ''}`}
                onClick={() => { setOtherLen(otherText.length); setOtherOpen(true) }}
              >
                {otherText || 'Other…'}
              </button>
            )}
          </div>

          {q.hint && <p className="wayout__hint wayout__rise wayout__r7">{q.hint}</p>}

          {q.multi && (
            <button
              className="wayout__btn wayout__rise wayout__r7"
              disabled={!answered}
              onClick={() => setStep(step + 1)}
            >
              Next
            </button>
          )}
        </div>

        {/* ⭐⭐ WHAT IT KNOWS SO FAR. This is the half that turns six screens into
            one thing being built about you rather than six forms in a row. */}
        <div className="wayout__sofar">
          <em>So far</em>
          {said.length
            ? said.map((t, i) => <span className="wayout__tok" key={`${t}-${i}`}>{t}</span>)
            : <span className="wayout__soempty">nothing yet — six taps and it has enough</span>}
        </div>

        {/* ⚠️ NEUTRAL THE WHOLE WAY THROUGH, and the label says so. The rules are
            a ladder — first check that fires wins — so nothing is genuinely ruled
            out until the last answer lands. Dimming one early and bringing it
            back would be the page lying, which is the one thing it cannot do. */}
        <div className="wayout__rail">
          <p className="wayout__raill">Still on the table</p>
          <div className="wayout__rails">
            {Object.entries(PATHS).map(([k, p]) => (
              <div className="wayout__p" key={k}>
                <b>{p.name}</b>
                <s>{p.lead}</s>
              </div>
            ))}
          </div>
        </div>

        <div className="wayout__nav">
          <button className="wayout__back" onClick={() => setStep(step - 1)} aria-label="Back">←</button>
        </div>
      </div>
    </WayoutShell>
  )
}

function Result({ answers, note }) {
  const key  = choosePath(answers)
  const path = PATHS[key]
  const others = whyNot(key, answers)

  return (
    <WayoutShell title="The path that fits you" wide>
      <div className="wayout__ask2">
        <div className="wayout__prog"><b style={{ width: '100%' }} /></div>

        {/* ⚠️ PLAIN, AND IT NAMES THE PATH. An earlier version read "Three of
            these were never yours. This one is." Daniel: "this isn't the type of
            talk i like, we talked about" — and he is right twice, because the
            least clever headline is also the most useful one. The answer to six
            questions is a NAME, so the headline should be that name. */}
        <p className="wayout__kicker wayout__rise">Based on your six answers</p>
        <h1 className="wayout__bigq wayout__rise wayout__r1">
          <mark>{path.name}</mark> is the one that fits.
        </h1>
        <p className="wayout__lead wayout__rise wayout__r2">{path.lead}</p>
        <p className="wayout__body wayout__rise wayout__r3">{path.body}</p>

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
      {/* ⭐⭐ THE REVEAL THE RAIL HAS BEEN SETTING UP. The same four cards that sat
          under every question, three now crossed off with the actual reason.
          Showing them for the first time HERE would make this a result screen;
          having watched them for six questions makes it a conclusion. */}
      <div className="wayout__rail" style={{ marginTop: 26 }}>
        <div className="wayout__rails">
          {Object.entries(PATHS).map(([k, p], i) => {
            const out = k !== key
            const why = others.find(o => o.name === p.name)?.why
            return (
              <div className={`wayout__p wayout__rise wayout__r${Math.min(i + 3, 7)} ${out ? 'is-out' : 'is-win'}`} key={k}>
                <b>{p.name}</b>
                <s>{out ? why : p.lead}</s>
                {!out && <span className="wayout__ptag">Yours</span>}
              </div>
            )
          })}
        </div>
      </div>

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
        {/* ⚠️ The map is free. This button never carries a price in either state. */}
        Keep going
      </Link>
      {/* 🔴 NO "VERSION" FRAMING. This used to read "This was the three-minute
          version", which announced an ENDING and then asked for a fresh start.
          Daniel: "all the questions should keep going." Nothing here is a
          different product — it is the same set of questions carrying on, and
          what has already been answered is not asked again. */}
      <p className="wayout__hint">
        The direction is the easy half. What it still needs is what you own, what
        you’d refuse to do and what you’ve already tried — then the moves go in
        order. Nothing you just answered gets asked twice.
      </p>
      </div>
    </WayoutShell>
  )
}
