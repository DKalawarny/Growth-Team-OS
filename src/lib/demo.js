/**
 * Demo mode — a public, read-only tour of the real product.
 *
 * A visitor hits /demo and is signed into the shared "Evergreen Grounds" demo
 * account (seeded sample data) so they can click through every page of the
 * actual app. The session is minted server-side by the demo-login edge function
 * using the service role, so NO demo credential is ever shipped to the browser.
 *
 * Two things keep it safe and free:
 *   - The claude edge function refuses any AI call from this company, so Solomon
 *     is read-only here and costs nothing no matter what a visitor or bot tries.
 *   - The data is isolated to this one company by RLS and is re-seedable, so a
 *     stray edit can only touch the demo and is restored by re-running the seed.
 *
 * The id is fixed (seeded explicitly) so both the client and the edge function
 * recognise the demo company without a schema change.
 */
export const DEMO_COMPANY_ID = 'de900000-0000-4000-8000-000000000001'
export const DEMO_BUSINESS   = 'Evergreen Grounds'

export const isDemoCompany = id => id === DEMO_COMPANY_ID
