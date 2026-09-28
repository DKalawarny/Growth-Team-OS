/**
 * The way out — naming.
 *
 * ⭐ THIS FILE IS THE ONLY PLACE THE USER-FACING NAME IS WRITTEN.
 *
 * ✅ SETTLED 25 SEP: Unstuck Map. What follows is kept because the REASONING
 * still governs — the name lives here and nowhere else, and that is why
 * landing on one was a single edit rather than a migration.
 *
 * 🔴 "the way out" WAS A PLACEHOLDER — Daniel's call, 12 Sep. Not a shortlist
 * entry, not a leading candidate: a working label so the build could carry on
 * while the real name was decided separately.
 *
 * ⚠️ THE RISK A PLACEHOLDER CARRIES IS THAT IT QUIETLY BECOMES THE NAME. It
 * happened on the other product — a headline sat in the code marked PLACEHOLDER
 * for weeks, nine replacement attempts were rejected, and it only settled when
 * the words came from him. So this note stays until it is replaced, and nothing
 * downstream is allowed to depend on the word.
 *
 * ⭐ His own test, for when it is decided: it should be what someone would
 * search or say when they feel trapped, not a brand word. And check domain and
 * app-store availability before committing — a name this plain will have
 * neighbours.
 *
 * So the name is a ONE-LINE CHANGE and nothing else moves:
 *
 *   - Routes, filenames, table names, prompt keys and the Stripe metadata all
 *     use the internal slug `wayout`. Those never change. Renaming a route
 *     breaks every link anyone has ever shared; renaming a table is a
 *     migration; renaming a prompt key silently 500s the edge function
 *     (`resolvePrompt` throws on an unknown key, by design).
 *   - Anything a person READS comes from here.
 *
 * ⚠️ Do not write the product's name as a literal anywhere else in `src/`.
 * That is the same failure the wordmark had — seven hand-rolled copies of a
 * thing that existed once — and the same failure `pricing.js` exists to
 * prevent. If you need the name in a component, import it.
 *
 * The eliv8os `seo.js` constants (SITE_NAME, ORG_NAME) are deliberately NOT
 * reused: this is a separately-named front door on the same platform, so it
 * carries its own name and says nothing about Eliv8 OS to the visitor.
 */

/**
 * ⭐⭐ THE NAME, SETTLED 25 SEP — Unstuck Map, at getunstuckmap.com.
 *
 * ⚠️ "the way out" was the placeholder for two weeks and the note below warned
 * it would quietly become the name. It did not, and the search is why: every
 * form of it is registered — thewayout.com, wayout.com, mywayout.com,
 * yourwayout.com. It was never available to become anything.
 *
 * ⭐ Daniel's reframe is what unlocked it: "this is less of a business name and
 * more of an app name — you use it for what it is." A business name has to be
 * ownable and defensible; a PRODUCT name only has to be clear. Mint, Google
 * Docs, QuickBooks Payroll are all plainly descriptive and all fine. He had
 * been solving a harder problem than he had.
 *
 * ⚠️ "Get" belongs to the DOMAIN, not the name — the same pattern as Origin at
 * useorigin.com and Monarch at monarchmoney.com. In prose and on the page it is
 * Unstuck Map. If that is wrong, this is the only line to change.
 *
 * ⚠️ Structure: a trade name under Eliv8 Inc. once that is incorporated, with
 * Sarlia above it. ⚠️ A trade name is a NAME, NOT A SHIELD — the liability
 * protection is the corporation, and "unstuck" is descriptive and therefore
 * weak to protect, in a crowded field (unstuck.com, unstuck.ca, getunstuck.ca
 * and unstuckmap.com are all registered to somebody else).
 */
export const WAYOUT_NAME = 'Unstuck Map'

/** Sentence-case, for the start of a sentence or a page title. */
export const WAYOUT_NAME_TITLE = 'Unstuck Map'

/**
 * The possessive/product form used on the reveal screen's brand mark, where
 * the design says "your plan" rather than the product name — the map belongs
 * to the user, not to us.
 */
export const WAYOUT_MAP_LABEL = 'your plan'

/**
 * One line, for <title>, link previews and the landing page.
 *
 * ⭐⭐ DANIEL'S, 21 SEP: "you have the info, let's sort out the plan."
 *
 * The thought is the whole product — somebody stuck is not short of
 * INFORMATION, they are short of an ORDER — and it is in plain spoken English,
 * which matters more than it sounds. Nine headline attempts died on the other
 * product in this repo for being written in advertising register; the one that
 * finally stuck was a sentence he had actually said out loud. Both halves of
 * this are his.
 *
 * ⚠️ TWO WORDS CHANGED, AND BOTH FOR THE SAME REASON.
 *
 * "You have the info" → "You know your situation". Told they already have what
 * they need, somebody stuck can hear "you have had everything all along and
 * just have not tried" — which is the accusation they have been making against
 * themselves at two in the morning. Same claim; assigning it to them makes it
 * a slight, and naming what they lived makes it true.
 *
 * "the plan" → "the order". A plan is a thing anybody can hand you. The order
 * is the thing nobody does, it is literally what this product delivers — three
 * moves, this order — and it is the only part a person cannot work out alone.
 */
export const WAYOUT_TAGLINE = 'You know your situation. Let’s sort out the order.'

/**
 * The internal slug. Routes, table names, prompt keys, Stripe metadata.
 * ⚠️ NEVER shown to a user, and never changed when the name changes.
 */
export const WAYOUT_SLUG = 'wayout'

/**
 * ⭐⭐ ITS OWN DOMAIN, bought 25 Sep. Used for og:url and og:image so a link
 * preview points at Unstuck Map rather than at the domain it happens to share
 * a Netlify site with today.
 *
 * ⚠️ NO TRAILING SLASH — it is concatenated with paths.
 */
export const WAYOUT_SITE_URL = 'https://getunstuckmap.com'

/**
 * 🔴🔴 THE INTERNAL SLUG WAS LEAKING INTO THE PUBLIC URL. Daniel, looking at the
 * address bar on his own domain: "shouldn't this say something different?" It
 * read `getunstuckmap.com/wayout/hello` — `wayout` is the INTERNAL name, kept
 * deliberately so the product could be renamed with a one-line edit, and `hello`
 * means nothing at all to somebody arriving about their money at midnight.
 *
 * ⭐⭐ ON ITS OWN DOMAIN THE PRODUCT LIVES AT THE ROOT: getunstuckmap.com, /start,
 * /stuck/… The `/wayout` prefix stays on eliv8os.com, where this is a second
 * product inside somebody else's house and the prefix is what keeps it out of
 * the way.
 *
 * ⚠️ HOST-AWARE, AND IT HAS TO BE, BECAUSE ONE BUILD SERVES BOTH DOMAINS. There
 * is no build-time answer to "which product is this" — only a runtime one.
 *
 * ⚠️ AND IT MUST NOT BREAK PRERENDERING. scripts/prerender.mjs runs against a
 * local preview server where the hostname is localhost, so the fallback is the
 * prefixed form and the emitted HTML is valid on both domains. The root URLs are
 * reached by rewrites in public/_redirects, not by a second build.
 *
 * ⚠️ NOW IS THE CHEAPEST THIS CHANGE WILL EVER BE. The situation pages went live
 * three days ago and Search Console is not connected yet, so there is almost
 * nothing indexed to lose. Every week of waiting raises the price.
 */
const UNSTUCK_HOSTS = ['getunstuckmap.com', 'www.getunstuckmap.com']

export function onOwnDomain() {
  return typeof window !== 'undefined' && UNSTUCK_HOSTS.includes(window.location.hostname)
}

/** Base path for every route in this product. Empty string on its own domain. */
export const WAYOUT_BASE = onOwnDomain() ? '' : '/wayout'

/** Where the landing lives: the root of its own domain, a page inside Eliv8's. */
export const WAYOUT_HOME = onOwnDomain() ? '/' : '/wayout/hello'

/**
 * 🔴🔴 HOW LONG THIS TAKES, IN ONE PLACE, FOR THE SAME REASON THE PRICE IS.
 *
 * "Six questions, three minutes" was written across the landing page, the
 * diagnostic, all sixteen situation pages, the sign-in screen and the intake —
 * and when the free half and the paid half merged into one flow it stopped being
 * true everywhere at once. It took THREE passes to clear, and each pass missed
 * instances for the same reason: a grep for "six questions" does not match "Six
 * honest questions", which is what the hero said.
 *
 * ⭐⭐ THE FIX IS NOT A BETTER GREP. A claim repeated in eight files will drift
 * again the next time the flow changes — which is exactly why WAYOUT_PRICE_FULL
 * exists rather than "$29" being typed into pages. Same discipline: the promise
 * about time lives here, and nowhere writes it as a literal.
 *
 * ⚠️ AND THE TWO HALVES MUST BOTH BE SAID. Three minutes buys a DIRECTION — which
 * of four ways out is yours. The plan is the questions after that. Naming only
 * the first is how somebody ends up feeling misled at minute four, which is the
 * one thing this product cannot afford.
 */
export const WAYOUT_TOTAL_TIME = 'about twenty minutes'

/**
 * 🔴🔴 LEADING WITH "THREE MINUTES" WAS A BAIT-AND-SWITCH IN A PRODUCT THAT HAS
 * SPENT ITS WHOLE LIFE REFUSING ONE.
 *
 * Three minutes is real — it is how long the six taps take — but it is not how
 * long THIS takes, and putting it on the button sells a commitment nobody is
 * actually making. Somebody who starts expecting three minutes and finds twenty
 * has been handled, and this is the product whose opening screen says the entire
 * arrangement out loud precisely so there is nothing left to dread.
 *
 * ⚠️ Daniel said "6 questions 3 minutes has to be updated across the platform"
 * and I read "updated" as "made accurate" twice before understanding he meant
 * GONE. The honest number is the whole number.
 */
export function timeLine() {
  return `About twenty minutes, start to finish.`
}

/**
 * ⭐⭐ THE CANONICAL URL IS THE SAME SENTENCE WHOEVER RENDERS IT.
 *
 * One build serves both domains, so the same page can be reached at
 * `/wayout/stuck/x` on eliv8os.com and `/stuck/x` on getunstuckmap.com. Google
 * must be told which one is the page — and that is always the product's own
 * domain without the internal prefix, because that is the address a person is
 * given and the one every link should earn.
 *
 * ⚠️ NOT host-aware, deliberately. A canonical that changed with the host would
 * tell each domain it is the real one, which is the same duplicate-content
 * mistake that cost leadeos.com, made twice as fast.
 */
export function canonicalUrl(path = '') {
  const clean = String(path).replace(/^\/wayout(?=\/|$)/, '') || '/'
  return `${WAYOUT_SITE_URL}${clean === '/' ? '' : clean}`
}
