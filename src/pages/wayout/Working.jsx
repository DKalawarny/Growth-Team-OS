import { useEffect, useState } from 'react'

/**
 * ⭐⭐ THE WAIT, MADE HONEST AND MADE INTERESTING — in that order.
 *
 * 🔴 Daniel, hitting it between every page: "this load page I keep getting while
 * moving from page to page needs a good update — needs to be streamlined, with
 * movement, create excitement."
 *
 * It was a headline, a sentence and three pulsing dots, held for up to a minute
 * at the single highest-anticipation moment in the product: the seconds before
 * somebody is handed the thing they came for.
 *
 * 🔴🔴 AND THE OBVIOUS FIX IS THE BANNED ONE. Every loading screen in every AI
 * product now narrates fake machinery — "Analysing your profile…", "Consulting
 * the knowledge base…" — and this product has a hard rule against mentioning its
 * own plumbing, for a good reason: the moment it describes a process nobody can
 * verify, it is asking to be taken on faith at the exact moment it should be
 * earning trust.
 *
 * ⭐⭐ SO THE STAGES ARE THE OUTPUT, NOT THE PROCESS. Each line names a SECTION
 * OF THE THING THEY ARE ABOUT TO READ — what to do first, the words to use, what
 * usually goes wrong. That is true whatever the machine is doing, it cannot be
 * accused of theatre, and it does the anticipation work better than a fake
 * progress bar because it is a table of contents arriving one line at a time.
 *
 * ⚠️ THE BAR NEVER CLAIMS TO KNOW. It eases toward 90% and waits there. A bar
 * that hits 100% and sits is worse than no bar, and one that jumps to the end
 * when the data lands is the only honest shape.
 */

/** How long each stage holds before the next lights up. */
const STEP_MS = 2600

export default function Working({ title, lead, stages = [], variant = 'stack' }) {
  const [lit, setLit] = useState(0)

  useEffect(() => {
    if (!stages.length) return undefined
    // ⚠️ Stops on the LAST one rather than looping. A list that starts over
    // tells somebody it has been going nowhere.
    const id = setInterval(() => setLit(n => Math.min(n + 1, stages.length - 1)), STEP_MS)
    return () => clearInterval(id)
  }, [stages.length])

  const pct = stages.length ? Math.min(90, ((lit + 1) / stages.length) * 90) : 0

  return (
    <div className={`wayout__work wayout__work--${variant}`}>
      <div className="wayout__workbar"><b style={{ width: `${pct}%` }} /></div>

      {title && <h1 className="wayout__workh">{title}</h1>}
      {lead && <p className="wayout__worklead">{lead}</p>}

      <ul className="wayout__worksteps">
        {stages.map((s, i) => (
          <li
            key={s}
            className={i < lit ? 'is-done' : i === lit ? 'is-now' : 'is-next'}
          >
            <i aria-hidden="true">
              {i < lit
                ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>
                : null}
            </i>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
