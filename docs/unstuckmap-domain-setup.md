# Unstuck Map — pointing getunstuckmap.com, step by step

Two separate jobs in the same GoDaddy zone. **Do them in this order** — the
email one has an ordering trap that breaks silently.

Verified 25 Sep, so the targets below are current, not remembered:
`eliv8os.com A → 75.2.60.5` · `www.eliv8os.com CNAME → fabulous-boba-bd78c9.netlify.app`

---

## Job 1 — the site (getunstuckmap.com serves the app)

### 1. Netlify — add BOTH hostnames

Site **fabulous-boba-bd78c9** → **Domain management** → **Add a domain alias**:

- `getunstuckmap.com`
- `www.getunstuckmap.com`

🔴 **ADD THE www ONE EXPLICITLY.** Netlify only auto-redirects the www of the
PRIMARY domain. When leadeos.com was demoted to an alias in August its www
partner silently came off the domain list, the certificate reissued without it,
and every visitor to `www.leadeos.com` got a **full-page browser security
warning** — worse than a dead domain, because it reads as compromised.

### 2. GoDaddy — DNS for getunstuckmap.com

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `75.2.60.5` | 600 |
| CNAME | `www` | `fabulous-boba-bd78c9.netlify.app` | 600 |

🔴 **IF THE A RECORD'S EDIT AND DELETE ICONS ARE GREYED OUT, LOOK FOR DOMAIN
FORWARDING BEFORE ANYTHING ELSE.** GoDaddy locks the apex records while a
forwarding rule owns them. That is exactly what made eliv8os.com send every
visitor to a "coming soon" page for a day, and the greyed-out icons were the
only visible sign — the forwarding tab itself looked innocent.

### 3. Expect a 404 for a while, and know what it means

⚠️ **A VERIFIED DOMAIN WITH A VALID CERTIFICATE CAN STILL 404**, and waiting does
not fix it. It happened on eliv8os.com for ~20 minutes. The tell is in the
response HEADERS, not the status code:

```
working  →  server: Netlify   x-nf-request-id: …
broken   →  server: ip-10-124-4-72.us-west-2.compute.internal
```

No `server: Netlify` means the request never reached the site's edge config at
all — it hit Netlify's unmapped-domain handler. **Triggering a deploy republishes
the domain binding and fixes it in one build.**

---

## Job 2 — email (so the check-ins can actually send)

### 4. Resend — add the domain

Resend → **Domains** → **Add Domain** → `getunstuckmap.com`, region **us-east-1**.

⭐ Choose **Manual setup**, NOT "Auto configure". Auto-configure asks for standing
write access to the whole GoDaddy DNS zone via OAuth — a far bigger grant than
three records need.

### 5. GoDaddy — the three Resend records

| Type | Name | Value |
|---|---|---|
| TXT | `resend._domainkey` | the long DKIM key Resend shows |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` — priority **10** |

🔴 **RESEND TRUNCATES THE DKIM VALUE IN ITS OWN UI** with a real `[…]` element,
so a screenshot AND a copy of the visible text both give you a corrupted string.
**The full value is in the copy button's `aria-label`.** Guessing the middle of a
DKIM key produces a record that looks right and never verifies.

⚠️ Pending for ~25 minutes is normal at GoDaddy. It is not a fault. Wait.

### 6. ONLY once Resend says Verified

```
supabase secrets set WAYOUT_EMAIL_FROM="Unstuck Map <hello@getunstuckmap.com>"
```

🔴 **ORDER IS NOT OPTIONAL.** Resend refuses to send from an unverified domain,
so setting this early breaks every check-in with nothing in any UI saying why.

⚠️ `hello@` is a SENDING identity only — nothing receives there. A person who
hits reply reaches a black hole. Same open gap as `support@eliv8os.com`; one
mailbox closes both, and it needs an apex MX which is why Resend's "Enable
Receiving" is left OFF (it would occupy the apex MX and collide).

---

## Then tell me, and I check all of it

From the command line, without needing any login:

- DNS resolving at GoDaddy's own nameservers **and** at 8.8.8.8 / 1.1.1.1
- The certificate's **SANs per hostname** — not the chain. ⚠️ `openssl` reports
  "Verify return code: 0 (ok)" for a wrong-hostname certificate because it
  validates the CHAIN, not the NAME. Listing the SANs is the only check that
  caught the leadeos bug.
- Whether the redirects fire (`/` → `/wayout`, www → apex)
- Whether the deploy actually bound the domain (the `server:` header above)
- The Resend records, by querying `resend._domainkey.getunstuckmap.com` directly
  rather than the apex — ⚠️ querying the wrong record is how I once reported a
  DKIM as missing when it was there all along
