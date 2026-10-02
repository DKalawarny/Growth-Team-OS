import { crisisLinesFor } from '../../lib/wayout/crisisLines'

/**
 * ⭐⭐ THE NUMBERS FOR WHERE THEY ARE, FROM A FIXED TABLE (crisisLines.js).
 * Shown under every crisis answer, whatever the model wrote above it, so the
 * right line for their country is always on screen — and when we do not know
 * their country, only things that are never wrong: the worldwide directory and
 * "your local emergency number".
 */
export default function CrisisHelp({ region }) {
  const h = crisisLinesFor(region)
  return (
    <aside className="wayout__crisishelp" aria-label="Help, right now">
      <p className="wayout__crisishead">{h.known ? `Help in ${h.country}, right now` : 'Help, right now'}</p>
      <ul>
        {h.known && (
          <li><b>If you are in danger:</b> call {h.emergency}.</li>
        )}
        {!h.known && (
          <li><b>If you are in danger:</b> call your local emergency number.</li>
        )}
        {h.lines.map(l => <li key={l.name}><b>{l.name}:</b> {l.how}.</li>)}
        <li>
          <b>Anywhere in the world:</b>{' '}
          <a href={`https://${h.directory}`} target="_blank" rel="noreferrer">{h.directory}</a> finds a free, confidential line near you.
        </li>
      </ul>
    </aside>
  )
}
