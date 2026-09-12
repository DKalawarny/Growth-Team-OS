/**
 * The way out — tick feedback.
 *
 * ⭐ Daniel's note on the design: the tick "should have a haptic and a soft
 * sound on a real phone. That, plus the reveal, is where the pump-up lives."
 * He is right that it is the only moment in the product where something the
 * person DID gets acknowledged — everything else is the product talking.
 *
 * ⚠️ SYNTHESISED, NOT AN ASSET. A sound file is a network request that can fail
 * silently, a licence to keep track of, and ~20KB on a route that already pays
 * for two font families. This is about forty bytes of maths.
 *
 * Rules it has to obey:
 * - Only on a real tap. Never on load, never on the reveal, never on untick.
 *   A page that makes noise at someone who did not touch it is the single
 *   fastest way to get muted permanently.
 * - Never throws. AudioContext is blocked outright in some browsers and in
 *   low-power mode; a decoration must not take a tap with it.
 * - Quiet enough to be missed. If it is loud enough to notice on the second
 *   tick, it is too loud.
 */

let ctx = null

function audio() {
  if (ctx) return ctx
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
    return ctx
  } catch {
    return null
  }
}

/**
 * A short, soft wooden click — a triangle blip with a fast decay.
 *
 * ⚠️ The decay does the work. A tone with a slow release reads as a
 * notification, which is a thing being done TO you. A fast one reads as a
 * physical tick, which is a thing you just did.
 */
export function tick() {
  try {
    const ac = audio()
    if (!ac) return
    // Safari suspends the context until a gesture resumes it; this runs inside
    // a click handler, so this is the moment it is allowed to.
    if (ac.state === 'suspended') ac.resume().catch(() => {})

    const now = ac.currentTime
    const osc = ac.createOscillator()
    const gain = ac.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(660, now)
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.06)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13)

    osc.connect(gain).connect(ac.destination)
    osc.start(now)
    osc.stop(now + 0.14)
  } catch {
    // Decoration. Never let it reach the caller.
  }
}

/** Haptic where the device has one, silent everywhere else. */
export function buzz() {
  try {
    navigator.vibrate?.(12)
  } catch {
    /* not available, and not worth knowing about */
  }
}
