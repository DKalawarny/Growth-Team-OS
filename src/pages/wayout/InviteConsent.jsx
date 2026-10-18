import { useEffect, useState } from 'react'
import { myReferral, answerReferral } from '../../lib/wayout/invites'

/**
 * ⭐ Asked once, of someone who joined from a friend's link: may that friend
 * see that you joined? Daniel chose this on 17 Oct: the friend decides. Until
 * they answer, the inviter sees only "someone".
 * ⚠️ No dashes; both answers are equally easy; "no" needs no reason.
 */
export default function InviteConsent() {
  const [ref, setRef] = useState(null)
  const [done, setDone] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    myReferral().then(r => { if (live) setRef(r) })
    return () => { live = false }
  }, [])

  async function answer(show) {
    setErr('')
    try {
      await answerReferral(show)
      setDone(show
        ? `Done. ${ref.from || 'They'} can see that you joined, and nothing else. You can change this any time from the menu.`
        : 'Done. Nobody will see that you joined.')
    } catch (e) { setErr(e.message) }
  }

  if (!ref || (ref.answered && !done)) return null
  const who = ref.from || 'the person who sent you here'
  return (
    <aside className="wayout__bridge wayout__r">
      {done ? <p role="status">{done}</p> : (
        <>
          <span className="wayout__offerkick">{ref.from ? `${ref.from} sent you here` : 'Someone sent you here'}</span>
          <p>Can {who} see that you joined? They would see your first name and whether you have made a plan. Never your answers, your numbers or your plan.</p>
          <div className="wayout__invitebtns">
            <button type="button" className="wayout__again" onClick={() => answer(true)}>Yes, they can see</button>
            <button type="button" className="wayout__again" onClick={() => answer(false)}>No, keep it private</button>
          </div>
          {err && <p role="alert">{err}</p>}
        </>
      )}
    </aside>
  )
}
