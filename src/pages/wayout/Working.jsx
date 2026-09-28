import { useEffect, useState } from 'react'

/**
 * ⭐⭐ THE WAIT. One hairline, and one enormous line that turns over.
 *
 * 🔴 Daniel rejected two earlier attempts — a card with three pulsing dots, then
 * a stage-list with ticks — and was right both times: "these loading pages need
 * to be redone, they're shit." He chose this one from three built side by side
 * at claude.ai/code/artifact/282f827a (A · Nothing but the work).
 *
 * ⭐⭐ THE ARGUMENT FOR IT: a wait is dead time, and the only thing that makes
 * dead time feel short is something worth reading at a size you cannot ignore.
 * No card, no list, no checkmarks, no spinner — the type is the entire design.
 *
 * 🔴🔴 THE RULE EVERY VERSION OF THIS HAS HAD TO OBEY, AND THE REASON THE OBVIOUS
 * DESIGN IS BANNED: it must never narrate the machine. Every AI product now says
 * "Analysing your profile…" about a process nobody can verify, and this one has a
 * hard rule against describing its own plumbing — the moment it does, it is
 * asking to be taken on faith at exactly the moment it should be earning trust.
 * ⭐ So what the lines name is the OUTPUT: the sections of the thing about to
 * arrive. That is true whatever the machine is doing, and it cannot be accused of
 * theatre because it is a table of contents, not a status report.
 *
 * ⚠️ THE BAR NEVER CLAIMS TO KNOW. It eases toward 90% and waits there. A bar
 * that reaches the end and sits is worse than no bar, and one that jumps to the
 * end when the data lands is the only honest shape.
 *
 * ⚠️ NO `title` PROP, DELIBERATELY. The line IS the headline — a heading above it
 * would put two of them on a screen whose whole design is that there is one.
 */

/** How long each line holds. Long enough to read twice without hurrying. */
const STEP_MS = 2400

/**
 * ⚠️ `foot` IS THE ONLY OTHER THING ALLOWED ON THIS SCREEN, and it earns its
 * place: it is the honest duration. "Twenty seconds" was once a guess here and
 * the real generation measured 27s, 28s and over sixty — promising twenty and
 * taking sixty is how a working page comes to look broken. It sits small and
 * quiet BELOW the line, so the design still has exactly one loud thing on it.
 */
export default function Working({ lines = [], foot = null }) {
  const [lit, setLit] = useState(0)

  useEffect(() => {
    if (lines.length < 2) return undefined
    // ⚠️ Stops on the last one rather than looping. A sequence that starts over
    // tells somebody it has been going nowhere.
    const id = setInterval(() => setLit(n => Math.min(n + 1, lines.length - 1)), STEP_MS)
    return () => clearInterval(id)
  }, [lines.length])

  const pct = lines.length ? Math.min(90, ((lit + 1) / lines.length) * 90) : 0

  return (
    <div className="wayout__wait">
      <div className="wayout__waitrule"><b style={{ width: `${pct}%` }} /></div>
      {/* ⚠️ All of them render, stacked in the same place — the one that is lit
          is the only one visible. Swapping textContent instead would kill the
          cross-fade, which is the entire effect. */}
      <div className="wayout__waitlines">
        {lines.map((l, i) => (
          <p
            key={l}
            className={`wayout__waitline${i === lit ? ' is-now' : ''}${i < lit ? ' is-past' : ''}`}
            aria-hidden={i !== lit}
          >
            {l}
          </p>
        ))}
      </div>
      {foot && <p className="wayout__waitfoot">{foot}</p>}
    </div>
  )
}
