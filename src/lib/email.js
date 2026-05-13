import { supabase } from './supabase'

/**
 * Transactional email helpers — thin wrappers around the `send-email` Edge
 * Function. Browser callers never hit Resend directly (no API key in the
 * bundle) and never pass arbitrary subject/HTML (the Edge Function only
 * accepts named templates, server-rendered).
 *
 * Every helper here is FIRE-AND-FORGET by design:
 *   - If the email fails (Resend down, address bounces, env vars missing),
 *     the user's primary action (adding a staff member, assigning a task)
 *     should still succeed. The owner can resend manually if needed.
 *   - Errors are surfaced via console.warn so they show up in dev tools
 *     without interrupting the flow.
 *
 * If a caller ever needs to block on send success (e.g. a "send invite +
 * confirm to the user it landed" flow), they can `await` the helper and
 * check the resolved { ok, error } shape — but don't reach for that
 * pattern lightly. Failing the user's action because of an email blip is
 * almost always the wrong tradeoff.
 */

/**
 * Send the welcome email to a freshly-added staff member.
 * Returns { ok: true, id } on success, { ok: false, error } on failure.
 *
 * Skips entirely if no email address is provided — the staff_members table
 * allows email-less rows for cash-only / in-person crews.
 */
export async function sendStaffWelcome({ to, staffName, companyName, ownerName }) {
  if (!to) return { ok: false, error: 'no_email' }
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      method: 'POST',
      body: {
        template: 'staff-welcome',
        to,
        data: { staffName, companyName, ownerName },
      },
    })
    if (error)        return logAndReturn('staff-welcome', error.message)
    if (data?.error)  return logAndReturn('staff-welcome', data.error)
    return { ok: true, id: data?.id ?? null }
  } catch (err) {
    return logAndReturn('staff-welcome', err?.message ?? String(err))
  }
}

/**
 * Notify a staff member that they've been assigned a work order. The email
 * contains a magic-link to /staff/{token} so they can open the task on
 * their phone without logging in.
 *
 * Only call for STAFF assignees (rows from staff_members table). Don't call
 * for profile-user assignees — they'll see assignments when they log in,
 * and they have no row in staff_members to mint a token against.
 */
export async function sendTaskAssigned({
  to,
  staffId,
  staffName,
  ownerName,
  companyName,
  taskTitle,
  taskDescription,
  priority,
  dueDate,
}) {
  if (!to)      return { ok: false, error: 'no_email' }
  if (!staffId) return { ok: false, error: 'no_staff_id' }
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      method: 'POST',
      body: {
        template: 'task-assigned',
        to,
        data: {
          staffId,
          staffName,
          ownerName,
          companyName,
          taskTitle,
          taskDescription,
          priority,
          dueDate,
        },
      },
    })
    if (error)       return logAndReturn('task-assigned', error.message)
    if (data?.error) return logAndReturn('task-assigned', data.error)
    return { ok: true, id: data?.id ?? null }
  } catch (err) {
    return logAndReturn('task-assigned', err?.message ?? String(err))
  }
}

function logAndReturn(template, msg) {
  console.warn(`[email] ${template} failed:`, msg)
  return { ok: false, error: msg }
}
