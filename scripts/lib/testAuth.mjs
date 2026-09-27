/**
 * ONE test account, reused by every audit script, forever.
 *
 * 🔴 WHY THIS EXISTS. Each audit script used to sign up a fresh
 * `something-${Date.now()}@example.com` on every run. By 26 Sep that had put
 * EIGHTEEN test accounts into the production auth table against seven real ones
 * — the audits were the majority of the user base. Cleaning up afterwards is the
 * wrong fix because it has to be remembered; not creating them is the right one.
 *
 * ⭐⭐ THE ACCOUNT IS FIXED, SO SIGN IN FIRST AND ONLY SIGN UP IF THAT FAILS.
 * After the first ever run there is nothing to create, so the count stops at one
 * however many times anything is audited.
 *
 * ⚠️ Deliberately NOT a secret. It holds nothing but throwaway audit sessions,
 * the password is in this file on purpose so any script can reach it without a
 * key in the environment, and it has no elevated rights — it is an ordinary user
 * exactly like the ones the audits are meant to imitate. If that ever stops
 * being true, this is the wrong mechanism.
 */
const EMAIL = 'wayout-audit@example.com'
const PASSWORD = 'Audit-Harness-12345!'

export async function auditToken(URL, KEY) {
  const auth = path => fetch(`${URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then(r => r.json())

  // ⚠️ Sign-in first. The signup path is the exception, not the rule.
  let r = await auth('token?grant_type=password')
  if (!r.access_token) {
    r = await auth('signup')
    if (!r.access_token) {
      throw new Error(`audit account unavailable: ${r.error_description || r.msg || JSON.stringify(r).slice(0, 200)}`)
    }
    // ⚠️ Only a brand-new account needs the personal-account bootstrap; calling
    // it again on every run would be a wasted write, not a correctness bug.
    await fetch(`${URL}/rest/v1/rpc/bootstrap_personal_account`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${r.access_token}`, 'Content-Type': 'application/json' },
      body: '{}',
    })
  }
  return r.access_token
}
