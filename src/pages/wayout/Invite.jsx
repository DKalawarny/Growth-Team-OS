import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import {
  myInvites, mainInviteCode, createInvite, deleteInvite, inviteUrl, inviteTotals, friendStage,
  myReferral, answerReferral, claimInvite,
} from '../../lib/wayout/invites'

/**
 * ⭐ The people you invited (17 Oct 2026). Daniel: "a dashboard would be great
 * for everyone who has invited people, it makes it exciting: who's joined,
 * who's earning, who hasn't signed up yet".
 *
 * 🔴 A friend's name shows only when that friend said yes (InviteConsent.jsx).
 * Otherwise they are "Someone", which still shows how far they got.
 * ⚠️ No promise of a percentage here yet: the referral terms wait for the
 * company and a lawyer (pricing.js REFERRAL). "A share" until then.
 * ⚠️ Never framed as a way to make money. No dashes in copy.
 */
export default function Invite() {
  const [invites, setInvites] = useState(null)
  const [error, setError] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [ref, setRef] = useState(null)

  const load = useCallback(async () => {
    try {
      // A friend can land here before ever opening their plan; credit them now.
      await claimInvite()
      await mainInviteCode()
      const [list, r] = await Promise.all([myInvites(), myReferral()])
      setInvites(list); setRef(r)
    } catch (e) { setError(e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  async function make(e) {
    e.preventDefault()
    if (!label.trim()) return
    setBusy(true); setNote('')
    try {
      const code = await createInvite(label.trim())
      setLabel('')
      await load()
      await send(code, `Link for ${label.trim()} is ready.`)
    } catch (err) { setNote(err.message) }
    finally { setBusy(false) }
  }

  async function send(code, done = '') {
    const url = inviteUrl(code)
    try {
      if (navigator.share) { await navigator.share({ text: 'This helped me sort out what to do next. Yours is free:', url }); return }
      await navigator.clipboard.writeText(url)
      setNote(`${done} Link copied. Paste it into a text or a message.`.trim())
    } catch (e) {
      if (e?.name !== 'AbortError') setNote(`${done} Copy this link: ${url}`.trim())
    }
  }

  async function remove(code, name) {
    if (!window.confirm(`Delete the link for ${name}? Anyone who joined from it stops showing here.`)) return
    try { await deleteInvite(code); await load() } catch (e) { setNote(e.message) }
  }

  async function changeShow(show) {
    try { await answerReferral(show); setRef({ ...ref, show, answered: true }) } catch (e) { setNote(e.message) }
  }

  if (error) return <WayoutShell><p className="wayout__lead">{error}</p></WayoutShell>
  if (!invites) return <WayoutShell wide><p className="wayout__lead">One moment.</p></WayoutShell>

  const totals = inviteTotals(invites)
  const main = invites.find(i => i.is_main)
  const people = invites.filter(i => !i.is_main)

  return (
    <WayoutShell title="People you invited" wide>
      <p className="wayout__crumb"><Link to={`${WAYOUT_BASE}/plan`}>← Back to your plan</Link></p>
      <h1 className="wayout__bigq">People you invited.</h1>
      <p className="wayout__lead">Know someone who feels stuck? Send them a link. You will see here who opened it, who joined and who made a plan.</p>

      <div className="wayout__invstats">
        {[['Opened your links', totals.opened], ['Joined', totals.joined], ['Made a plan', totals.plans], ['Paying', totals.paying]].map(([k, v]) => (
          <div key={k} className="wayout__invstat"><b>{v}</b><span>{k}</span></div>
        ))}
      </div>

      <section className="wayout__invcard">
        <span className="wayout__label">What you have earned</span>
        <p className="wayout__invearn"><b>$0</b></p>
        <p className="wayout__invfine">Nobody pays for anything yet. When the step by step help opens for payment, you will get a share of what each person you invited pays, for as long as they keep paying. The details will be here first.</p>
      </section>

      {main && (
        <section className="wayout__invcard">
          <span className="wayout__label">Your link</span>
          <p className="wayout__invlink">{inviteUrl(main.code)}</p>
          <p className="wayout__invfine">Post it anywhere, or send it to anyone. Opened {main.opened} {main.opened === 1 ? 'time' : 'times'}.</p>
          <button type="button" className="wayout__again" onClick={() => send(main.code)}>Send your link</button>
          <Friends list={main.friends} />
        </section>
      )}

      <section className="wayout__invcard">
        <span className="wayout__label">A link for one person</span>
        <p className="wayout__invfine">Give each person their own link and you will see who has joined and who has not yet. The name is only for you. They never see it.</p>
        <form className="wayout__invform" onSubmit={make}>
          <input className="wayout__input" value={label} maxLength={40} placeholder="Mom, Jay from work" aria-label="Who is this link for?" onChange={e => setLabel(e.target.value)} />
          <button type="submit" className="wayout__again" disabled={busy || !label.trim()}>Make their link</button>
        </form>
        {note && <p role="status">{note}</p>}
      </section>

      {people.map(i => (
        <section key={i.code} className="wayout__invcard">
          <span className="wayout__label">{i.label}</span>
          <p className="wayout__invfine">
            {i.friends.length ? null : (i.opened ? 'Opened your link, has not joined yet.' : 'Has not opened the link yet.')}
          </p>
          <Friends list={i.friends} />
          <div className="wayout__invitebtns">
            <button type="button" className="wayout__again" onClick={() => send(i.code)}>Send again</button>
            <button type="button" className="wayout__again" onClick={() => remove(i.code, i.label)}>Delete</button>
          </div>
        </section>
      ))}

      {ref && (
        <section className="wayout__invcard">
          <span className="wayout__label">{ref.from ? `${ref.from} sent you here` : 'Someone sent you here'}</span>
          <p className="wayout__invfine">
            {ref.show ? `${ref.from || 'They'} can see your first name and whether you have made a plan.` : 'They cannot see that you joined.'}
          </p>
          <button type="button" className="wayout__again" onClick={() => changeShow(!ref.show)}>
            {ref.show ? 'Keep it private instead' : 'Let them see'}
          </button>
        </section>
      )}
    </WayoutShell>
  )
}

function Friends({ list = [] }) {
  if (!list.length) return null
  return (
    <ul className="wayout__invfriends">
      {list.map((f, n) => (
        <li key={n}>
          <span>{f.name || (f.shared ? 'A friend' : 'Someone')}{f.name ? '' : <em>{f.shared ? ' (no name yet)' : ' (kept private)'}</em>}</span>
          <b>{friendStage(f)}</b>
        </li>
      ))}
    </ul>
  )
}
