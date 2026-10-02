/**
 * ⭐⭐ READ A REPLY THAT CAME BACK IN ANY SHAPE.
 *
 * 🔴 Found on 2 Oct, live: asked for JSON only, the model sometimes writes the
 * reply as prose AND THEN the JSON after it (fenced or not). The old reader
 * tried JSON.parse on the whole thing, failed, and fell back to showing the
 * person the raw text — JSON blob included — with every flag false. On a
 * crisis reply that meant the help lines for their country never appeared.
 *
 * So: try the whole text; then every fenced block; then every balanced {...}
 * that contains "reply" — newest last wins. Only if none parse is the text
 * treated as prose, and then with any trailing code block cut off.
 */
export function readReplyJson(raw) {
  const text = String(raw ?? '').trim()
  const tryParse = t => { try { const o = JSON.parse(t); return o && typeof o === 'object' && 'reply' in o ? o : null } catch { return null } }

  const whole = tryParse(text.replace(/^```(?:json)?\s*|```$/g, '').trim())
  if (whole) return whole

  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map(m => tryParse(m[1].trim())).filter(Boolean)
  if (fenced.length) return fenced[fenced.length - 1]

  // Balanced-brace scan for bare JSON objects after the prose.
  const found = []
  for (let i = text.indexOf('{'); i !== -1; i = text.indexOf('{', i + 1)) {
    let depth = 0, inStr = false, esc = false
    for (let j = i; j < text.length; j++) {
      const c = text[j]
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue }
      if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}' && --depth === 0) { const o = tryParse(text.slice(i, j + 1)); if (o) found.push(o); break }
    }
  }
  if (found.length) return found[found.length - 1]

  // Prose only. Never show a code block to a person.
  return { reply: text.replace(/```[\s\S]*$/, '').trim(), changes_plan: false, what_changed: null, stalling: false, crisis: false }
}

/**
 * ⭐⭐ THE SAFETY NET UNDER THE MODEL'S JUDGEMENT — on THEIR words, not ours.
 * If what they wrote matches any of these, the help box is shown whatever the
 * model returned. A false positive costs one box of phone numbers under a
 * reply; a false negative is the failure this product cannot recover from.
 * ⚠️ Kept in step with the crisis slang list in WAYOUT_SAFETY. Tested both ways.
 */
const CRISIS = [
  // kms — but not kilometres: no number or bracket before it, no distance after.
  /(?<![\d(]\s*)\bkms\b(?!\s*(\)|to\b|from\b|away\b|per\b|an?\s+hour\b|each\b))/i,
  /\bkill(ing)?\s+my\s*self\b/i,
  /\bun-?aliv(e|ing)\b/i,
  /\bsuicid/i,
  /\bend(ing)?\s+(it\s+all|my\s+life|it)\b/i,
  /\b(better|be)\s+off\s+without\s+me\b/i,
  /\bwant\s+to\s+(die|disappear)\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(wake\s+up|be\s+(here|alive)|live)\b/i,
  /\bnot\s+be\s+here\s+any\s*more\b/i,
  /\bdone\s+with\s+(it\s+all|life|everything)\b/i,
  /\bcan'?t\s+(do|take)\s+(this|it)\s+any\s*more\b/i,
  /\btired\s+of\s+(existing|living|being\s+alive)\b/i,
  /\bsleep\s+forever\b/i,
  /\bno\s+(point|reason)\s+(in\s+)?(living|going\s+on|being\s+alive)\b/i,
  /\b(scared|afraid)\s+to\s+go\s+home\b/i,
  /\b(he|she|they|my\s+(husband|wife|partner|boyfriend|girlfriend|ex|dad|father|mum|mom|mother))\s+(hits|hurts|beats|chokes|threatens)\s+me\b/i,
  /\bgets\s+rough\b/i,
]
export function soundsLikeCrisis(said) {
  const t = String(said ?? '')
  return CRISIS.some(re => re.test(t))
}
