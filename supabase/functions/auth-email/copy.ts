/**
 * The words in every auth email, for both products.
 *
 * ⚠️ NO PRODUCT NAME IN THE BODY. The sender line already carries it, from
 * WAYOUT_EMAIL_FROM or RESEND_FROM, so the name lives in one place per product
 * and a rename never has to find this file.
 *
 * ⚠️ Plain and short, no dashes, nothing that could only have come from a
 * template. It is a link somebody asked for; it should read like that.
 *
 * ⚠️ Pure, so the copy test can sweep every action type.
 */

export type ActionType =
  | 'recovery' | 'magiclink' | 'signup' | 'invite'
  | 'email_change' | 'email' | 'reauthentication'

export interface Composed { subject: string; lead: string; button: string; ignore: string }

export function compose(type: string, brand: 'unstuck' | 'eliv8'): Composed {
  const ignore = 'If you did not ask for this, you can ignore this email. Nothing changes until the link is used.'
  switch (type) {
    case 'recovery':
      return {
        subject: 'Your link to set a new password',
        lead: brand === 'unstuck'
          ? 'Here is the link to set a new password. Your plan is exactly where you left it.'
          : 'Here is the link to set a new password.',
        button: 'Set a new password',
        ignore,
      }
    case 'magiclink':
      return { subject: 'Your sign in link', lead: 'Here is the link to sign in. It works once.', button: 'Sign in', ignore }
    case 'signup':
    case 'email':
      return { subject: 'Confirm your email', lead: 'One tap to confirm this is your email.', button: 'Confirm my email', ignore }
    case 'invite':
      return {
        subject: 'You have been invited',
        lead: 'You have been invited in. Use the link to set up your account.',
        button: 'Accept the invite',
        ignore: 'If you were not expecting this, you can ignore it.',
      }
    case 'email_change':
      return { subject: 'Confirm your new email', lead: 'Use the link to confirm the change of email on your account.', button: 'Confirm the change', ignore }
    case 'reauthentication':
      return { subject: 'Your confirmation code', lead: 'Here is the code to confirm it is you.', button: '', ignore }
    default:
      return { subject: 'Your sign in link', lead: 'Here is your link.', button: 'Open', ignore }
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Text and HTML bodies. `code` is shown only when there is no link (reauthentication). */
export function render(c: Composed, link: string | null, code: string | null) {
  const action = link ? `${c.button}:\n${link}` : `Your code: ${code ?? ''}`
  const text = `Hi,\n\n${c.lead}\n\n${action}\n\n${c.ignore}\n`
  const actionHtml = link
    ? `<p><a href="${esc(link)}" style="display:inline-block;padding:10px 18px;background:#1f2a24;color:#fff;border-radius:6px;text-decoration:none">${esc(c.button)}</a></p>`
      + `<p style="color:#667;font-size:13px">Or paste this into your browser:<br>${esc(link)}</p>`
    : `<p style="font-size:22px;letter-spacing:3px"><b>${esc(code ?? '')}</b></p>`
  const html = `<p>Hi,</p><p>${esc(c.lead)}</p>${actionHtml}<p style="color:#667;font-size:13px">${esc(c.ignore)}</p>`
  return { text, html }
}
