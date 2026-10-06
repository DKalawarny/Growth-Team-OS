import { useState } from 'react'
import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { Confirm } from './PlanThread'
import { supabase } from '../../lib/supabase'
import { clearDraft } from '../../lib/wayout/draft'
import { humanError } from '../../lib/wayout/humanError'
import { WAYOUT_BASE, WAYOUT_NAME } from '../../lib/wayout/brand'

/**
 * ⭐⭐ YOUR DATA — download it, or delete it, yourself.
 *
 * 3 Oct 2026: both used to be an email to a mailbox that does not exist.
 * Privacy law expects a person to be able to get a copy of what is held about
 * them and to have it deleted; buttons make both real.
 * ⚠️ Delete goes through wayout-delete, which removes every Unstuck Map plan
 * and keeps the login only if it also runs an Eliv8 business (one login is
 * shared between the two products).
 */
export default function Account() {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null)

  async function download() {
    setBusy('download'); setErr('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: sessions, error: e1 }, { data: playbooks, error: e2 }] = await Promise.all([
        supabase.from('wayout_sessions').select('*').eq('user_id', user.id),
        supabase.from('wayout_playbooks').select('*').eq('user_id', user.id),
      ])
      if (e1 || e2) throw new Error((e1 || e2).message)
      const file = new Blob([JSON.stringify({
        exported_at: new Date().toISOString(), email: user.email, plans: sessions ?? [], walkthroughs: playbooks ?? [],
      }, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file)
      a.download = `unstuck-map-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy('')
    }
  }

  async function remove() {
    setAsking(false); setBusy('delete'); setErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wayout-delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: '{}',
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || 'That did not go through.')
      clearDraft()
      if (!out.keptLogin) await supabase.auth.signOut()
      setDone(out)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy('')
    }
  }

  if (done) {
    return (
      <WayoutShell title="Deleted" home>
        <p className="wayout__q">Your plans are deleted.</p>
        <p className="wayout__lead">
          {done.keptLogin
            ? 'Every Unstuck Map plan, version and walkthrough is gone. Your login stays, because it also runs your Eliv8 OS business, that was not touched.'
            : `Every plan, version and walkthrough is gone, and so is your account. Thank you for using ${WAYOUT_NAME}.`}
        </p>
      </WayoutShell>
    )
  }

  return (
    <WayoutShell title="Your data" wide>
      <p className="wayout__crumb"><Link to={`${WAYOUT_BASE}/plan`}>← Your plan</Link></p>
      <h1 className="wayout__pageh1">Your data</h1>
      <p className="wayout__lead">Everything you have told {WAYOUT_NAME} is yours. Take a copy, or delete it.</p>

      <section className="wayout__legalsec">
        <h2 className="wayout__situationh">Download a copy</h2>
        <p className="wayout__lead">Your answers, every version of your plan, and your walkthroughs, in one file.</p>
        <button type="button" className="wayout__btn wayout__btn--quiet wayout__btnauto" onClick={download} disabled={Boolean(busy)}>
          {busy === 'download' ? 'Preparing…' : 'Download my data'}
        </button>
      </section>

      <section className="wayout__legalsec">
        <h2 className="wayout__situationh">Delete everything</h2>
        <p className="wayout__lead">Your plans, versions, notes and walkthroughs are deleted for good. This cannot be undone.</p>
        <button type="button" className="wayout__btn wayout__btn--danger wayout__btnauto" onClick={() => setAsking(true)} disabled={Boolean(busy)}>
          {busy === 'delete' ? 'Deleting…' : 'Delete my account'}
        </button>
      </section>

      {err && <p className="wayout__error">{humanError(err)}</p>}

      <Confirm
        open={asking}
        title="Delete everything?"
        body="Every plan, version, note and walkthrough is deleted for good. Download a copy first if you might want it."
        yes="Delete it all"
        onYes={remove}
        onNo={() => setAsking(false)}
      />
    </WayoutShell>
  )
}
