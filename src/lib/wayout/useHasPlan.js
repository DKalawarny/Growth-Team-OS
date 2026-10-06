import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

/**
 * ⭐ Does the person looking at this page already have a plan? Daniel, 5 Oct,
 * signed in on /why: "says start your plan on this when I'm on my plan." A
 * public page that invites somebody to start what they already have reads as
 * a page that does not know them.
 *
 * ⚠️ READ-ONLY on purpose: loadOrCreateSession would CREATE a session for a
 * signed-in visitor just for asking. Null while unknown, so callers can render
 * the stranger's version first and never flash the wrong one for long.
 */
export function useHasPlan() {
  const [has, setHas] = useState(null)
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const uid = data?.session?.user?.id
        if (!uid) { if (live) setHas(false); return }
        const { data: rows } = await supabase
          .from('wayout_sessions').select('id').eq('user_id', uid).not('map', 'is', null).limit(1)
        if (live) setHas(Array.isArray(rows) && rows.length > 0)
      } catch { if (live) setHas(false) }
    })()
    return () => { live = false }
  }, [])
  return has
}
