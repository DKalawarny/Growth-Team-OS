# Unstuck Map — what is left before a stranger uses it

✅ **THE NAME IS SETTLED (25 Sep): Unstuck Map, at getunstuckmap.com, bought.**
It was one line in `src/lib/wayout/brand.js`, which is why landing on a name was
an edit and not a migration.

⚠️ **"Get" is the DOMAIN, not the name.** On the page it is Unstuck Map — the
same shape as Origin at useorigin.com.

⚠️ Structure: a trade name under **Eliv8 Inc. once that is incorporated**, with
Sarlia above it. 🔴 **A TRADE NAME IS A NAME, NOT A SHIELD** — the liability
protection is the corporation, not the registration. Eliv8 is not incorporated
yet, so something has to operate this during the trial and Sarlia is the only
entity that exists.

---

## What the name unblocked, and what it did not

| | |
|---|---|
| Sending domain → check-ins | **Unblocked, pending DNS** — see below |
| Situation pages | **Unblocked** — they have a home to be published at |
| Terms | **Still needed.** Naming the product does not write them |
| Which entity operates it | **Still open** — Eliv8 Inc. does not exist yet |
| Insurance posture | **Still open** — the question below |

---

## The chain that is left

**domain (done) → DNS at GoDaddy → Resend verification → `WAYOUT_EMAIL_FROM` → check-ins send**

`wayout-checkin` runs daily on cron and **refuses to send** without
`WAYOUT_EMAIL_FROM`. That refusal is deliberate: the fallback would be
`RESEND_FROM`, which is Eliv8's, and an email arriving from "Eliv8 OS" about
somebody's personal money plan is both confusing and leaks a connection they
never agreed to. Today the job runs, finds who is due, and reports the
misconfiguration instead of mailing anyone.

```
supabase secrets set WAYOUT_EMAIL_FROM="Unstuck Map <hello@getunstuckmap.com>"
```

⚠️ **ORDER MATTERS AND IT IS NOT OPTIONAL.** Resend refuses to send from an
unverified domain, so setting this before verification breaks every check-in
with nothing in any UI saying why. That exact mistake cost time on eliv8os.com
in August. Verify first, then set it.

### The DNS records Resend will ask for, at GoDaddy

Three, and they go on `getunstuckmap.com`:
`TXT resend._domainkey` (DKIM) · `TXT send` (SPF) · `MX send` (priority 10).

⭐ Choose **Manual setup**, not "Auto configure" — auto-configure wants standing
write access to the whole DNS zone via OAuth, which is a far bigger grant than
three records need.
🔴 **Resend TRUNCATES the DKIM value in its UI with a real `[…]` DOM node**, so
both a screenshot and a copy-paste of the visible text give a corrupted string.
The full value is in the copy button's `aria-label`. Guessing the middle of a
DKIM key produces a record that looks right and never verifies.
⚠️ Pending for ~25 minutes is normal at GoDaddy. It is not a fault.

### The stopgap, and it is a real one

Resend's `onboarding@resend.dev` sends **without domain verification**, but only
to the account's own address. So the whole send path — compose, gate text, the
escalation copy, opt-out, `List-Unsubscribe` — can be tested end to end against
Daniel's own inbox **today**, before any domain exists.

```
supabase secrets set WAYOUT_EMAIL_FROM="the way out <onboarding@resend.dev>"
```

⚠️ It will silently deliver nothing to anybody else. Fine for proving the
plumbing; never leave it set once a stranger has an account.

---

## Also waiting on the name

| | Why it needs the name | Urgency |
|---|---|---|
| **Terms** | Currently Eliv8's, written for a different product and a different promise. A lawyer's job. | **Before the first stranger**, not before launch |
| **Its own Supabase project** | Signup, auth and data all sit inside Eliv8 OS today | Before anything is sold |
| **Stripe** | Needs a live *recurring* price at $29 and a `wayout` branch in `stripe-webhook` writing `status='paid'` — the only thing migration 046 accepts as proof | Before charging |
| **Which entity takes the money** | Sarlia / a new BC Ltd. Not decided | Before charging |

---

## Not blocked — these can happen now

- **Real people using it.** It lives at `/wayout` on the current domain. Ugly,
  and it works. Per the strategy already settled — free map, reviews matter more
  than money right now — this is the highest-value thing available and it needs
  no name at all.
- **The second plan on completion** (the one piece of the pricing conversation
  not yet built).
- **The audit harness cleaning up its own accounts.** Every run signs up 12.
- **Collecting `wayout_worth`** — what people would have paid, and their review.
  Already live on the plan page. The pricing answer accumulates while we wait.

---

## ⚠️ The trigger nobody should be surprised by

**The first real user makes three of these urgent at once.** They finish a map,
and seven days later the check-in wants to fire and cannot. They are also the
first person to whom the terms actually apply, and the first whose data is
sitting in Eliv8's project.

So "get the name" and "get a user" are coupled more tightly than they look.
Getting a user first is still right — but the week after that is when the rest
of this list stops being a list and starts being a problem.
