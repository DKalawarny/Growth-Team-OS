import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { supabase } from '../../lib/supabase'
import { loadOrCreateSession, generateMap, saveAnswers, countRebuild, wantPlaybook, WAYOUT_MAX_REBUILDS, enforceMapContract, mapProblems } from '../../lib/wayout/session'
import { WAYOUT_MAP_LABEL, WAYOUT_BASE } from '../../lib/wayout/brand'
import { WAYOUT_PRICE_LABEL, WAYOUT_PAYMENTS_LIVE, guaranteeLine } from '../../lib/wayout/pricing'
import { tick, buzz } from '../../lib/wayout/feedback'

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
        if (s.map && params.get('rebuild')) {
          countRebuild(s.id, s.rebuilds).then(n => setSession(c => ({ ...c, rebuilds: n })))
          build(s)
          return
        }
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
    setBuilding(true)
    setError('')
    try {
      // ⭐ generateMap now validates and rewrites once itself — a map that
      // comes back from it has passed mapProblems, including the check that
      // every figure in it is one this person actually gave us. It throws
      // rather than returning a plan with somebody else's numbers in it.
      const generated = await generateMap(s.answers)
      const { error: wErr } = await supabase
        .from('wayout_sessions')
        .update({ map: generated })
        .eq('id', s.id)
      if (wErr) throw new Error(wErr.message)
      setMap(generated)
    } catch (err) {
      setError(err.message)
    } finally {
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

  /** They asked to be told when the play-by-play exists. */
  async function want() {
    if (session) await wantPlaybook(session.id)
  }

  /**
   * ⭐⭐ NOBODY REMEMBERS EVERYTHING AT INTAKE, AND WHAT THEY REMEMBER LATER IS
   * USUALLY THE IMPORTANT ONE.
   *
   * Daniel: "forgetting details is something that can be changed once in the
   * system." Going back through thirty questions to add one sentence is the
   * wrong shape for that — the friction is not protecting anything, because the
   * person has already answered everything once. What they are doing now is
   * telling us something NEW, which is exactly the input the plan wants.
   *
   * ⚠️ It is kept as its own list, never merged into an existing answer. The
   * intake asked specific questions and their answers to those still mean what
   * they meant; this is a person coming back unprompted, which is a different
   * and usually better kind of thing to know.
   */
  async function remember(text) {
    const said = String(text ?? '').trim()
    if (!said || !session || building) return
    const answers = {
      ...session.answers,
      added: [...(session.answers?.added ?? []), said],
    }
    setMap(null)
    setBuilding(true)
    try {
      await saveAnswers(session.id, answers)
      const rebuilds = await countRebuild(session.id, session.rebuilds)
      const next = { ...session, answers, rebuilds }
      setSession(next)
      await build(next)
    } catch (err) {
      setError(err.message)
      setBuilding(false)
    }
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
    return (
      <WayoutShell title="Your plan">
        <p className="wayout__q">Reading it back.</p>
        <p className="wayout__lead">
          Going through everything you wrote — what can’t move, the numbers, what
          you said you’d never do — and working out which of it comes first.
        </p>
        <p className="wayout__lead">About twenty seconds. Nothing to pay.</p>
        <div className="wayout__working" aria-hidden="true"><i /><i /><i /></div>
      </WayoutShell>
    )
  }

  if (!map) return null
  // ⭐ When the allowance is gone the doors close, and what is behind them is
  // not a wall — it is the only honest thing left to say. See `Spent`.
  const spent = (session?.rebuilds ?? 0) >= WAYOUT_MAX_REBUILDS
  return (
    <Map
      map={map}
      onRebuild={spent ? null : rebuild}
      onRemember={spent ? null : remember}
      onWantPlaybook={want}
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

      {WAYOUT_PAYMENTS_LIVE ? (
        <button className="wayout__btn wayout__btn--sun" onClick={startCheckout}>
          Build my plan — {WAYOUT_PRICE_LABEL}
        </button>
      ) : (
        <>
          <div className="wayout__reflect">
            This isn’t taking payments yet. Nothing has been charged and your
            answers are kept — the plan opens here when it’s ready.
          </div>
          <p className="wayout__hint">
            Price when it opens: {WAYOUT_PRICE_LABEL}, once. Not a subscription.
          </p>
        </>
      )}
    </WayoutShell>
  )
}

function startCheckout() {
  // 🔴 NOT BUILT. Wiring this needs a live Stripe price object and a `wayout`
  // branch in the stripe-webhook function that sets status='paid' — the only
  // thing migration 046 accepts as proof of payment. See lib/wayout/pricing.js.
  throw new Error('wayout: checkout is not wired yet')
}

// ── The map ─────────────────────────────────────────────────────────────────

/**
 * ⚠️ `onRebuild` IS OPTIONAL AND THE CONTROLS ARE GATED ON IT. Preview.jsx
 * renders this same component with a hand-written map to check the design;
 * there is no session behind it and nothing to rebuild, so offering a button
 * that cannot work would be worse than not offering one.
 */
export function Map({ map, onRebuild, onRemember, onWantPlaybook, rebuilding = false, spent = false }) {
  const [done, setDone] = useState(() => new Set())
  const [openCut, setOpenCut] = useState(null)

  // Stagger, in seconds, matching the design reference. With reduced motion
  // every delay collapses to zero and the animation is off in CSS — the build
  // is four seconds long, and to someone who asked the OS to stop moving things
  // that is four seconds of a page that looks broken.
  const at = s => (REDUCED ? { } : { animationDelay: `${s}s` })

  function toggle(i) {
    let ticking = false
    setDone(d => {
      const next = new Set(d)
      if (next.has(i)) next.delete(i)
      else { next.add(i); ticking = true }
      return next
    })
    // ⚠️ Only on the way ON. Ticking something off is an accomplishment;
    // un-ticking it is a correction, and celebrating a correction is the kind
    // of detail that makes an app feel like it is not listening.
    buzz()
    if (ticking) tick()
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
      <div className="wayout__spread">
      <div className="wayout__col">
      <p className="wayout__who wayout__r" style={at(0.1)}>{WAYOUT_MAP_LABEL}</p>

      <h2 className="wayout__r" style={at(0.3)}>
        <Marked text={map.headline} highlight={map.highlight} />
      </h2>

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

      <div className="wayout__col">
      <h3 className="wayout__label wayout__r" style={at(2.4)}>Three moves. This order.</h3>

      <div className="wayout__moves">
        {map.moves?.map((m, i) => (
          <div key={i}>
            <button
              type="button"
              className={`wayout__move wayout__r${i === 0 ? ' wayout__move--now' : ''}${done.has(i) ? ' wayout__move--done' : ''}`}
              style={at(2.6 + i * 0.3)}
              onClick={() => toggle(i)}
              aria-pressed={done.has(i)}
            >
              <span className="wayout__chk">
                <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8.5l3 3 7-7" />
                </svg>
              </span>
              <span>
                <p>{m.title}</p>
                <small><b>{m.when}</b> {m.detail}{m.season ? ` ${m.season}` : ''}</small>
              </span>
            </button>

            {/* ⭐ The gate, on the spine, between this move and the next — the
                sentence that makes this a plan instead of three ideas. Not
                rendered after the last move: there is nothing it unlocks. */}
            {m.gate && i < map.moves.length - 1 && (
              <div className="wayout__gate wayout__r" style={at(2.75 + i * 0.3)}>
                <span>Move {i + 2} starts when <b>{m.gate}</b></span>
              </div>
            )}
          </div>
        ))}
      </div>

      {Array.isArray(map.cut) && map.cut.length > 0 && (
        <>
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
                {openCut === i && <span className="wayout__cutwhy">{c.why}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {Array.isArray(map.seasonPlan) && map.seasonPlan.length > 0 && (
        <>
          <h3 className="wayout__label wayout__r" style={at(3.7)}>Through the off-season</h3>
          {map.seasonPlan.map((s, i) => (
            <p className="wayout__hint wayout__r" key={i} style={at(3.75)}>
              <b>{s.months}</b> — {s.work}
            </p>
          ))}
        </>
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
      {Array.isArray(map.assumptions) && map.assumptions.length > 0 && (
        <div className="wayout__given wayout__r" style={at(3.85)}>
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
        </div>
      )}

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
          You know what it is. This is how you do it — for your town, your
          hours, and the people who have already paid you.
        </p>
        <ul className="wayout__offerlist">
          <li>The first thing to do, and the day to do it</li>
          <li>The words to send, short enough to send without editing</li>
          <li>What to charge — and where that number comes from</li>
          <li>What you do <b>not</b> need to buy yet</li>
          <li>What goes wrong the first time, and what to do about it</li>
        </ul>
        <PlaybookCta onWant={onWantPlaybook} />
      </div>

      {/* ⭐⭐ THE THING THEY REMEMBER AFTERWARDS. It is usually the important
          one — the illness, the debt they did not want to type, the person who
          has already offered them work. The intake asks thirty questions and
          still cannot ask the one that matters to this person, so the product
          has to stay open after the plan rather than closing behind it. */}
      {onRemember
        ? <Remembered onRemember={onRemember} busy={rebuilding} />
        : spent && <Spent />}

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
      </div>
      </div>
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
function PlaybookCta({ onWant }) {
  const [asked, setAsked] = useState(false)
  const [err, setErr] = useState('')

  if (WAYOUT_PAYMENTS_LIVE) {
    return (
      <>
        <button className="wayout__btn wayout__btn--sun">Show me how — {WAYOUT_PRICE_LABEL}</button>
        <p className="wayout__offerfine">{guaranteeLine()}</p>
      </>
    )
  }

  if (asked) {
    return (
      <p className="wayout__offerfine wayout__offerdone">
        You’re on the list. You’ll hear from us once, when it’s ready.
      </p>
    )
  }

  return (
    <>
      <button
        className="wayout__btn wayout__btn--sun"
        onClick={async () => {
          try { await onWant(); setAsked(true) } catch (e) { setErr(e.message) }
        }}
      >
        Tell me when this is ready
      </button>
      <p className="wayout__offerfine">
        {err || 'It’s being built now. Nothing to pay, and no email until it exists.'}
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
      You’ve changed this plan three times. That’s usually the sign it isn’t the
      plan that needs work — move one is still there, and it’s still first.
    </p>
  )
}

/**
 * One box, for the thing they did not say.
 *
 * ⚠️ IT STARTS CLOSED. An open textarea under a finished plan reads as a form
 * still to be filled in — as though the plan were provisional until they write
 * something. The plan is theirs and it is finished; this is a door, not a step.
 */
function Remembered({ onRemember, busy }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  if (!open) {
    return (
      <p className="wayout__rebuild">
        Thought of something you didn’t mention?{' '}
        <button type="button" className="wayout__again" onClick={() => setOpen(true)}>
          Add it
        </button>
      </p>
    )
  }

  return (
    <div className="wayout__given" style={{ marginTop: 30 }}>
      <label className="wayout__label" htmlFor="wayout-remembered">
        What else should it know?
      </label>
      <p className="wayout__hint" style={{ marginTop: 6 }}>
        Whatever it is. The thing people leave out is usually the thing that
        changes the order.
      </p>
      <textarea
        id="wayout-remembered"
        className="wayout__textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="My brother-in-law has been asking me to come in with him since the spring."
      />
      <button
        className="wayout__btn"
        disabled={busy || !text.trim()}
        onClick={() => onRemember(text)}
      >
        {busy ? 'Building…' : 'Add it and build the plan again'}
      </button>
    </div>
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
