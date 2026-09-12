/**
 * The way out — naming.
 *
 * ⭐ THIS FILE IS THE ONLY PLACE THE USER-FACING NAME IS WRITTEN.
 *
 * The name is not settled. Daniel's own test for it: it should be what someone
 * would search or say when they feel trapped, not a brand word. "The way out"
 * passes that test, which is why it is here as a real candidate rather than a
 * placeholder — but domain and app-store availability have not been checked,
 * and a name like this will have neighbours.
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

/** What the product is called, lowercase as designed. Used in the brand mark. */
export const WAYOUT_NAME = 'the way out'

/** Sentence-case, for the start of a sentence or a page title. */
export const WAYOUT_NAME_TITLE = 'The way out'

/**
 * The possessive/product form used on the reveal screen's brand mark, where
 * the design says "your plan" rather than the product name — the map belongs
 * to the user, not to us.
 */
export const WAYOUT_MAP_LABEL = 'your plan'

/** One line, for <title> and link previews. */
export const WAYOUT_TAGLINE = 'A plan built from what you already have'

/**
 * The internal slug. Routes, table names, prompt keys, Stripe metadata.
 * ⚠️ NEVER shown to a user, and never changed when the name changes.
 */
export const WAYOUT_SLUG = 'wayout'

/** Base path for every route in this product. */
export const WAYOUT_BASE = '/wayout'
