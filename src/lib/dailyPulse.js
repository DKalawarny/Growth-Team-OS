/**
 * dailyPulse.js — shared localStorage helpers for the daily check-in.
 *
 * Kept outside DailyPulse.jsx so advisorContext.js, tool pages, and the
 * Advisor chat can all read today's note and feed it to Claude — without
 * importing the React component.
 *
 * Storage key: gos_pulse_<userId>_<YYYY-MM-DD>
 * Value:       'dismissed'  → user skipped today
 *              anything else → the text they entered (shown as Today's Focus)
 */

export function todayPulseKey(userId) {
  const d = new Date()
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
  return `gos_pulse_${userId}_${date}`
}

/**
 * Returns today's pulse text for this user, or null if they haven't
 * filled one in yet (or dismissed it).
 */
export function getTodaysPulse(userId) {
  if (!userId) return null
  try {
    const val = localStorage.getItem(todayPulseKey(userId))
    return (val && val !== 'dismissed') ? val : null
  } catch {
    return null
  }
}

/**
 * Persist today's pulse response.
 * Pass 'dismissed' to mark as skipped without a response.
 */
export function setTodaysPulse(userId, value) {
  if (!userId) return
  try {
    localStorage.setItem(todayPulseKey(userId), value)
  } catch { /* storage blocked — silently ignore */ }
}
