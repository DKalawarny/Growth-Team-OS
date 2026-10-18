import { useEffect, useState } from 'react'
import { shareDraft } from '../../lib/wayout/shareText'
import { mainInviteCode, inviteUrl } from '../../lib/wayout/invites'

/**
 * ⭐ "Send this to someone" (17 Oct 2026). A draft from their three move
 * titles with every money figure already out, in a box they edit. Nothing is
 * published and nothing leaves until they press the button. See shareText.js.
 * ⚠️ No dashes; never "it" for the product; no talk of earning money here.
 */
export default function ShareCard({ map, movesDone = 0 }) {
  const [text, setText] = useState(() => shareDraft(map))
  const [edited, setEdited] = useState(false)

  // ⭐ Their own link, so a friend who joins shows up on /invite. Swapped in
  // only if they have not started editing; the plain link works either way.
  useEffect(() => {
    let live = true
    mainInviteCode().then(code => {
      if (live && code && !edited) setText(shareDraft(map, inviteUrl(code)))
    })
    return () => { live = false }
  }, [map]) // eslint-disable-line react-hooks/exhaustive-deps
  const [msg, setMsg] = useState('')

  async function send() {
    setMsg('')
    try {
      if (navigator.share) { await navigator.share({ text }); return }
      await navigator.clipboard.writeText(text)
      setMsg('Copied. Paste it into a text or a message.')
    } catch (e) {
      // Closing the phone's share sheet is a choice, not a failure.
      if (e?.name !== 'AbortError') setMsg('That did not copy. You can select the text above and copy it yourself.')
    }
  }

  if (!map?.moves?.length) return null
  return (
    <aside className="wayout__bridge wayout__r">
      {/* ⭐ The best moment to ask is right after something worked: a ticked
          move is the closest thing this product has to proof. */}
      <span className="wayout__offerkick">{movesDone > 0 ? 'You got a move done. Know someone stuck where you were?' : 'Know someone who feels stuck too?'}</span>
      <p>Send them your three moves. Only what is in this box goes, and none of your numbers are in it. Change anything you like first.</p>
      <textarea className="wayout__handoffbox" rows={7} value={text} maxLength={1200} onChange={e => { setEdited(true); setText(e.target.value) }} />
      <button type="button" className="wayout__again" disabled={text.trim().length < 3} onClick={send}>Send to someone</button>
      {msg && <p role="status">{msg}</p>}
    </aside>
  )
}
