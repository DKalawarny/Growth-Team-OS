/**
 * The money symbol for where they live — from the country asked first in the
 * intake. 🔴 Every money box showed "$", so somebody in Manchester typed their
 * rent into a dollar field, and every figure read back to them wore a dollar
 * sign. Unknown country → "$" with no code, as before.
 */
const CURRENCY = {
  ca: { symbol: '$', code: 'CAD' },
  us: { symbol: '$', code: 'USD' },
  uk: { symbol: '£', code: 'GBP' },
  ie: { symbol: '€', code: 'EUR' },
  au: { symbol: '$', code: 'AUD' },
  nz: { symbol: '$', code: 'NZD' },
}

export function currencyFor(region) {
  return CURRENCY[String(region ?? '').toLowerCase()] ?? { symbol: '$', code: null }
}
