/**
 * jurisdictionLinks
 *
 * Resolves the canonical "rule-holder" websites for an owner's location so
 * Solomon (and any tool prompt) can REDIRECT instead of giving advice on
 * topics that depend on jurisdiction-specific law — employment standards,
 * workplace safety, tax filings, etc.
 *
 * Why this exists:
 *   We never want Solomon to invent a URL or paraphrase legislation. He
 *   answers business-coaching questions. For HR/legal/tax/safety questions
 *   we point the owner straight at the official source for THEIR province
 *   or state. Baking the URLs into the system prompt would burn ~1500
 *   tokens every conversation; instead we look up only the relevant
 *   jurisdiction here and inject just those few links into BUSINESS_CONTEXT.
 *
 * Usage:
 *   const links = getJurisdictionLinks(businessProfile?.location)
 *   // → { jurisdiction_label, country, employment_standards, workplace_safety, tax }
 *   // OR null if location is missing/unknown — Solomon then asks where they're based.
 *
 * The returned shape is intentionally simple and stable so prompts can
 * reference it ("see jurisdiction_authorities.employment_standards.url").
 */

// ── Canonical authority table ─────────────────────────────────────────────
// Add new jurisdictions here. URLs MUST be the official government source.
// Verified May 2026 — re-check annually.

const CA_PROVINCES = {
  AB: {
    label:   'Alberta, Canada',
    employment_standards: { name: 'Alberta Employment Standards', url: 'https://www.alberta.ca/employment-standards' },
    workplace_safety:     { name: 'Alberta OHS / WCB Alberta',    url: 'https://www.wcb.ab.ca' },
    tax:                  { name: 'Canada Revenue Agency (CRA)',  url: 'https://www.canada.ca/en/revenue-agency.html' },
  },
  BC: {
    label:   'British Columbia, Canada',
    employment_standards: { name: 'BC Employment Standards Branch', url: 'https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice' },
    workplace_safety:     { name: 'WorkSafeBC',                     url: 'https://www.worksafebc.com' },
    tax:                  { name: 'Canada Revenue Agency (CRA)',    url: 'https://www.canada.ca/en/revenue-agency.html' },
  },
  ON: {
    label:   'Ontario, Canada',
    employment_standards: { name: 'Ontario Employment Standards Act guide', url: 'https://www.ontario.ca/document/your-guide-employment-standards-act-0' },
    workplace_safety:     { name: 'WSIB Ontario',                            url: 'https://www.wsib.ca' },
    tax:                  { name: 'Canada Revenue Agency (CRA)',             url: 'https://www.canada.ca/en/revenue-agency.html' },
  },
  QC: {
    label:   'Québec, Canada',
    employment_standards: { name: 'CNESST — Normes du travail',           url: 'https://www.cnesst.gouv.qc.ca/en/working-conditions' },
    workplace_safety:     { name: 'CNESST — Santé et sécurité du travail', url: 'https://www.cnesst.gouv.qc.ca/en/prevention-and-safety' },
    tax:                  { name: 'Revenu Québec',                         url: 'https://www.revenuquebec.ca/en' },
  },
  MB: {
    label:   'Manitoba, Canada',
    employment_standards: { name: 'Manitoba Employment Standards', url: 'https://www.gov.mb.ca/labour/standards' },
    workplace_safety:     { name: 'WCB Manitoba',                  url: 'https://www.wcb.mb.ca' },
    tax:                  { name: 'Canada Revenue Agency (CRA)',   url: 'https://www.canada.ca/en/revenue-agency.html' },
  },
  SK: {
    label:   'Saskatchewan, Canada',
    employment_standards: { name: 'Saskatchewan Employment Standards', url: 'https://www.saskatchewan.ca/business/employment-standards' },
    workplace_safety:     { name: 'WCB Saskatchewan',                  url: 'https://www.wcbsask.com' },
    tax:                  { name: 'Canada Revenue Agency (CRA)',       url: 'https://www.canada.ca/en/revenue-agency.html' },
  },
  NS: {
    label:   'Nova Scotia, Canada',
    employment_standards: { name: 'Nova Scotia Labour Standards', url: 'https://novascotia.ca/lae/employmentrights' },
    workplace_safety:     { name: 'WCB Nova Scotia',              url: 'https://www.wcb.ns.ca' },
    tax:                  { name: 'Canada Revenue Agency (CRA)',  url: 'https://www.canada.ca/en/revenue-agency.html' },
  },
  NB: {
    label:   'New Brunswick, Canada',
    employment_standards: { name: 'New Brunswick Employment Standards', url: 'https://www2.gnb.ca/content/gnb/en/departments/post-secondary_education_training_and_labour/People/content/EmploymentStandards.html' },
    workplace_safety:     { name: 'WorkSafeNB',                         url: 'https://www.worksafenb.ca' },
    tax:                  { name: 'Canada Revenue Agency (CRA)',        url: 'https://www.canada.ca/en/revenue-agency.html' },
  },
  NL: {
    label:   'Newfoundland and Labrador, Canada',
    employment_standards: { name: 'NL Labour Standards',         url: 'https://www.gov.nl.ca/ecc/labour' },
    workplace_safety:     { name: 'WorkplaceNL',                 url: 'https://www.workplacenl.ca' },
    tax:                  { name: 'Canada Revenue Agency (CRA)', url: 'https://www.canada.ca/en/revenue-agency.html' },
  },
  PE: {
    label:   'Prince Edward Island, Canada',
    employment_standards: { name: 'PEI Employment Standards',    url: 'https://www.princeedwardisland.ca/en/topic/employment-standards' },
    workplace_safety:     { name: 'WCB PEI',                     url: 'https://www.wcb.pe.ca' },
    tax:                  { name: 'Canada Revenue Agency (CRA)', url: 'https://www.canada.ca/en/revenue-agency.html' },
  },
}

// United States — federal-only fallback. State-level employment & tax pages
// vary widely; instead of hard-coding 50 entries (and risking stale URLs)
// we hand the owner the federal authorities and tell Solomon to redirect
// state-specific questions with a "search '<your state> Department of Labor'"
// instruction. Add specific states here as we get clients in them.
const US_FEDERAL = {
  label:   'United States (federal)',
  employment_standards: { name: 'U.S. Department of Labor', url: 'https://www.dol.gov' },
  workplace_safety:     { name: 'OSHA',                    url: 'https://www.osha.gov' },
  tax:                  { name: 'IRS',                     url: 'https://www.irs.gov' },
}

// ── Province / state name normalisation ───────────────────────────────────
// Owners type their location free-form ("Calgary, AB", "Vancouver, B.C.",
// "Toronto, Ontario"). We map common spellings to the 2-letter code.

const CA_NAME_TO_CODE = {
  'alberta':                  'AB',
  'british columbia':         'BC',
  'b.c.':                     'BC',
  'manitoba':                 'MB',
  'new brunswick':            'NB',
  'newfoundland':             'NL',
  'newfoundland and labrador':'NL',
  'nova scotia':              'NS',
  'ontario':                  'ON',
  'prince edward island':     'PE',
  'p.e.i.':                   'PE',
  'quebec':                   'QC',
  'québec':                   'QC',
  'saskatchewan':             'SK',
}
const CA_CODES = new Set(Object.keys(CA_PROVINCES))

const US_STATE_NAMES = new Set([
  'alabama','alaska','arizona','arkansas','california','colorado','connecticut',
  'delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa',
  'kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan',
  'minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire',
  'new jersey','new mexico','new york','north carolina','north dakota','ohio',
  'oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota',
  'tennessee','texas','utah','vermont','virginia','washington','west virginia',
  'wisconsin','wyoming',
])
const US_CODE_TO_NAME = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California',
  CO:'Colorado', CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia',
  HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas',
  KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts',
  MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana',
  NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico',
  NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
  OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
  SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont',
  VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming',
}
const US_STATE_CODES = new Set(Object.keys(US_CODE_TO_NAME))

/**
 * getJurisdictionLinks(location)
 *
 * @param   {string|null|undefined} location  e.g. "Calgary, AB" or "Vancouver, British Columbia"
 * @returns {object|null}                     Authority links for the matched jurisdiction,
 *                                            or null if we can't confidently match.
 *                                            Returning null is the right behaviour — Solomon
 *                                            should ask the owner where they're based instead
 *                                            of guessing.
 */
export function getJurisdictionLinks(location) {
  if (!location || typeof location !== 'string') return null

  // Normalise: lowercase, strip diacritics, split on commas/slashes/whitespace.
  const norm = location
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.]/g, '')

  const tokens = norm
    .split(/[,/]+/)
    .map(t => t.trim())
    .filter(Boolean)

  // ---- Canada: try province match (full name first, then 2-letter code) ----
  for (const tok of tokens) {
    if (CA_NAME_TO_CODE[tok]) {
      return makeEntry(CA_PROVINCES[CA_NAME_TO_CODE[tok]])
    }
  }
  // 2-letter code — match against last token typically
  for (const tok of tokens) {
    const code = tok.toUpperCase()
    if (CA_CODES.has(code)) {
      return makeEntry(CA_PROVINCES[code])
    }
  }

  // ---- United States: state name or 2-letter code ----
  for (const tok of tokens) {
    if (US_STATE_NAMES.has(tok)) {
      return makeUsEntry(tok)
    }
  }
  for (const tok of tokens) {
    const code = tok.toUpperCase()
    if (US_STATE_CODES.has(code)) {
      return makeUsEntry(code)
    }
  }

  // No confident match.
  return null
}

function makeEntry(record) {
  return {
    jurisdiction_label:   record.label,
    country:              'CA',
    employment_standards: record.employment_standards,
    workplace_safety:     record.workplace_safety,
    tax:                  record.tax,
  }
}

function makeUsEntry(stateNameOrCode) {
  // We don't hard-code 50 state agencies. Use federal authorities + a
  // search instruction so Solomon can tell the owner exactly how to find
  // their state-level authority without inventing a URL.
  return {
    jurisdiction_label:   `${prettyState(stateNameOrCode)}, United States`,
    country:              'US',
    employment_standards: US_FEDERAL.employment_standards,
    workplace_safety:     US_FEDERAL.workplace_safety,
    tax:                  US_FEDERAL.tax,
    state_search_hint:    `For state-specific employment law and tax questions, the canonical authorities are "${prettyState(stateNameOrCode)} Department of Labor" and "${prettyState(stateNameOrCode)} Department of Revenue" — those are the agencies the owner should look up directly.`,
  }
}

function prettyState(s) {
  if (s.length === 2) {
    const code = s.toUpperCase()
    return US_CODE_TO_NAME[code] ?? code
  }
  return s.replace(/\b\w/g, c => c.toUpperCase())
}
