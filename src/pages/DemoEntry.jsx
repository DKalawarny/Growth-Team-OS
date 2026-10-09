import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * /demo — asks the demo-login edge function for a fresh demo session (minted
 * server-side, no credential in the browser), sets it, and drops the visitor
 * into the real app at the dashboard. See src/lib/demo.js for how the demo is
 * kept safe (edge AI block + RLS isolation + re-seedable data).
 */
export default function DemoEntry() {
  const navigate = useNavigate()
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await supabase.auth.signOut().catch(() => {})
        const url  = import.meta.env.VITE_SUPABASE_URL
        const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
        const res  = await fetch(`${url}/functions/v1/demo-login`, {
          method:  'POST',
          headers: { apikey: anon, 'content-type': 'application/json' },
        })
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok || !body.access_token) { setErr('The demo is unavailable right now.'); return }
        const { error } = await supabase.auth.setSession({
          access_token:  body.access_token,
          refresh_token: body.refresh_token,
        })
        if (error) { setErr(error.message); return }
        navigate('/dashboard', { replace: true })
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Something went wrong.')
      }
    })()
    return () => { cancelled = true }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-6">
      <div className="text-center">
        {err ? (
          <>
            <p className="text-ink-900 font-semibold mb-2">The demo could not load.</p>
            <p className="text-ink-500 text-sm">{err}</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-ink-600 text-sm">Loading the demo&hellip;</p>
          </>
        )}
      </div>
    </div>
  )
}
