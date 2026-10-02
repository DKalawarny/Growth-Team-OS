/**
 * ⭐⭐ HELP WHERE THEY ARE — A FIXED TABLE, NOT THE MODEL'S MEMORY.
 *
 * Daniel, 1 Oct: "when it comes to people in crisis make sure any numbers are
 * given to their area or at least country — that's why it's important to get
 * that info at the start."
 *
 * The prompts already carry the rule (988 is Canada and the US only; 999 and
 * Samaritans are the UK; findahelpline.com whenever unsure). But a rule in a
 * prompt is a request. Somebody with one attempt in them cannot be handed a
 * number that rings nothing because a model misremembered — so every crisis
 * screen and every crisis reply also shows THIS box, built from this table and
 * the country they gave us. It is right even when the words above it are not.
 *
 * ⚠️ ONLY NUMBERS THAT ARE NATIONAL, LONG-STANDING AND FREE. Nothing regional,
 * nothing that changes year to year. Every country, including the known ones,
 * also gets findahelpline.com — the fallback if a line has changed.
 * ⚠️ Review this table whenever a country is added to the intake. A wrong entry
 * here is the most dangerous bug this product can have.
 */
const LINES = {
  ca: {
    country: 'Canada',
    emergency: '911',
    lines: [{ name: 'Suicide Crisis Helpline', how: 'Call or text 988, any hour' }],
  },
  us: {
    country: 'the United States',
    emergency: '911',
    lines: [{ name: '988 Suicide & Crisis Lifeline', how: 'Call or text 988, any hour' }],
  },
  uk: {
    country: 'the UK',
    emergency: '999',
    lines: [{ name: 'Samaritans', how: 'Call 116 123, free, any hour' }],
  },
  ie: {
    country: 'Ireland',
    emergency: '112 or 999',
    lines: [{ name: 'Samaritans', how: 'Call 116 123, free, any hour' }],
  },
  au: {
    country: 'Australia',
    emergency: '000',
    lines: [{ name: 'Lifeline', how: 'Call 13 11 14, any hour' }],
  },
  nz: {
    country: 'New Zealand',
    emergency: '111',
    lines: [{ name: 'Need to talk?', how: 'Call or text 1737, free, any hour' }],
  },
}

export const FIND_A_HELPLINE = 'findahelpline.com'

/**
 * The help to show for a country key from the answers ("region"). Unknown or
 * missing → only the worldwide directory and "your local emergency number",
 * which is never wrong.
 */
export function crisisLinesFor(region) {
  const known = LINES[String(region ?? '').toLowerCase()]
  return known
    ? { ...known, known: true, directory: FIND_A_HELPLINE }
    : { country: null, emergency: null, lines: [], known: false, directory: FIND_A_HELPLINE }
}

export const CRISIS_COUNTRIES = Object.keys(LINES)
