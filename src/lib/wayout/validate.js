/**
 * The way out — field validation.
 *
 * ⚠️ Lives apart from fields.jsx on purpose: a module that exports both React
 * components and plain helpers breaks Fast Refresh, so every keystroke in the
 * intake would remount the form and lose the answer being typed.
 */

/**
 * Is a required field answered?
 *
 * ⚠️ An empty array, an empty string and a whitespace-only string all count as
 * unanswered — a required free text satisfied by a space is a required field
 * that does nothing.
 */
export function isAnswered(field, value) {
  if (!field.required) return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return true
  return value != null
}
