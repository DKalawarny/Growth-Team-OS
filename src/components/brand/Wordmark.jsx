/**
 * The Eliv8 OS wordmark — one component, every surface.
 *
 * Spec (Daniel, 27 Aug):
 *   Inter SemiBold 600, all caps, letter-spacing 0.035em
 *   letters  #F6F8F8 on dark, #0D1413 on light
 *   the 8    #14A67B — the only coloured character
 *
 * ⭐ WHY ONLY THE 8 IS GREEN. The old mark split "Growth" | "OS" in two colours,
 * which made sense when those were two words. Carried onto "Eliv8 OS" the same
 * split isolated "OS" — as though the category were the point rather than the
 * name. Colouring the 8 instead puts the accent on the one character that
 * carries the meaning, and leaves the name reading as a name.
 *
 * ⚠️ This lives in ONE place on purpose. It was previously copy-pasted into six
 * files as a pair of hand-coloured spans, which is exactly why the rename left
 * the logo saying GrowthOS long after every string in the codebase said
 * otherwise — there was no "the wordmark", only six lookalikes.
 *
 * ⚠️ Live text, not artwork, so it stays crisp at any size and weighs nothing.
 * That means it depends on Inter being loaded (index.html). It is deliberately
 * NOT used for the favicon or any SVG-as-image: those render sandboxed and
 * cannot fetch a font, so they would silently fall back to Arial and lose the
 * tracking. The icon is a drawn path instead — see public/favicon.svg.
 */

const FAMILY = "'Inter', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"

/**
 * @param {object}  props
 * @param {'light'|'dark'} [props.tone='light']  ground it sits on
 * @param {number}  [props.size=17]              font size in px
 * @param {boolean} [props.showOS=true]          drop " OS" where space is tight
 */
export default function Wordmark({ tone = 'light', size = 17, showOS = true, className = '' }) {
  const letters = tone === 'dark' ? '#F6F8F8' : '#0D1413'
  return (
    <span
      className={className}
      style={{
        fontFamily:    FAMILY,
        fontWeight:    600,
        fontSize:      size,
        letterSpacing: '0.035em',
        lineHeight:    1,
        color:         letters,
        whiteSpace:    'nowrap',
        // Inter's caps sit slightly high in a flex row; this keeps the wordmark
        // optically centred against an icon beside it rather than measurably so.
        display:       'inline-block',
      }}
    >
      ELIV<span style={{ color: '#14A67B' }}>8</span>{showOS ? ' OS' : ''}
    </span>
  )
}

/**
 * The 8 alone — app icon, favicon, anywhere the full name will not fit.
 *
 * Drawn as two stroked rings rather than set as type: this has to survive
 * contexts where no font can load, and at 16px a stroked pair of loops holds
 * its counters where a filled glyph closes up into a blob.
 */
export function Mark({ size = 26, tone = 'dark', title = 'Eliv8 OS' }) {
  const ground = tone === 'dark' ? '#0D1413' : '#F6F8F8'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={title}>
      <rect width="48" height="48" rx="11" fill={ground} />
      <circle cx="24" cy="18.2" r="7.2" fill="none" stroke="#14A67B" strokeWidth="4.4" />
      <circle cx="24" cy="32.2" r="8.9" fill="none" stroke="#14A67B" strokeWidth="4.4" />
    </svg>
  )
}
