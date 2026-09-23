import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { supabase } from '../../lib/supabase'
import {
  loadOrCreateSession, generateMap, countRebuild, insistOn, wantPlaybook, loadProgress,
  markMoveDone, saveMoveNote, saveWorth, WAYOUT_MAX_REBUILDS, enforceMapContract, mapProblems,
} from '../../lib/wayout/session'
import { WAYOUT_MAP_LABEL, WAYOUT_BASE } from '../../lib/wayout/brand'
import { WAYOUT_PRICE_FULL, WAYOUT_PAYMENTS_LIVE, guaranteeLine, priceShort } from '../../lib/wayout/pricing'
import { tick, buzz } from '../../lib/wayout/feedback'
import { bookOnShelf } from '../../content/wayoutReading'

/**
 * The way out — S7, the reveal.
 *
 * Three states, in order of what the person has done:
 *   intake not finished  → back to the questions
 *   finished, not paid   → the one thing we ask for
 *   paid                 → the map
 */

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function Plan() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [session, setSession]   = useState(null)
  const [map, setMap]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [building, setBuilding] = useState(false)
  // Which go this is. 1 is the first; anything higher means the first one had
  // something in it that was not theirs and is being written again.
  const [pass, setPass] = useState(1)
  const [progress, setProgress] = useState(null)
  // 🔴 NOTHING STOPPED TWO GENERATIONS RUNNING AT ONCE, AND IN DEV TWO ALWAYS
  // DID. StrictMode mounts every effect twice; both calls reached the model,
  // both took ~25 seconds, and both wrote a map — so every plan Daniel built
  // today cost two Sonnet calls and the page waited for the slower one. Any
  // re-run of the effect (a param change, a navigation) does the same thing in
  // production, where it is not a dev artefact but a race: two maps written to
  // one row, and whichever lands last wins for no reason anybody chose.
  //
  // ⚠️ A ref, not state — state would not have settled before the second call
  // went out, which is precisely the window this has to close.
  const buildingRef = useRef(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    let cancelled = false
    loadOrCreateSession()
      .then(s => {
        if (cancelled) return
        setSession(s)
        if (s.status === 'draft') { navigate(WAYOUT_BASE, { replace: true }); return }
        // 🔴 A STORED MAP WAS NEVER RE-CHECKED. Daniel was still looking at
        // "$120k" the day after the figures guard shipped, because the map in
        // the database was written before it existed and this line handed it
        // straight to the screen. A contract that only runs at generation time
        // protects the next person and nobody who already has a plan.
        // ⚠️ They just came back through the questions. The stored map was
        // written about the answers they had BEFORE, so it is stale by
        // definition — passing the contract does not make it theirs any more.
        //
        // 🔴🔴 `?rebuild=1` IS AN INSTRUCTION, NOT A STATE, AND IT WAS NEITHER
        // CONSUMED NOR CAPPED. It sat in the address bar, so every reload of
        // that URL regenerated the entire plan — and with retries that is two
        // or three model calls a time. 82 map generations in one day, $4.53,
        // almost all of it a tab being refreshed. It also walked straight past
        // the one-rebuild limit: `countRebuild` incremented and nothing on this
        // path ever read it back.
        //
        // ⭐ Stripped from the URL the moment it is acted on, so a reload,
        // a bookmark or a back button cannot spend money again. And the cap is
        // checked HERE, where the spending happens, not only on the links that
        // offer it — a limit enforced in the UI is a suggestion.
        if (s.map && params.get('rebuild')) {
          navigate(`${WAYOUT_BASE}/plan`, { replace: true })
          if (!import.meta.env.DEV && (s.rebuilds ?? 0) >= WAYOUT_MAX_REBUILDS) {
            setMap(enforceMapContract(s.map, s.answers))
            return
          }
          countRebuild(s.id, s.rebuilds).then(n => setSession(c => ({ ...c, rebuilds: n })))
          build(s)
          return
        }
        loadProgress(s.id).then(p => { if (!cancelled) setProgress(p) }).catch(() => {})
        if (s.map) {
          const clean = enforceMapContract(s.map, s.answers)
          const problems = mapProblems(clean, s.answers)
          if (problems.length) {
            console.warn('[wayout] stored map fails the contract, rewriting:', problems)
            build(s)
          } else {
            setMap(clean)
          }
        }
        // ⭐ Straight in. They asked for it by finishing the questions.
        else build(s)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [navigate, params])

  /**
   * Generate and store the map.
   *
   * ⚠️ Only ever called for a session the database already says is `paid`.
   * Migration 046 refuses a client-written `map` column, so this write goes
   * through the same guard — which means a map generated for an unpaid session
   * cannot be saved even if this code were wrong. That is deliberate: the
   * paywall is a database constraint, not a branch in a component.
   */
  async function build(s) {
    if (buildingRef.current) return
    buildingRef.current = true
    setBuilding(true)
    setPass(1)
    setError('')
    try {
      // ⭐ generateMap now validates and rewrites once itself — a map that
      // comes back from it has passed mapProblems, including the check that
      // every figure in it is one this person actually gave us. It throws
      // rather than returning a plan with somebody else's numbers in it.
      // ⚠️ `insisted` lives on the SESSION, not in answers, and generateMap
      // takes answers — so without this the person's choice was recorded in
      // the database, echoed back in the UI, and never once shown to the model
      // that writes the plan. The feature would have looked like it worked.
      const generated = await generateMap(
        { ...s.answers, insisted: s.insisted ?? [] }, setPass, s.move_notes,
      )
      const { error: wErr } = await supabase
        .from('wayout_sessions')
        .update({ map: generated })
        .eq('id', s.id)
      if (wErr) throw new Error(wErr.message)
      setMap(generated)
    } catch (err) {
      setError(err.message)
    } finally {
      buildingRef.current = false
      setBuilding(false)
    }
  }

  /**
   * ⭐⭐ THE ONE THING A PLAN MUST LET YOU DO: ASK FOR IT AGAIN.
   *
   * 🔴 There was no way to. Daniel changed the prompt, reloaded, and saw the
   * same plan — because a stored map that passes the contract is handed
   * straight to the screen, and nothing in the product could ask for another
   * one. That is not a testing inconvenience: a plan is written about a life
   * that moves. Someone whose partner changed their mind, whose job went, or
   * who reads the assumptions and finds one wrong, is currently stuck with a
   * plan built for a person they are no longer.
   */
  /**
   * ⭐⭐ A PLAN CHANGES WHEN THE LIFE CHANGES. NOT ON A BUTTON.
   *
   * 🔴 The first version of this re-rolled the model on the SAME answers, and
   * Daniel spotted the commercial half — "might be a way of someone taking
   * advantage for free". The deeper problem is trust: identical answers
   * producing a different plan says neither plan meant very much, and the whole
   * product rests on the order being right rather than merely plausible.
   *
   * ⭐ Routing it through the questions fixes both at once. Someone whose
   * partner changed their mind, or who read the assumptions and found one
   * wrong, edits the thing that is actually wrong and gets a plan that answers
   * it. Someone farming free plans has to re-answer thirty questions to get a
   * different one — which is not a loophole, it is the product.
   */
  function rebuild() {
    navigate(`${WAYOUT_BASE}?edit=1`)
  }

  /**
   * ⭐ DEV ONLY: regenerate this session's map from the answers already stored,
   * without walking the questions again.
   *
   * ⚠️ It exists because testing a PROMPT and changing a LIFE are different
   * jobs and the product only supports the second. For a person, going back
   * through their answers is the point — a plan should change when something
   * about them changed, not on a button. For whoever is writing the prompt,
   * thirty questions between every edit and its result is how you stop
   * checking, and not checking is how the seen card shipped with no
   * checkboxes and the map shipped inventing numbers.
   *
   * 🔴 Never reachable in production, and the check that proves it is a grep
   * of the built chunk rather than an argument. See the note on the JSX — the
   * first version of this left the markup in the bundle because the guard was
   * on the prop instead of inside the branch.
   */
  function regenerateNow() {
    if (session) { setMap(null); build(session) }
  }

  /**
   * Into the play-by-play for move one.
   *
   * ⚠️ Still records that they wanted it. The waiting-list column was the only
   * measure of whether the gap is felt strongly enough to click, and that is
   * the number that decides whether this is the right business — it is worth
   * more now that clicking leads somewhere than it was when it led to a list.
   */
  /**
   * ⭐ They read why we crossed something off, and want it anyway.
   *
   * ⚠️ Rebuilt immediately, and NOT counted against the rebuild cap — the cap
   * stops somebody fishing for a different answer to the same question, and
   * this is a different question. They changed the input.
   */
  /**
   * ⭐⭐ Their note against one move. Saved either way; only `redo` rebuilds.
   *
   * ⚠️ The note is saved BEFORE the rebuild, not after, because `build()` sends
   * the session's notes to the model — saving afterwards would rebuild without
   * the very thing they asked for and look like it had been ignored.
   */
  async function noteOnMove(order, text, redo) {
    if (!session || building) return
    try {
      const next = await saveMoveNote(session.id, order, text, session.move_notes)
      const updated = { ...session, move_notes: next }
      setSession(updated)
      if (redo) { setMap(null); await build(updated) }
    } catch (err) { setError(err.message) }
  }

  /** ⚠️ Fire and forget by design — a failed survey must never block the plan. */
  async function saveWorthNow(payload) {
    if (!session) return
    try { await saveWorth(session.id, session.user_id, payload) } catch { /* not their problem */ }
  }

  async function insist(label) {
    if (!session || building) return
    try {
      const next = await insistOn(session.id, label, session.insisted)
      const updated = { ...session, insisted: next }
      setSession(updated)
      setMap(null)
      await build(updated)
    } catch (err) { setError(err.message) }
  }

  async function openPlaybook(order = 1) {
    // ⚠️ Coerced as well as defaulted. The default above is right and was still
    // not enough — see the note on the button. Anything that is not a real move
    // number means move one, because that is what a person clicking a button
    // that says "show me how" is asking for.
    const n = Number(order)
    const move = Number.isInteger(n) && n >= 1 && n <= 3 ? n : 1
    if (session) wantPlaybook(session.id).catch(() => {})
    navigate(`${WAYOUT_BASE}/play/${move}`)
  }

  /**
   * ⚠️ Optimistic, and it has to be. A tick that waits on a round trip before
   * it moves feels broken, and this one also unlocks the next move — so the
   * door has to appear in the same gesture that opened it.
   */
  async function setMoveDone(order, isDone) {
    setProgress(p => {
      const next = new Set(p?.done ?? [])
      if (isDone) next.add(order); else next.delete(order)
      return { ...(p ?? { started: new Set() }), done: next }
    })
    try { await markMoveDone(session.id, order, isDone) } catch (err) { setError(err.message) }
  }

  if (loading) return <WayoutShell><p className="wayout__lead">One moment.</p></WayoutShell>

  if (error && !map) {
    return (
      <WayoutShell title="Your plan">
        <p className="wayout__q">That didn’t come through.</p>
        <p className="wayout__lead">{error}</p>
        <button className="wayout__btn" onClick={() => build(session)} disabled={building}>
          {building ? 'Building…' : 'Try again'}
        </button>
      </WayoutShell>
    )
  }

  // ── Finished the questions, no map yet ────────────────────────────────────
  // ⭐ NO PAYWALL HERE ANY MORE. The assessment is free: finish the questions
  // and it is written. The money is for the play-by-play, after they have read
  // it and know whether it was any good.
  if (!map) {
    // 🔴 THERE WAS A "BUILD IT" BUTTON HERE AND IT ASKED NOTHING. Daniel: "it's
    // like an extra button for no reason." He had just answered thirty-odd
    // questions and pressed See the plan; a second confirmation adds a decision
    // where there is no decision to make, and the only thing it communicates is
    // that the product is not sure he meant it.
    // ⭐⭐ SAY WHICH GO THIS IS. 🔴 Daniel sat on "About twenty seconds" watching
    // three dots, with no way to tell working from broken — and he was probably
    // right both times: three attempts genuinely IS three minutes, and the
    // screen promised twenty seconds and then went silent about it.
    //
    // ⚠️ The second screen tells the truth about WHY, which is the better thing
    // to say anyway: the first one had something in it that was not his. That
    // is the guard doing its job, and a person who is told that is being
    // reassured rather than kept waiting.
    return (
      <WayoutShell title="Your plan">
        {pass === 1 ? (
          <>
            <p className="wayout__q">Reading it back.</p>
            <p className="wayout__lead">
              Going through everything you wrote — what can’t move, the numbers,
              what you said you’d never do — and working out which of it comes
              first.
            </p>
            {/* ⚠️ "Twenty seconds" was a guess and it was wrong. Measured on
                the real page the same generation took 27s, 28s and over 60s —
                a 28k-character prompt writing a 3,000-token answer is not a
                fast request. Promising twenty and taking sixty is how a working
                page comes to look broken, and the fix is the honest number. */}
            <p className="wayout__lead">Up to a minute. Nothing to pay.</p>
          </>
        ) : (
          <>
            <p className="wayout__q">Writing it again.</p>
            <p className="wayout__lead">
              The first version had a number in it you never gave us. It isn’t
              allowed to guess about your life, so it’s going back over it.
            </p>
            <p className="wayout__lead">
              Another minute at most{pass > 2 ? ' — last go' : ''}.
            </p>
          </>
        )}
        <div className="wayout__working" aria-hidden="true"><i /><i /><i /></div>
      </WayoutShell>
    )
  }

  if (!map) return null
  // ⭐ When the allowance is gone the doors close, and what is behind them is
  // not a wall — it is the only honest thing left to say. See `Spent`.
  // ⚠️ THE CAP IS OFF IN DEV, AND IT HAS TO BE. One rebuild is right for a
  // person — it stops them fishing for a plan they like, which is the behaviour
  // this product exists to end. It is wrong for the person BUILDING it: Daniel
  // changed the prompt six times today and could not see a single change,
  // because his one rebuild was spent and the page correctly kept handing back
  // the map he already had. A limit that blocks the author from ever seeing
  // their own work is a limit that stops the work.
  //
  // ⭐ Safe now in a way it was not this morning: `?rebuild=1` is stripped the
  // moment it is used, so this opens the deliberate links and nothing else. It
  // cannot become the refresh loop that spent 82 generations in a day.
  const spent = !import.meta.env.DEV && (session?.rebuilds ?? 0) >= WAYOUT_MAX_REBUILDS
  return (
    <Map
      map={map}
      onRebuild={spent ? null : rebuild}
      onOpenPlaybook={openPlaybook}
      onRegenerate={import.meta.env.DEV ? regenerateNow : null}
      onMove={setMoveDone}
      onInsist={insist}
      onNote={noteOnMove}
      onWorth={saveWorthNow}
      moveNotes={session?.move_notes ?? {}}
      progress={progress}
      rebuilding={building}
      spent={spent}
    />
  )
}

// ── Paywall ─────────────────────────────────────────────────────────────────

/**
 * ⚠️ THIS SCREEN TELLS THE TRUTH ABOUT ITS OWN STATE.
 * While `WAYOUT_PAYMENTS_LIVE` is false there is no Stripe price behind the
 * figure, so the button does not pretend. A pay button that silently fails is
 * the worst version of this screen — the person has just spent fifteen minutes
 * answering questions about their marriage and their money.
 */
function Paywall() {
  return (
    <WayoutShell title="Your plan">
      <h2>That’s everything.</h2>
      <p className="wayout__lead">
        Your answers are saved. The plan reads them back and turns them into
        three moves in the order they actually work, with what got crossed off
        and why.
      </p>

      {/* ⭐⭐ NO PAYMENT HERE, EVER. The map is free under the settled model, so
          this screen has no checkout on it in either state. It used to read
          "Price when it opens: $39, once. Not a subscription." — which was the
          old one-time model and is now wrong twice over. */}
      <p className="wayout__hint">
        {priceShort()} {WAYOUT_PAYMENTS_LIVE
          ? `The step-by-step for doing the moves is ${WAYOUT_PRICE_FULL}, and only if you want it.`
          : 'Nothing is being charged for anything yet.'}
      </p>
    </WayoutShell>
  )
}

/**
 * ⭐⭐ THE TIP BUTTON, DONE PROPERLY — it asks instead of collecting.
 *
 * 🔴 A tip jar here would have competed with the subscription ask at the single
 * highest-intent moment in the product, and let somebody discharge the
 * gratitude for $5 instead of subscribing. It also reads as hobby project right
 * before a recurring-payment ask, and at a 1-3% response rate it would teach us
 * nothing. What Daniel wanted from it was proof the map is worth something —
 * so we ask that, and we ask for the review, which is worth more today than the
 * money. His words: "REVIEW IS MORE IMPORTANT and easier to get the ball
 * rolling."
 *
 * ⚠️ The money question is SKIPPABLE. Forcing a number would cost us the
 * review, and the review is the more valuable half.
 */
function WorthAsk({ onSave }) {
  const [sent, setSent] = useState(false)
  const [cents, setCents] = useState(null)
  const [note, setNote] = useState('')
  const [canQuote, setCanQuote] = useState(false)

  if (sent) {
    return (
      <div className="wayout__worth wayout__worth--done">
        <b>Thank you — that genuinely helps.</b>
        <p>It is read by a person, and it changes what gets built next.</p>
      </div>
    )
  }

  const OPTIONS = [0, 900, 1900, 2900, 4900]
  return (
    <div className="wayout__worth">
      <b>One question, while it is in front of you</b>
      <p>This was free and stays free. If it had not been — what would it have been worth?</p>
      <div className="wayout__worthrow">
        {OPTIONS.map(c => (
          <button
            key={c}
            type="button"
            className={`wayout__worthbtn${cents === c ? ' wayout__worthbtn--on' : ''}`}
            onClick={() => setCents(cents === c ? null : c)}
          >
            {c === 0 ? 'Nothing' : `$${c / 100}`}
          </button>
        ))}
      </div>
      <textarea
        className="wayout__worthnote"
        value={note}
        maxLength={1000}
        onChange={e => setNote(e.target.value)}
        placeholder="And anything you would tell someone else about it — good or bad."
      />
      <label className="wayout__worthquote">
        <input type="checkbox" checked={canQuote} onChange={e => setCanQuote(e.target.checked)} />
        <span>You can quote me on that. First name only.</span>
      </label>
      <button
        type="button"
        className="wayout__btn"
        onClick={async () => { await onSave({ cents, note, canQuote }); setSent(true) }}
        disabled={cents === null && !note.trim()}
      >
        Send it
      </button>
    </div>
  )
}

/* 🔴 CHECKOUT USED TO LIVE HERE AND IT NO LONGER BELONGS ON THIS PAGE. The map
   is free, so nothing on the way IN is ever paid for. When the subscription is
   wired it goes on the play-by-play, which is the thing being sold — and it
   needs a live Stripe RECURRING price plus a `wayout` branch in stripe-webhook
   setting status='paid', the only thing migration 046 accepts as proof of
   payment. See lib/wayout/pricing.js. */

// ── The map ─────────────────────────────────────────────────────────────────

/**
 * ⚠️ `onRebuild` IS OPTIONAL AND THE CONTROLS ARE GATED ON IT. Preview.jsx
 * renders this same component with a hand-written map to check the design;
 * there is no session behind it and nothing to rebuild, so offering a button
 * that cannot work would be worse than not offering one.
 */
export function Map({
  map, onRebuild, onOpenPlaybook, onRegenerate, onMove, onInsist, onNote, onWorth,
  moveNotes = {}, progress, rebuilding = false, spent = false,
}) {
  // 🔴 THIS USED TO BE LOCAL STATE AND IT WAS A LIE. A tick vanished on reload,
  // nothing read it, and the gate under every move — "move 2 starts when…" —
  // enforced nothing at all. A gate nothing enforces is a suggestion, and a
  // plan whose order is a suggestion is the pile of ideas this exists not to
  // be. Progress now comes from the database; Preview passes none and falls
  // back to ticking locally so the design can still be checked.
  const done = progress?.done ?? null
  const [openCut, setOpenCut] = useState(null)

  // ⭐⭐ Their own words on one move. `openNote` is which box is open, `draft` is
  // what is in it. One draft, not one per move — only one box is ever open, and
  // a map of drafts would be state nobody clears.
  const [openNote, setOpenNote] = useState(null)
  const [draft, setDraft] = useState('')

  /**
   * ⚠️ TWO OUTCOMES, ONE BOX, AND THE DIFFERENCE IS THE POINT.
   * `redo` false — the note sits beside ours and the plan is untouched.
   * `redo` true  — it goes into the next generation and the plan changes.
   * Both save. Without a save on the redo path the note would vanish the moment
   * the rebuild replaced the map, and they would watch their own words go.
   */
  async function saveNote(order, redo) {
    const text = draft.trim()
    setOpenNote(null)
    await onNote?.(order, text, redo)
  }

  // Stagger, in seconds, matching the design reference. With reduced motion
  // every delay collapses to zero and the animation is off in CSS — the build
  // is four seconds long, and to someone who asked the OS to stop moving things
  // that is four seconds of a page that looks broken.
  const at = s => (REDUCED ? { } : { animationDelay: `${s}s` })

  const [localDone, setLocalDone] = useState(() => new Set())
  const ticked = done ?? localDone

  function toggle(i) {
    // ⚠️ i is a zero-based index here and move_order is 1-based everywhere
    // else. Converting at the boundary rather than carrying two conventions
    // through the component, which is how off-by-ones get written.
    const order = i + 1
    const isDone = ticked.has(order)
    if (!isDone) tick()
    buzz()
    if (done && onMove) { onMove(order, !isDone); return }
    setLocalDone(d => {
      const next = new Set(d)
      if (next.has(order)) next.delete(order); else next.add(order)
      return next
    })
  }

  return (
    <WayoutShell title="Your plan" wide>
      {/* The brand mark on this screen reads "your plan", not the product name.
          The map belongs to them. */}
      {/* ⭐ Two halves, and only on a wide screen. The left is what the plan SAYS
          about them — the goal, the thing they missed, the numbers. The right
          is what they DO about it. On a phone `display: contents` collapses
          this back to the single column it was, so there is still only one
          design and nothing reflows into a second one nobody drew. */}
      {/* ⭐⭐ THE MOVES ARE NOT IN A COLUMN. They sit above the two-column spread
          and use the full width of the page.

          🔴 Built inside the right-hand column first, and a headless check
          measured the result: the route had 377px of a 1080px page, five grid
          columns in it, and 12px of overflow. The shape NEEDS width — three
          pinned notes and two gate tags across a narrow strip is not the design
          Daniel picked, it is a squashed version of it. The supporting detail
          still splits 7:5 underneath; the plan itself does not. */}
      {/* ⭐ The headline is the first thing on the page and it leads the whole
          width, because the moves below it do too. It was inside the left
          column when the moves moved out, which put "Three moves. This order."
          above the title of the plan those moves belong to. */}
      <div className="wayout__top">
        <p className="wayout__who wayout__r" style={at(0.1)}>{WAYOUT_MAP_LABEL}</p>
        <h2 className="wayout__r" style={at(0.3)}>
          <Marked text={map.headline} highlight={map.highlight} />
        </h2>
      </div>

      {/* ⭐ The quote and the two numbers are the SETUP — what they said and
          where they stand. They belong before the plan that answers them, not
          in a column beside it. They were below the moves for one build and it
          read backwards: the answer, then the question. */}
      <div className="wayout__setup">
      {/* ⭐ Rendered only when the contract check passed — session.js drops the
          card if the quote is not verbatim in what the person actually typed.
          A fabricated one takes every other claim on the page down with it. */}
      {map.seen && (
        <div className="wayout__seen wayout__r" style={at(0.9)}>
          {/* ⚠️ <q> inserts its own quotation marks. Typing curly ones as well
              rendered ““no real skills””. */}
          <q>{map.seen.quote}</q>
          <b>{map.seen.insight}</b>
        </div>
      )}

      {Array.isArray(map.stats) && (
        <div className="wayout__stats wayout__r" style={at(1.6)}>
          {map.stats.slice(0, 2).map((s, i) => (
            <div className="wayout__stat" key={i}>
              <span>{s.label}</span>
              <b><CountUp value={Number(s.value) || 0} prefix={s.prefix} suffix={s.suffix} /></b>
              {/* ⚠️ Optional. A figure with no "by when" is a slogan, but an
                  invented one is worse than none — so it renders only when the
                  model actually derived it. */}
              {s.caption && <span className="wayout__statwhen">{s.caption}</span>}
            </div>
          ))}
        </div>
      )}

      </div>

      <h3 className="wayout__label wayout__r" style={at(2.4)}>Three moves. This order.</h3>
      {/* ⭐⭐ SAID AT THE TOP, WHERE PEOPLE READ. Daniel: "maybe we market it so
          it shows that this is a suggested plan, up to you to do as you wish,
          not legal advice."
          ⚠️ The disclaimer at the foot is the legal sentence and it stays. This
          is the HONEST one, and it belongs beside the moves rather than under
          them — fine print at the bottom is what somebody scrolls past, and a
          thing you only say where it will not be read is a thing you have not
          said. It is also simply true: the order is our best reading of their
          answers, and every part of it can be changed by them. */}
      <p className="wayout__suggested wayout__r" style={at(2.45)}>
        Our best read of what you told us — a suggested order, not instructions.
        Anything here is yours to change.
      </p>

      {/* ⭐⭐ THE PINNED ROUTE. Daniel picked it out of four shapes: "i like the
          fun pin board but the checking off of steps and the progress marker".
          Notes keep the board's character; the string keeps the ORDER, which is
          the product. See wayout.css for why the string is a fixed-height svg
          and why the grid gaps are percentages. */}
      <div className="wayout__string wayout__r" style={at(2.6)}>
        <svg className="wayout__twine" viewBox="0 0 900 74" preserveAspectRatio="none" aria-hidden="true">
          <path className="slack" pathLength="100" d="M98 48 Q 274 72 450 48 Q 626 72 802 48" />
          <path
            className="taut"
            pathLength="100"
            d="M98 48 Q 274 72 450 48 Q 626 72 802 48"
            strokeDasharray={`${ticked.size === 0 ? 0 : ticked.size === 1 ? 50 : 100} 100`}
          />
        </svg>

        <div className="wayout__notes">
          {map.moves?.map((m, i) => {
            const order = i + 1
            const isDone = ticked.has(order)
            // ⚠️ Unlocked means the move BEFORE it is ticked. Move one always.
            const isOpen = order === 1 || ticked.has(order - 1)
            const state = isDone ? 'done' : (isOpen ? 'now' : 'locked')
            const theirs = moveNotes?.[order]

            return (
              <Fragment key={order}>
                <div className={`wayout__note wayout__note--${order} wayout__note--${state}`}>
                  {/* The pin is the MARKER and a second way to tick. It is never
                      the only way — see the note in wayout.css. */}
                  <button
                    type="button"
                    className="wayout__pin"
                    onClick={() => toggle(i)}
                    aria-pressed={isDone}
                    aria-label={`Mark move ${order} done`}
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3 3 7-7" />
                    </svg>
                  </button>
                  {state === 'now' && <span className="wayout__here">You are here</span>}

                  <b>Move {order} · {m.when}</b>
                  <h4>{m.title}</h4>
                  <p>{m.detail}{m.season ? ` ${m.season}` : ''}</p>

                  <div className="wayout__acts">
                    {/* ⭐ "Show me how" is the paywall. When payments go live it
                        carries the price — see the button lower down. A locked
                        move says what WOULD open it rather than just "locked":
                        the move is not hidden, the walkthrough is not open. */}
                    <button
                      type="button"
                      className="wayout__go"
                      disabled={!isOpen}
                      onClick={() => isOpen && onOpenPlaybook?.(order)}
                    >
                      {isOpen
                        ? (WAYOUT_PAYMENTS_LIVE && order === 1 ? `Show me how — ${WAYOUT_PRICE_FULL}` : 'Show me how')
                        : `Opens after gate ${order - 1}`}
                    </button>
                    {isOpen && (
                      <button type="button" className="wayout__mark" onClick={() => toggle(i)} aria-pressed={isDone}>
                        <i>
                          <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 8.5l3 3 7-7" />
                          </svg>
                        </i>
                        {isDone ? 'Done' : 'Mark done'}
                      </button>
                    )}
                  </div>

                  {/* ⭐⭐ THEIR OWN WORDS, ON THIS MOVE. Two outcomes from one box:
                      pin it on (the plan is unchanged, their note sits beside
                      ours) or redo (it goes into the next generation). */}
                  {theirs && openNote !== order && (
                    <div className="wayout__yours">
                      <b>Your note</b>
                      <p>{theirs}</p>
                      <button type="button" onClick={() => { setDraft(theirs); setOpenNote(order) }}>Change it</button>
                    </div>
                  )}
                  {openNote === order ? (
                    <div className="wayout__addbox">
                      <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        maxLength={600}
                        placeholder="What did we get wrong, or what should be in here?"
                      />
                      <div className="wayout__addrow">
                        <button type="button" className="keep" onClick={() => saveNote(order, false)}>Pin it on</button>
                        <button type="button" className="redo" onClick={() => saveNote(order, true)}>Redo this move with it</button>
                        <button type="button" className="drop" onClick={() => setOpenNote(null)}>Cancel</button>
                      </div>
                      <p className="wayout__addhint">
                        <b>Pin it on</b> keeps your note beside ours. <b>Redo</b> rewrites this
                        move around what you said — and everything after it, because the order
                        depends on it.
                      </p>
                    </div>
                  ) : !theirs && (
                    <button
                      type="button"
                      className="wayout__addstrip"
                      onClick={() => { setDraft(''); setOpenNote(order) }}
                    >
                      + Add or change something here
                    </button>
                  )}

                  {isDone && <span className="wayout__stamp">Done</span>}
                </div>

                {/* The gate gets its own grid column — see wayout.css. Not after
                    the last move: there is nothing it unlocks. */}
                {m.gate && i < map.moves.length - 1 && (
                  <div className={`wayout__gatetag${isDone ? ' wayout__gatetag--passed' : ''}`}>
                    <b>{isDone ? `\u2713 Gate ${order} passed` : `Gate ${order}`}</b>
                    <span>{m.gate}</span>
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      </div>


      {/* ⚠️ Two REAL columns. When the setup moved above the moves this left an
          empty first column and a page-wide hole beside "Crossed off". What was
          ruled out goes left; what happens next goes right. */}
      {/* ⭐⭐ THE REST OF THE PAGE IS THE BOARD TOO.
          🔴 Daniel: "still has half the old half the new". He was right, and a
          full-page screenshot showed why: the pinned notes stopped dead and
          everything under them was flat rows and plain boxes — two design
          languages on one page.
          🔴 WORSE, EVERYTHING FROM "Through the off-season" DOWN TO THE
          DISCLAIMER WAS INSIDE COLUMN TWO, which is 5/12 of the width. That is
          what left ~900px of empty page beside a short "Crossed off" list, and
          why the one dark CTA — the thing being sold — was rendered in a narrow
          strip. The sections are now equal cards that FILL, and everything that
          is not a section runs full width below them. */}
      <div className="wayout__board">
      {Array.isArray(map.cut) && map.cut.length > 0 && (
        <section className="wayout__card">
          <h3 className="wayout__label wayout__r" style={at(3.4)}>Crossed off, on purpose</h3>
          <div className="wayout__cut wayout__r" style={at(3.5)}>
            {map.cut.map((c, i) => (
              <button
                type="button"
                key={i}
                className="wayout__cutrow"
                onClick={() => setOpenCut(openCut === i ? null : i)}
                aria-expanded={openCut === i}
              >
                <s>{c.label}</s>
                <em>{openCut === i ? 'Hide' : 'Why'}</em>
                {openCut === i && (
                  <>
                    <span className="wayout__cutwhy">{c.why}</span>
                    {/* ⭐⭐ THE OPTION IS SELECTABLE, NOT JUST READABLE. Daniel
                        wanted the person choosing rather than being instructed.
                        A menu of three equal options would have been the pile
                        of ideas this product exists to replace — so the plan
                        still commits to an order, and the things it ruled out
                        can be ruled back in by the only person entitled to. */}
                    {onInsist && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="wayout__insist"
                        onClick={e => { e.stopPropagation(); onInsist(c.label) }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onInsist(c.label) }
                        }}
                      >
                        I want this one anyway — put it in the plan
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(map.seasonPlan) && map.seasonPlan.length > 0 && (
        <section className="wayout__card">
          <h3 className="wayout__label wayout__r" style={at(3.7)}>Through the off-season</h3>
          {map.seasonPlan.map((s, i) => (
            <p className="wayout__hint wayout__r" key={i} style={at(3.75)}>
              <b>{s.months}</b> — {s.work}
            </p>
          ))}
        </section>
      )}

      {/* ⭐⭐ WHAT IT TOOK AS GIVEN, SAID OUT LOUD, IMMEDIATELY BEFORE THEY ACT.
          Daniel read his own plan and said "there are so many assumptions here
          not based off any numbers or data" — and none of them were figures.
          They were smuggled in as adjectives: the rental was in "a year-round
          demand market", it would be "under professional management". He never
          said either.

          A plan cannot always avoid assuming. It can always avoid PRETENDING.
          Declared here, an assumption stops being a lie and becomes the most
          useful thing on the page: the one question whose answer changes the
          plan, asked of the only person who knows it. */}
      {/* ⭐ One book, beside the plan rather than instead of it. It is the
          door next to the door — for the part of this that is about how they
          SEE the situation rather than what they do on Saturday. The contract
          has already dropped it if it is not on our shelf. */}
      {map.read?.title && (
        <section className="wayout__card wayout__read wayout__r" style={at(3.8)}>
          <h3 className="wayout__label">One thing worth reading</h3>
          <p className="wayout__readtitle">
            <b>{map.read.title}</b>{map.read.author ? ` — ${map.read.author}` : ''}
          </p>
          {map.read.why && <p className="wayout__hint">{map.read.why}</p>}
          {/* ⭐⭐ THE CAVEAT IS OURS, RENDERED FROM OUR OWN FILE, ALWAYS. A
              caveat the model composes is one that can be enthusiastic itself
              — and these are books somebody may act on with money. Naming a
              book without saying what to hold lightly is how a shelf becomes
              an endorsement. */}
          {bookOnShelf(map.read.title)?.hold && (
            <p className="wayout__hold">{bookOnShelf(map.read.title).hold}</p>
          )}
        </section>
      )}

      {Array.isArray(map.assumptions) && map.assumptions.length > 0 && (
        <section className="wayout__card wayout__given wayout__r" style={at(3.85)}>
          <h3 className="wayout__label">What this took as given</h3>
          <ul>
            {map.assumptions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
          <p className="wayout__hint">
            If any of these are wrong, the plan changes. That is worth more than
            finishing it.
          </p>
          {/* ⭐ The sentence above is only true if something can act on it. */}
          {onRebuild && (
            <button type="button" className="wayout__again" onClick={onRebuild} disabled={rebuilding}>
              One of these is wrong — change my answers
            </button>
          )}
        </section>
      )}
      </div>

      {/* ⭐⭐ THE OFFER, AFTER THEY ALREADY HAVE THE ANSWER. Nobody can fear an
          ambush in a flow where the assessment is theirs before anything is
          asked for, and the thing sold is the honest one: not what to do —
          that is above, free — but how to actually do it.

          🔴 IT WAS FLAT. Daniel: "i dont like this sell ... its flat needs to
          be exciting." It was a grey card on a cream page with a generic
          heading and a paragraph, sitting under the most specific thing this
          product has ever written about him. The fix is not louder words — it
          is being SPECIFIC: it names HIS move one, in his plan's own words, and
          lists what is actually inside rather than describing it. And it is the
          one dark block on the page, so it reads as a door rather than another
          section. */}
      <div className="wayout__offer wayout__r" style={at(4.2)}>
        <span className="wayout__offerkick">The next part</span>
        <h3>{map.moves?.[0]?.title ?? 'Move one'}</h3>
        <p className="wayout__offerlead">
          {Array.isArray(map.stuck) && map.stuck.length > 0
            ? 'You know what the move is. These are the questions that turn up the moment you start it.'
            : 'You know what it is. This is how you do it — for your town, your hours, and the people who have already paid you.'}
        </p>
        {/* ⭐⭐ THE QUESTIONS, NOT THE FEATURES. Daniel: "telling you what is
            inside is weak, not a good sell." He is right, and the reason is
            that a contents list describes a product to somebody who has not
            got a problem yet. These are the snags that arrive within an hour
            of starting HIS move one, in his own situation — the awkward
            wording, the number nobody will volunteer, the bit where the first
            person he asks says "it depends".

            ⚠️ Questions only. The moment one carries its answer it stops being
            a gap and becomes a sample, and the thing being sold is the answer.
            The contract drops any line that is not a question. */}
        {Array.isArray(map.stuck) && map.stuck.length > 0 ? (
          <ul className="wayout__offerlist wayout__offerlist--q">
            {map.stuck.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        ) : (
          <ul className="wayout__offerlist">
            <li>The first thing to do, and the day to do it</li>
            <li>The words to send, short enough to send without editing</li>
            <li>What to charge — and where that number comes from</li>
            <li>What you do <b>not</b> need to buy yet</li>
            <li>What goes wrong the first time, and what to do about it</li>
          </ul>
        )}
        {/* ⭐⭐ THE ONE LINE THAT STOPS THIS CARD BACKFIRING.
            Three questions nobody can answer, straight after a plan that just
            made somebody feel capable, can quietly undo it — they leave the
            page feeling less ready than when they arrived. Naming the questions
            as NORMAL turns the same list from a set of holes in them into a set
            of things that have answers, which is also the truth. */}
        {Array.isArray(map.stuck) && map.stuck.length > 0 && (
          <p className="wayout__offerfine wayout__offernote">
            Everyone hits these. None of them are hard once you have watched
            somebody do it once.
          </p>
        )}
        <PlaybookCta onOpen={onOpenPlaybook} />
      </div>

      {onWorth && <WorthAsk onSave={onWorth} />}

      {/* ⭐⭐ THE THING THEY REMEMBER AFTERWARDS. It is usually the important
          one — the illness, the debt they did not want to type, the person who
          has already offered them work. The intake asks thirty questions and
          still cannot ask the one that matters to this person, so the product
          has to stay open after the plan rather than closing behind it. */}
      {spent && <Spent />}

      {/* Dev only — see regenerateNow. Deliberately plain and labelled, so it
          can never be mistaken for something a person is meant to see.

          ⚠️ THE `import.meta.env.DEV` HAS TO BE HERE, IN THE JSX, NOT ONLY ON
          THE PROP. Passing `DEV ? fn : null` from the parent leaves this whole
          branch in the shipped chunk — the prop is a runtime value, so nothing
          can statically eliminate it, and the strings ride along into
          production even though they never render. Written inline, Vite
          substitutes `false` at build time and the minifier drops the branch.
          🔴 I wrote a comment claiming it was dropped and then grepped the
          built file, which said otherwise. Check the artifact. */}
      {import.meta.env.DEV && onRegenerate && (
        <p className="wayout__rebuild">
          <button type="button" className="wayout__again" onClick={onRegenerate} disabled={rebuilding}>
            {rebuilding ? 'Building…' : 'Regenerate from the same answers'}
          </button>
          {' '}— dev only, not in the build.
        </p>
      )}

      {onRebuild && (
        <p className="wayout__rebuild wayout__r" style={at(4.15)}>
          Or if more than one thing has changed,{' '}
          <button type="button" className="wayout__again" onClick={onRebuild} disabled={rebuilding}>
            go back through the questions
          </button>
          {' '}— the plan is rebuilt on what you change.
        </p>
      )}

      <p className="wayout__disclaimer wayout__r" style={at(4.1)}>{map.disclaimer}</p>
    </WayoutShell>
  )
}

/**
 * ⭐⭐ WHAT THE CTA CAN HONESTLY BE WHILE THE THING IT SELLS IS NOT BUILT.
 *
 * Not "buy" — there is nothing to buy. Not a button that goes nowhere, which is
 * the `VideoSection` failure from the other product: an empty shelf reads worse
 * than no shelf. "Tell me when this is ready" is a real answer to a real
 * question, and it is also the number most worth having BEFORE building the
 * paid half — whether people want the how badly enough to ask for it is the
 * entire commercial thesis, and this measures it for the price of one column.
 */
function PlaybookCta({ onOpen }) {
  // ⭐⭐ IT EXISTS NOW, SO THE BUTTON DOES THE THING. This was a waiting list
  // for one day, which was the honest CTA while there was nothing behind it —
  // an empty shelf reads worse than no shelf. There is something behind it.
  //
  // ⚠️ The price still is not charged: WAYOUT_PAYMENTS_LIVE is false and
  // migration 055 makes finishing the intake the entitlement. The copy says so
  // plainly rather than implying a trial or a discount, because the one thing
  // this product cannot survive is a promise it does not keep.
  return (
    <>
      {/* 🔴 `onClick={onOpen}` HANDED REACT'S CLICK EVENT TO A DEFAULT
          PARAMETER. `openPlaybook(order = 1)` got a SyntheticEvent instead of
          1, the URL became /wayout/play/[object Object], Number() gave NaN and
          the page bounced straight back to the plan. The default looked like
          it covered the no-argument case and it was never reached.
          ⚠️ A default parameter is not a guard when the caller is a DOM
          handler — the event is always an argument. */}
      <button className="wayout__btn wayout__btn--sun" onClick={() => onOpen()}>
        {WAYOUT_PAYMENTS_LIVE ? `Show me how — ${WAYOUT_PRICE_FULL}` : 'Show me how'}
      </button>
      <p className="wayout__offerfine">
        {WAYOUT_PAYMENTS_LIVE ? guaranteeLine() : 'Free while this is being built. Nothing to pay.'}
      </p>
    </>
  )
}

/**
 * ⭐⭐ WHEN THE REBUILDS ARE GONE, THE HONEST THING IS NOT A WALL.
 *
 * Daniel: "you could almost just keep changing things until you get the answer
 * to what you are looking for." Somebody on their fourth rewrite does not have
 * a planning problem any more, and a fifth plan helps them keep avoiding the
 * thing they are afraid of. So the message is the product thesis said plainly,
 * and it is true whether or not they ever pay for anything.
 */
function Spent() {
  return (
    <p className="wayout__rebuild">
      You’ve been back through your answers once, and this is the plan they
      make. Move one is still first — and it’s still the only one you can
      start today.
    </p>
  )
}

/**
 * What comes back instead of a plan when somebody is in the middle of something.
 *
 * ⚠️ Deliberately bare. No brand mark doing a little animation, no stats, no
 * progress, no "your plan" — every piece of that furniture says this is a
 * product experience, and it is not one. It is one page of plain text with the
 * numbers in it, on the quietest surface this design has.
 *
 * ⚠️ And no wayout__r classes: the reveal animation staggers content in over
 * four seconds. Making somebody watch a message about their safety fade in on
 * a schedule is the kind of detail that tells them a machine wrote it.
 */
function CrisisNote({ message }) {
  // The model writes markdown bold around the numbers it wants seen. Rendering
  // the asterisks would be worse than losing the emphasis, so they are stripped
  // and the paragraph breaks kept.
  const paragraphs = String(message ?? '')
    .replace(/\*\*/g, '')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <WayoutShell title="Read this first">
      <div className="wayout__crisis">
        {paragraphs.map((p, i) => (
          <p key={i} className={i === 0 ? 'wayout__q' : 'wayout__lead'}>{p}</p>
        ))}
      </div>
    </WayoutShell>
  )
}

/** Split a headline on its highlight phrase. */
function Marked({ text, highlight }) {
  if (!highlight || !text?.includes(highlight)) return text
  const [before, ...rest] = text.split(highlight)
  return <>{before}<mark>{highlight}</mark>{rest.join(highlight)}</>
}

/**
 * Counts up to the figure.
 *
 * ⚠️ With reduced motion it renders the final number immediately. A counter is
 * decoration; the number is the information, and someone who turned motion off
 * should not have to watch it arrive.
 */
function CountUp({ value, prefix = '', suffix = '' }) {
  // The reduced-motion case is handled by the initial state, not by the effect
  // — setting it inside the effect body would be a cascading render for a value
  // that was already correct on first paint.
  const [n, setN] = useState(REDUCED ? value : 0)

  useEffect(() => {
    if (REDUCED) return undefined
    let raf
    const start = performance.now()
    const dur = 900
    const tick = now => {
      const t = Math.min(1, (now - start) / dur)
      // Ease out — fast at first, settles on the number rather than crawling.
      setN(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{prefix}{n.toLocaleString()}{suffix}</>
}
