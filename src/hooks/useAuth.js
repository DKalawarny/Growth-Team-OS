import { useEffect, useState } from 'react'
import { identify } from '../lib/monitoring'
import { supabase } from '../lib/supabase'
import { getAdvisorMemberships } from '../lib/invites'

/**
 * Central auth hook. Resolves the Supabase session plus the caller's
 * profile + company row so route guards and pages can rely on a single
 * source of truth.
 *
 * Advisor mode:
 *   When an advisor calls enterClient(companyId), this hook overrides the
 *   active company_id used by all queries. Every page that reads
 *   profile.company_id automatically sees the client's company instead.
 *   exitClient() returns to the advisor's own workspace (or portal).
 *
 * Returned shape:
 *   session          — Supabase session (null if signed out, undefined while loading)
 *   profile          — public.profiles row (with company_id possibly overridden)
 *   company          — public.companies row matching the active company_id
 *   role             — profile.role shortcut
 *   loading          — true while resolving
 *   isAdvisor        — true if the user has any advisor memberships
 *   advisorClients   — array of { member_id, company_id, company_name }
 *   activeClientId   — company_id of the client currently being viewed (null = own)
 *   enterClient(id)  — switch into a client's workspace (read-only)
 *   exitClient()     — return to advisor portal
 *   refresh          — manual refetch
 */
export function useAuth() {
  const [session, setSession]   = useState(undefined)
  const [onboarded, setOnboarded] = useState(undefined)  // undefined = not yet known
  const [profile, setProfile]   = useState(undefined)
  const [company, setCompany]   = useState(undefined)

  // Advisor state
  const [advisorClients, setAdvisorClients] = useState([])
  const [activeClientId, setActiveClientId] = useState(null) // null = own workspace

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session) fetchProfileAndCompany(data.session.user.id)
      else { setProfile(null); setCompany(null) }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
        if (nextSession) fetchProfileAndCompany(nextSession.user.id)
        else { setProfile(null); setCompany(null); setAdvisorClients([]); setActiveClientId(null) }
      }
    )

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  async function fetchProfileAndCompany(userId) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    setProfile(profileRow ?? null)

    if (!profileRow) { setCompany(null); return }

    // Fetch own company, advisor memberships, and whether onboarding was
    // actually completed — all in parallel.
    //
    // ⚠️ `onboarded` asks a narrow question on purpose: does a business_profiles
    // row exist? Having a PROFILE was previously treated as proof of setup, but
    // the profile is created at signup and the business profile at the END of
    // onboarding. Anyone who closed the tab midway had one and not the other,
    // landed on an empty dashboard forever with nothing prompting them to
    // finish, and got a Solomon who knew almost nothing about their business.
    // Thin answers, and the reasonable conclusion that the product is shallow.
    //
    // head:true means no rows come back — this costs a count, not a payload.
    const [companyRes, memberships, bpRes] = await Promise.all([
      supabase
        .from('companies')
        .select('*')
        .eq('id', profileRow.company_id)
        .maybeSingle(),
      getAdvisorMemberships(userId).catch(() => []),
      // ⚠️ A PLAIN SELECT, NOT head:true.
      //
      // This was `.select('company_id', { count: 'exact', head: true })`, which
      // issues an HTTP HEAD. Against this project HEAD returns 503, and
      // supabase-js surfaces that as { count: null, error: null } — no error to
      // catch. So the fail-open branch never fired, (null ?? 0) > 0 evaluated
      // false, and EVERY signed-in user was redirected into onboarding.
      // Caught by loading the app, not by reading the code: it builds, it runs,
      // and it silently means "nobody has onboarded".
      supabase
        .from('business_profiles')
        .select('company_id')
        .eq('company_id', profileRow.company_id)
        .limit(1),
    ])

    // Tag the session so a report answers "one customer or everybody".
    // ID and company only — see lib/monitoring.js for what is withheld.
    identify({ userId, companyId: profileRow.company_id })

    setCompany(companyRes.data ?? null)
    setAdvisorClients(memberships)
    // Fail OPEN on anything that is not a clear negative. Wrongly forcing
    // someone who HAS finished back through setup is far worse than missing a
    // prompt — and "not a clear negative" now covers a null/absent payload,
    // which is exactly the case the count version got wrong.
    setOnboarded(
      bpRes.error || !Array.isArray(bpRes.data) ? true : bpRes.data.length > 0,
    )
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession()
    if (data.session) await fetchProfileAndCompany(data.session.user.id)
  }

  // When an advisor switches into a client's workspace, load the client's
  // company row and store it. The overridden profile is passed to every page.
  async function enterClient(companyId) {
    setActiveClientId(companyId)
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle()
    setCompany(data ?? null)
  }

  function exitClient() {
    if (!profile) return
    setActiveClientId(null)
    // Restore own company
    supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .maybeSingle()
      .then(({ data }) => setCompany(data ?? null))
  }

  const loading =
    session === undefined
    || (session && (profile === undefined || company === undefined))

  // When in advisor mode, override company_id in the profile so every page
  // that reads profile.company_id transparently queries the client's data.
  const effectiveProfile = activeClientId && profile
    ? { ...profile, company_id: activeClientId }
    : profile

  const isAdvisor = advisorClients.length > 0

  return {
    session,
    onboarded,
    profile: effectiveProfile,
    company,
    role:           profile?.role ?? null,
    loading,
    isAdvisor,
    advisorClients,
    activeClientId,
    enterClient,
    exitClient,
    refresh,
  }
}
