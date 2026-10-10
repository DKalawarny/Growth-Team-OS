import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Eliv8 OS] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set in .env.local')
}

/**
 * "Keep me signed in" (Daniel, 10 Oct).
 *
 * The session is kept in localStorage by default, which is what "remember me"
 * means: close the browser, come back, still signed in. When somebody UNTICKS
 * the box on the login page, the session goes in sessionStorage instead, so it
 * ends when the browser closes. That is the choice a person on a shared office
 * computer needs.
 *
 * ⚠️ No flag means remember. Every existing session was written to
 * localStorage, so anything else here would sign every current user out.
 * ⚠️ Reads look in both places, so changing the choice never strands a session.
 */
export const REMEMBER_KEY = 'eliv8:remember'
const safe = fn => { try { return fn() } catch { return null } }
const remembered = () => safe(() => localStorage.getItem(REMEMBER_KEY)) !== '0'
export function setRemember(on) { safe(() => localStorage.setItem(REMEMBER_KEY, on ? '1' : '0')) }

const sessionStore = {
  getItem:    key => safe(() => sessionStorage.getItem(key)) ?? safe(() => localStorage.getItem(key)),
  setItem:    (key, value) => {
    const [keep, drop] = remembered() ? [localStorage, sessionStorage] : [sessionStorage, localStorage]
    safe(() => keep.setItem(key, value))
    safe(() => drop.removeItem(key))
  },
  removeItem: key => { safe(() => localStorage.removeItem(key)); safe(() => sessionStorage.removeItem(key)) },
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  { auth: { storage: typeof window === 'undefined' ? undefined : sessionStore } },
)
