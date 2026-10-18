import { useMemo, useState } from 'react'
import { shareDraft } from '../../lib/wayout/shareText'

/**
 * ⭐ "Send this to someone" (17 Oct 2026). A draft from their three move
 * titles with every money figure already out, in a box they edit. Nothing is
 * published and nothing leaves until they press the button. See shareText.js.
 * ⚠️ No dashes; never "it" for the product; no talk of earning money here.
 */
export default function ShareCard({ map }) {
  const draft = useMemo(() => shareDraft(map), [map])
  const [text, setText] = useState(draft)
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
      <span className="wayout__offerkick">Know someone who feels stuck too?</span>
      <p>Send them your three moves. Only what is in this box goes, and none of your numbers are in it. Change anything you like first.</p>
      <textarea className="wayout__handoffbox" rows={7} value={text} maxLength={1200} onChange={e => setText(e.target.value)} />
      <button type="button" className="wayout__again" disabled={text.trim().length < 3} onClick={send}>Send to someone</button>
      {msg && <p role="status">{msg}</p>}
    </aside>
  )
}
