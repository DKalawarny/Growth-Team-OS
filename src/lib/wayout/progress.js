import { DIAGNOSTIC_QUESTIONS } from '../../content/wayoutDiagnostic'
import { WAYOUT_TOTAL_SCREENS } from '../../content/wayoutIntake'

/**
 * ⭐ ONE BAR FOR THE WHOLE JOURNEY.
 *
 * The taps and the questions each had their own bar, so it filled to 100% on
 * the sixth tap and started again from nothing on the next screen. Daniel wants
 * a bar that shows somebody they are nearly there; a bar that empties itself
 * half way says the opposite.
 *
 * ⚠️ Counted in SCREENS, and nothing is weighted. The taps are quick, so the bar
 * moves fast early on its own; a bar that was tuned to flatter would be the
 * page lying about how much is left.
 *
 * The units: the taps, the opening sentence, the question screens, the open box.
 */
const TAPS = DIAGNOSTIC_QUESTIONS.length
const TOTAL = TAPS + 1 + WAYOUT_TOTAL_SCREENS + 1

const pct = n => `${Math.min(100, Math.max(0, (n / TOTAL) * 100))}%`

/** `step` is the tap being answered, 0-based; pass TAPS for the result. */
export const tapProgress = step => pct(step)

/** `step` is the intake's own: 0 the opening, 1..N the screens, N+1 the open box. */
export const intakeProgress = step => pct(TAPS + step)

export const TAP_COUNT = TAPS
