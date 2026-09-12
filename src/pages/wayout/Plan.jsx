import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { supabase } from '../../lib/supabase'
import { loadOrCreateSession, generateMap, mapProblems } from '../../lib/wayout/session'
import { WAYOUT_MAP_LABEL, WAYOUT_BASE } from '../../lib/wayout/brand'
import { WAYOUT_PRICE_LABEL, WAYOUT_PAYMENTS_LIVE } from '../../lib/wayout/pricing'

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
        if (s.map) setMap(s.map)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [navigate])

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
      const generated = await generateMap(s.answers)
      const problems = mapProblems(generated)
      if (problems.length) {
        // Better to say the plan came back wrong than to render half of one to
        // someone who has paid for it.
        throw new Error(`The plan came back incomplete (${problems.join(', ')}). Try again.`)
      }
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

  if (loading) return <WayoutShell><p className="wayout__lead">One moment.</p></WayoutShell>

  if (error && !map) {
    return (
      <WayoutShell title="Your plan">
        <p className="wayout__q">That didn’t come through.</p>
        <p className="wayout__lead">{error}</p>
        {session?.status === 'paid' && (
          <button className="wayout__btn" onClick={() => build(session)} disabled={building}>
            {building ? 'Building…' : 'Try again'}
          </button>
        )}
      </WayoutShell>
    )
  }

  // ── Finished the questions, hasn't paid ───────────────────────────────────
  if (session?.status === 'complete') return <Paywall />

  // ── Paid, map not generated yet ───────────────────────────────────────────
  if (session?.status === 'paid' && !map) {
    return (
      <WayoutShell title="Your plan">
        <p className="wayout__q">Building your plan.</p>
        <p className="wayout__lead">
          Reading back through everything you wrote. About twenty seconds.
        </p>
        <button className="wayout__btn" onClick={() => build(session)} disabled={building}>
          {building ? 'Building…' : 'Build it'}
        </button>
      </WayoutShell>
    )
  }

  if (!map) return null
  return <Map map={map} />
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

function Map({ map }) {
  const [done, setDone] = useState(() => new Set())
  const [openCut, setOpenCut] = useState(null)

  // Stagger, in seconds, matching the design reference. With reduced motion
  // every delay collapses to zero and the animation is off in CSS — the build
  // is four seconds long, and to someone who asked the OS to stop moving things
  // that is four seconds of a page that looks broken.
  const at = s => (REDUCED ? { } : { animationDelay: `${s}s` })

  function toggle(i) {
    setDone(d => {
      const next = new Set(d)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
    // Haptic where the device has it. Silent everywhere else — never a sound
    // the person did not ask for.
    if (navigator.vibrate) navigator.vibrate(12)
  }

  return (
    <WayoutShell title="Your plan">
      {/* The brand mark on this screen reads "your plan", not the product name.
          The map belongs to them. */}
      <p className="wayout__who wayout__r" style={at(0.1)}>{WAYOUT_MAP_LABEL}</p>

      <h2 className="wayout__r" style={at(0.3)}>
        <Marked text={map.headline} highlight={map.highlight} />
      </h2>

      {/* ⭐ Rendered only when the contract check passed — session.js drops the
          card if the quote is not verbatim in what the person actually typed.
          A fabricated one takes every other claim on the page down with it. */}
      {map.seen && (
        <div className="wayout__seen wayout__r" style={at(0.9)}>
          “{map.seen.quote}” <b>{map.seen.insight}</b>
        </div>
      )}

      {Array.isArray(map.stats) && (
        <div className="wayout__stats wayout__r" style={at(1.6)}>
          {map.stats.slice(0, 2).map((s, i) => (
            <div className="wayout__stat" key={i}>
              <span>{s.label}</span>
              <b><CountUp value={Number(s.value) || 0} prefix={s.prefix} suffix={s.suffix} /></b>
            </div>
          ))}
        </div>
      )}

      <h3 className="wayout__label wayout__r" style={at(2.4)}>Three moves. This order.</h3>

      <div className="wayout__moves">
        {map.moves?.map((m, i) => (
          <button
            type="button"
            key={i}
            className={`wayout__move wayout__r${i === 0 ? ' wayout__move--now' : ''}${done.has(i) ? ' wayout__move--done' : ''}`}
            style={at(2.6 + i * 0.2)}
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
              {m.gate && <small className="wayout__gate">Next move starts when: {m.gate}</small>}
            </span>
          </button>
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

      <button className="wayout__btn wayout__btn--sun wayout__r" style={at(4)} onClick={() => toggle(0)}>
        Start move one
      </button>

      <p className="wayout__disclaimer wayout__r" style={at(4.1)}>{map.disclaimer}</p>
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
