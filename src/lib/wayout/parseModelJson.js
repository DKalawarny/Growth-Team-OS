/**
 * Parse what `callClaude({ json: true })` actually returns.
 *
 * 🔴 IT RETURNS A STRING, NOT AN OBJECT. `unwrapJson` strips markdown fences
 * and slices to the outermost braces — it never calls JSON.parse. Every caller
 * has to parse it themselves.
 *
 * ⚠️ THIS COST TWO BUGS IN ONE NIGHT, both in code I wrote, and both would have
 * broken the first real run: generateMap and generatePlaybook each checked
 * `typeof x !== 'object'` and threw "came back unreadable" on every single
 * response, including perfectly good ones. Neither had ever been run.
 *
 * ⚠️ What made it invisible was a COMMENT. The code said "json:true makes
 * callClaude return the parsed object", stated confidently, directly above the
 * check that could never pass. A comment asserting a mechanism is not the
 * mechanism, and I have now written that same class of comment twice tonight —
 * the other one claimed a database write "goes through the same guard", which
 * it did, and that was the bug.
 *
 * Hence one shared helper with a test, rather than the same assumption written
 * out at each call site.
 */
export function parseModelJson(raw, what = 'that') {
  if (raw && typeof raw === 'object') return raw      // already parsed: fine

  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(`${what} came back empty. Try again in a moment.`)
  }

  try {
    return JSON.parse(raw)
  } catch {
    // ⚠️ Name the likely cause rather than blaming the parser. Truncation at
    // the token ceiling is by far the commonest way this fails, and the repo
    // has been here before: "the message blames the parser for our token
    // budget". A response that ends without its closing brace was cut off.
    const looksTruncated = !raw.trimEnd().endsWith('}') && !raw.trimEnd().endsWith(']')
    throw new Error(
      looksTruncated
        ? `${what} was cut off before it finished. The budget for it needs raising.`
        : `${what} came back unreadable. Try again in a moment.`,
    )
  }
}
