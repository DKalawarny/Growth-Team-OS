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

/**
 * How each product's email is dressed. Colours are written out because an
 * email cannot read the site's stylesheet (src/pages/wayout/wayout.css).
 * ⚠️ The icon is a picture of the mark, not the name, so the rule at the top
 * of this file still holds.
 */
const LOOK = {
  unstuck: {
    page: '#F5F1E6', card: '#FFFDF8', line: '#E4DECB', ink: '#23301F', soft: '#5F6956',
    button: '#2F7D4F', icon: 'https://getunstuckmap.com/icon-unstuckmap-192.png',
  },
  eliv8: {
    page: '#F3F4F2', card: '#FFFFFF', line: '#E1E4DF', ink: '#1F2A24', soft: '#5C665F',
    button: '#1F2A24', icon: '',
  },
}

/** Text and HTML bodies. `code` is shown only when there is no link (reauthentication). */
export function render(c: Composed, link: string | null, code: string | null, brand: 'unstuck' | 'eliv8' = 'eliv8') {
  const action = link ? `${c.button}:\n${link}` : `Your code: ${code ?? ''}`
  const text = `${c.lead}\n\n${action}\n\n${c.ignore}\n`
  const k = LOOK[brand]
  const font = `font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`
  const actionHtml = link
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 26px"><tr>`
      + `<td style="background:${k.button};border-radius:10px">`
      + `<a href="${esc(link)}" style="display:inline-block;padding:15px 34px;${font};font-size:17px;font-weight:600;color:#ffffff;text-decoration:none">${esc(c.button)}</a>`
      + `</td></tr></table>`
      + `<p style="margin:0 0 6px;${font};font-size:13px;line-height:1.5;color:${k.soft}">If the button does not work, copy this into your browser:</p>`
      + `<p style="margin:0 0 26px;${font};font-size:12px;line-height:1.5;color:${k.soft};word-break:break-all">${esc(link)}</p>`
    : `<p style="margin:0 0 26px;${font};font-size:30px;letter-spacing:6px;font-weight:700;color:${k.ink}">${esc(code ?? '')}</p>`
  const icon = k.icon
    ? `<img src="${k.icon}" width="44" height="44" alt="" style="display:block;border:0;border-radius:10px;margin:0 0 22px">`
    : ''
  const html = `<div style="margin:0;padding:32px 16px;background:${k.page}">`
    + `<table role="presentation" align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:${k.card};border:1px solid ${k.line};border-radius:14px">`
    + `<tr><td style="padding:34px 32px 28px">`
    + icon
    + `<h1 style="margin:0 0 12px;${font};font-size:24px;line-height:1.25;font-weight:700;color:${k.ink}">${esc(c.subject)}</h1>`
    + `<p style="margin:0 0 26px;${font};font-size:17px;line-height:1.5;color:${k.ink}">${esc(c.lead)}</p>`
    + actionHtml
    + `<p style="margin:0;padding-top:18px;border-top:1px solid ${k.line};${font};font-size:13px;line-height:1.5;color:${k.soft}">${esc(c.ignore)}</p>`
    + `</td></tr></table></div>`
  return { text, html }
}
