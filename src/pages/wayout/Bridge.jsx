/**
 * A quiet pointer to Eliv8 OS — never a switch. Wording and the rules for when
 * it may appear live in lib/bridges.js. `onClose` makes it dismissible (in the
 * app); on public pages it simply sits under the answer.
 */
export default function Bridge({ kicker, text, label, href, onClose }) {
  return (
    <aside className="wayout__bridge wayout__r">
      {onClose && (
        <button type="button" className="wayout__bridgex" aria-label="Close" onClick={onClose}>×</button>
      )}
      <span className="wayout__offerkick">{kicker}</span>
      <p>{text}</p>
      <a href={href} target="_blank" rel="noopener">{label} →</a>
    </aside>
  )
}
