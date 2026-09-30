import { useState } from 'react'
import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { supabase } from '../../lib/supabase'
import { loadDraft, saveDraft } from '../../lib/wayout/draft'
import { DIAGNOSTIC_OPENING, DIAGNOSTIC_QUESTIONS, PATHS, choosePath, whyNot } from '../../content/wayoutDiagnostic'
import { WAYOUT_HOME, WAYOUT_INTAKE, timeLine } from '../../lib/wayout/brand'
import { tidyQuote } from '../../lib/wayout/tidyQuote'
import { WAYOUT_PAYMENTS_LIVE } from '../../lib/wayout/pricing'
import { Marked } from '../../lib/wayout/marked.jsx'

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

export default function Diagnostic() {
  /**
   * 🔴🔴 THERE IS NO OPENING SCREEN ANY MORE, AND THAT IS THE FIX.
   *
   * Step -1 used to be a page of its own: a 54px headline, a lead, a body
   * paragraph, a button, fine print, then the four paths. Daniel, looking at it:
   * "this whole page is a block to action."
   *
   * ⭐⭐ HE ARRIVED HAVING ALREADY SAID YES. Every route into /start comes from a
   * button that reads "Show me which way" — off the landing page, off a situation
   * page, off the closing CTA. The opening screen answered "what is this?" to
   * somebody who had just clicked the answer. A second sales page behind a
   * call to action is a door that opens onto another door.
   *
   * ⭐ NOTHING WAS LOST BY DELETING IT. The four paths were the substance, and
   * they already sit under every question in the "Still on the table" rail —
   * where they do more work, because they are visibly waiting to be crossed off.
   * The one sentence worth keeping rides above the first question as a deck.
   *
   * ⚠️ So step 0 is now the first thing anyone sees, and the first thing on it is
   * a question with tappable answers. See the shell props below: step 0 is also
   * the INDEXABLE page, so it carries the canonical and the sign-in link the
   * opening screen used to.
   */
  const [step, setStep]       = useState(0)
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

  /**
   * ⭐⭐ STEP 0 IS NOW THE PUBLIC PAGE. It carries what the deleted opening screen
   * carried: the canonical, the sign-in link, and indexability.
   *
   * ⭐⭐ INDEXABLE AS OF 26 SEP. It was noindex while the name was unsettled —
   * correct then, because indexing a product about to be renamed spends
   * authority on a URL you are going to abandon. The name is settled and the
   * domain is its own, so the reason is gone.
   * ⚠️ Listed in sitemap-unstuckmap.xml. A page in a sitemap that says noindex is
   * a contradiction, and doing one without the other is how the answer pages were
   * orphaned.
   * ⚠️ The LATER steps stay noindex — they are the same URL mid-flow, and a
   * crawler must only ever be told about the state it can actually arrive in.
   */
  const first = step === 0

  return (
    <WayoutShell
      wide
      noindex={!first}
      canonicalPath={first ? '/wayout/start' : ''}
      signIn={first}
      home={first}
    >
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
          {/* ⭐⭐ THE ONE SENTENCE THE OPENING SCREEN EXISTED TO SAY, now a deck
              above the first question instead of a page in front of it. It is the
              product's best line — four ways out, one of them yours — and it is
              the only thing on this screen a person reads before they can tap.
              ⚠️ Step 0 only. On the other five it would be a slogan repeating
              itself at somebody already answering. */}
          {first && (
            <p className="wayout__deck wayout__rise">
              <Marked text={DIAGNOSTIC_OPENING.headline} highlight={DIAGNOSTIC_OPENING.highlight} />
            </p>
          )}
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

          {/* ⭐ WHAT IT COSTS AND HOW LONG IT TAKES, on the screen where somebody
              decides whether to start — which is now the first question rather
              than a page in front of it.
              ⚠️ The duration comes from brand.js. It was written as a literal in
              the opening screen's body copy, which is precisely the drift that
              cost three passes to clear. */}
          {first && (
            <p className="wayout__fine wayout__rise wayout__r7" style={{ textAlign: 'left', marginTop: 18 }}>
              {DIAGNOSTIC_OPENING.fine} {timeLine()}
            </p>
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

        {/* ⚠️ ON STEP 0 THERE IS NOWHERE BACK INSIDE THIS PAGE any more, so the
            arrow leaves it. Left as a button that steps to -1 it would render a
            screen that no longer exists. */}
        <div className="wayout__nav">
          {first
            ? <Link className="wayout__back" to={WAYOUT_HOME} aria-label="Back">←</Link>
            : <button className="wayout__back" onClick={() => setStep(step - 1)} aria-label="Back">←</button>}
        </div>
      </div>
    </WayoutShell>
  )
}

function Result({ answers, note }) {
  const key  = choosePath(answers)
  const path = PATHS[key]
  const others = whyNot(key, answers)

  /**
   * 🔴🔴 THIS USED TO BE A DEAD END, AND THE BUTTON WAS AT THE BOTTOM OF IT.
   *
   * Daniel, on the live screen: "this is what i see — there is no continuation
   * button in the screen, and i thought we were getting rid of this as a section
   * and just continuing with questions. this section from the info told is not
   * enough to give any clear direction or assessment."
   *
   * Three complaints, and they are one complaint. The screen was built as a
   * DESTINATION — a headline, a lead, a body, their own words quoted back, four
   * cards, a four-item list of what is still unknown, and only then, about two
   * scrolls down, the way forward. It read as an ending because it was shaped
   * like one, and then it had to justify being an ending on six taps of data,
   * which it cannot.
   *
   * ⭐⭐ IT IS A BEAT, NOT A CONCLUSION, AND THE ORDER SAYS SO. The verdict, one
   * line of why, and the way on — inside the first screenful. Everything that
   * used to sit above the button now sits below it, where it is available to
   * anybody who wants it and in nobody's way.
   *
   * ⭐⭐ AND THE BUSINESS MODEL IS WHY THIS WAS EVER WRONG. The verdict screen was
   * designed when the MAP WAS PAID and six free taps had to prove enough value to
   * open a wallet — so it was staged like a reveal. The map has been free since
   * 21 Sep. Nothing is being sold here any more, so there is nothing to stage:
   * these six answers are the first six of one continuous set of questions, and
   * the screen's whole job is to show that they landed and carry on.
   *
   * ⚠️ WHAT IS NOT CUT: the three crossed-off paths with the actual reason each
   * one does not fit. That is the substance — a result screen that only praises
   * the chosen path reads as a horoscope — and it is the honest answer to "not
   * enough to give any clear direction". It is moved, not removed.
   */
  return (
    <WayoutShell title="The path that fits you" wide>
      <div className="wayout__ask2 wayout__verdict">
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
        {/* ⭐⭐ THE REASONING, AND IT STAYS ABOVE THE BUTTON. This is the only
            thing on the screen that ANSWERS the verdict rather than announcing
            it — "adding income costs hours you said you don't have; subtracting
            costs none and starts this week". Daniel's "not enough to give any
            clear direction" is answered here or nowhere, so it is not something
            to move below the fold for the sake of a shorter first screen. The
            type scale gave the room instead — see .wayout__verdict. */}
        <p className="wayout__body wayout__rise wayout__r2">{path.body}</p>

        {/* ⭐⭐ THE WAY ON, ABOVE THE FOLD AND DIRECTLY UNDER THE VERDICT.
            🔴 AND THE LINK ITSELF WAS BROKEN ON THE PRODUCT'S OWN DOMAIN. It
            read the base path plus "?start=1", and the base is the empty string on
            getunstuckmap.com — so React Router resolved "?start=1" against the
            page it was already on and the button led back to itself. See
            WAYOUT_INTAKE in brand.js.
            ⚠️ The map is free. This button never carries a price in either
            state, and the label says the questions CONTINUE — it is not a
            different product starting, it is the same set going on. */}
        <Link
          to={`${WAYOUT_INTAKE}?start=1`}
          className="wayout__btn wayout__rise wayout__r3"
          style={{ textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}
        >
          Keep going — next question
        </Link>
        {/* 🔴 "Nothing you just answered gets asked twice." — Daniel: "pointless
            to say." He is right: it reassures against a fear nobody has yet, and
            a product that says it will not waste your time is spending your time
            saying so. If it is true, the next screen proves it. */}

        {/* ⭐ Their own sentence, back on the screen. It is the only thing here
            they wrote rather than tapped, and showing it is the cheapest proof
            available that something was actually read. */}
        {note?.trim() && (
          <div className="wayout__seen" style={{ marginTop: 26 }}>
            <q>{tidyQuote(note)}</q>
            <b>The questions ahead plan around this. It’s the part six taps can’t hold.</b>
          </div>
        )}

        {/* ⭐ Naming what does NOT fit, and why, is the part that earns the next
            click. A result screen that only praises the chosen path reads as a
            horoscope — and "crossed off, on purpose" is the same move the plan
            makes, so this is an honest sample of the product rather than an
            advert for it. */}
        {/* ⭐⭐ THE REVEAL THE RAIL HAS BEEN SETTING UP. The same four cards that
            sat under every question, three now crossed off with the actual
            reason. Showing them for the first time HERE would make this a result
            screen; having watched them for six questions makes it a conclusion. */}
        <div className="wayout__rail" style={{ marginTop: 26 }}>
          <p className="wayout__raill">Why not the other three</p>
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
            naming them is what makes the next fifteen minutes feel worth it.
            ⚠️ BELOW THE BUTTON ON PURPOSE. Above it, a list of what the thing
            does not know reads as an apology for the verdict it just gave. */}
        <h3 className="wayout__label">What the questions ahead settle</h3>
        <ul className="wayout__list">
          <li>How you’d actually <b>want</b> to get there — and what you’d refuse to do.</li>
          <li>What “enough” is for you, as a number or as a week.</li>
          <li>What you’ve already tried, and why it stopped.</li>
          <li>Who else this has to work for.</li>
        </ul>
      </div>
    </WayoutShell>
  )
}
