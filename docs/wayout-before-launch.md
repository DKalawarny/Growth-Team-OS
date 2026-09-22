# the way out — what the name is holding up

**The name is not a branding task. It is the first domino.** Four things are
waiting on it, and they are waiting in a chain rather than in parallel.

> `src/lib/wayout/brand.js` is the only place the user-facing name is written,
> and the rename is a one-line change by design. Everything below is what
> happens *after* that line changes — the parts that need a real domain, not
> just a real word.

---

## The chain

**name → domain → verified sending domain → `WAYOUT_EMAIL_FROM` → check-ins work at all**

`wayout-checkin` runs daily on cron and **refuses to send** without
`WAYOUT_EMAIL_FROM`. That refusal is deliberate: the fallback would be
`RESEND_FROM`, which is Eliv8's, and an email arriving from "Eliv8 OS" about
somebody's personal money plan is both confusing and leaks a connection they
never agreed to. Today the job runs, finds who is due, and reports the
misconfiguration instead of mailing anyone.

```
supabase secrets set WAYOUT_EMAIL_FROM="the way out <hello@thedomain.com>"
```

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
