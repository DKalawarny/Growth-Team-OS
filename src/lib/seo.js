/**
 * src/lib/seo.js — single source of truth for site-wide SEO configuration.
 *
 * Why centralize this:
 *   - Domain changes once when we move to a real production URL.
 *   - Keyword sets are reused across page meta, schema, llms.txt, and copy.
 *   - JSON-LD schema helpers stay consistent — Google + AI assistants parse
 *     them, so getting the shape right matters more than the wording.
 *
 * Where this gets consumed:
 *   - src/pages/Landing.jsx, Pricing.jsx, marketing/CRM.jsx — <Helmet> blocks
 *   - public/sitemap.xml, public/llms.txt — manually kept in sync (small list)
 *   - public/robots.txt — references SITEMAP_URL
 *
 * If you add a new public page, do three things:
 *   1. Add a <Helmet> block in the page using buildPageMeta()
 *   2. Add the URL to PUBLIC_PAGES below
 *   3. Add it to public/sitemap.xml
 *
 * Keyword philosophy:
 *   We rank for breadth (every plausible trade) but convert on the wedge
 *   (specialty trades). A plumber who lands on the homepage is a fine
 *   ICP — he just gets the home-services framing instead of demo-specific
 *   copy. Cast wide, qualify on the page, convert the right-fit ones.
 */

// ── Site constants ──────────────────────────────────────────────────────────

/**
 * Production URL. Change this when DNS is live.
 * For now uses .ca placeholder — when we move to a real domain, every
 * canonical link, og:url, sitemap entry, and llms.txt update follows.
 */
export const SITE_URL = 'https://leadeos.com'

export const SITE_NAME = 'GrowthOS'

export const ORG_NAME  = 'GrowthOS'

export const CONTACT_EMAIL = 'support@leadeos.com'

/** Default OG image — needs to exist at /public/og-default.png (1200×630). */
export const OG_DEFAULT_IMAGE = `${SITE_URL}/og-default.png`

// ── Keyword sets ────────────────────────────────────────────────────────────

/**
 * Every trade and home-service vertical we plausibly serve. Used in:
 *   - meta keywords (low SEO value but harmless)
 *   - visible page copy ("Built for X, Y, Z…")
 *   - FAQ schema answers
 *   - llms.txt description
 *
 * Kept broad on purpose — we rank for breadth, convert on the wedge.
 * Adding a trade here doesn't commit us to building trade-specific
 * features. It just ensures we show up when an HVAC contractor Googles
 * "AI advisor for HVAC business."
 */
export const TRADES = [
  // Construction specialty trades (the core wedge)
  'demolition contractors',
  'abatement contractors',
  'asbestos abatement',
  'masonry contractors',
  'concrete contractors',
  'framing contractors',
  'carpentry contractors',
  'roofing contractors',
  'siding contractors',
  'painting contractors',
  'drywall contractors',
  'flooring contractors',
  'tile contractors',

  // MEP trades
  'electrical contractors',
  'electricians',
  'plumbing contractors',
  'plumbers',
  'HVAC contractors',
  'heating and cooling contractors',
  'mechanical contractors',
  'sheet metal contractors',

  // Residential & home services
  'general contractors',
  'home builders',
  'residential contractors',
  'remodeling contractors',
  'kitchen and bath contractors',
  'handyman businesses',
  'landscaping contractors',
  'lawn care services',
  'tree services',
  'arborists',
  'pool and spa services',
  'fence contractors',
  'deck builders',

  // Field service trades
  'pest control companies',
  'cleaning services',
  'janitorial services',
  'window cleaning services',
  'pressure washing services',
  'gutter services',
  'locksmith services',
  'garage door services',
  'appliance repair services',
  'septic services',

  // Specialty / disaster
  'restoration contractors',
  'water damage restoration',
  'fire damage restoration',
  'mold remediation',
  'environmental contractors',
  'hazmat contractors',
  'paving contractors',
  'excavation contractors',
  'foundation contractors',
  'waterproofing contractors',
  'insulation contractors',
  'solar contractors',
  'security system installers',
]

/**
 * Higher-level service-business categories — used in copy and meta where
 * the full TRADES list would be too long.
 */
export const SERVICE_CATEGORIES = [
  'home-services businesses',
  'specialty trade contractors',
  'service business owners',
  'construction businesses',
  'field service companies',
  'contractor companies',
  'trades businesses',
  'residential service contractors',
  'commercial service contractors',
]

/**
 * Core feature/benefit keywords. Used in meta descriptions, visible copy,
 * and FAQ answers — anywhere we want to signal "this is what GrowthOS does."
 */
export const FEATURE_KEYWORDS = [
  'AI business advisor',
  'AI for contractors',
  'contractor business software',
  'home services CRM',
  'service business management',
  'field service management',
  'construction CRM',
  'CFO dashboard',
  'cash flow forecasting',
  'business hiring planner',
  'Google Business Profile audit',
  'local SEO for contractors',
  'AI search visibility',
  'contractor scorecard',
  'job costing',
  'quoting and estimating',
  'safety and compliance tracking',
  'WCB compliance',
  'organizational chart planner',
  'growth roadmap',
  'team management software',
  'small business AI',
  'QuickBooks integration',
]

/** Top-25 keyword set for meta tags — picks the highest-volume terms. */
export const PRIMARY_KEYWORDS = [
  'AI advisor for contractors',
  'home services business software',
  'contractor business management software',
  'AI for service businesses',
  'CFO dashboard for small business',
  'cash flow forecasting for contractors',
  'hiring planner for trades',
  'Google Business Profile audit',
  'local SEO for plumbers electricians HVAC',
  'AI search visibility',
  'contractor CRM',
  'home services CRM',
  'specialty trade contractor software',
  'plumber business software',
  'electrician business software',
  'HVAC business software',
  'roofing business software',
  'demolition contractor software',
  'construction business AI',
  'small business operating system',
  'QuickBooks AI advisor',
  'safety compliance tracking software',
  'business growth roadmap',
  'org chart planner',
  'team management for contractors',
]

// ── Public routes ────────────────────────────────────────────────────────────

/**
 * Authoritative list of public, indexable pages. Source of truth for
 * sitemap.xml — when adding a new public route, add it here AND to the
 * sitemap (sitemap is static for now; if it grows, generate it from this).
 *
 * Slug-driven pages (/vs/:competitor and /for/:trade) are enumerated
 * from the COMPETITOR_SLUGS / TRADE_SLUGS exports in their respective
 * page components, then folded into PUBLIC_PAGES below. That way adding
 * a new comparison or trade only requires one edit in the page file.
 */
const COMPETITOR_SLUGS = ['knowify', 'jobber', 'housecall-pro', 'buildertrend']
const TRADE_SLUGS      = ['plumbers', 'electricians', 'hvac', 'roofing', 'demolition', 'landscaping']

export const PUBLIC_PAGES = [
  { path: '/',                priority: '1.0', changefreq: 'weekly'  },
  { path: '/pricing',         priority: '0.9', changefreq: 'monthly' },
  { path: '/crm',             priority: '0.8', changefreq: 'monthly' },
  { path: '/about',           priority: '0.7', changefreq: 'monthly' },
  { path: '/security',        priority: '0.5', changefreq: 'yearly'  },
  { path: '/privacy',         priority: '0.4', changefreq: 'yearly'  },
  { path: '/free-gbp-audit',  priority: '0.8', changefreq: 'monthly' },
  ...COMPETITOR_SLUGS.map(slug => ({ path: `/vs/${slug}`,  priority: '0.7', changefreq: 'monthly' })),
  ...TRADE_SLUGS     .map(slug => ({ path: `/for/${slug}`, priority: '0.7', changefreq: 'monthly' })),
]

// ── Page meta builders ──────────────────────────────────────────────────────

/**
 * Build a complete meta config for a page. Returns an object the page can
 * spread into <Helmet>. Centralizes the "shape" of meta — every page gets
 * canonical, og:*, twitter:* without each page having to know the spec.
 *
 * @param {object}  opts
 * @param {string}  opts.title        — under 60 chars; pageName | siteName
 * @param {string}  opts.description  — 150-160 chars; what's on the page + value prop
 * @param {string}  opts.path         — the route, e.g. "/pricing"
 * @param {string} [opts.image]       — full URL to OG image; falls back to default
 * @param {string} [opts.keywords]    — comma-separated; falls back to PRIMARY_KEYWORDS
 * @returns {object}                   — { title, meta, link } shaped for <Helmet>
 */
export function buildPageMeta({ title, description, path, image, keywords }) {
  const url       = `${SITE_URL}${path}`
  const ogImage   = image    ?? OG_DEFAULT_IMAGE
  const kw        = keywords ?? PRIMARY_KEYWORDS.join(', ')

  return {
    title,
    canonical: url,
    meta: [
      { name: 'description',                     content: description },
      { name: 'keywords',                        content: kw },

      // Open Graph (Facebook, Slack, Discord, iMessage, LinkedIn unfurls)
      { property: 'og:type',                     content: 'website' },
      { property: 'og:url',                      content: url },
      { property: 'og:title',                    content: title },
      { property: 'og:description',              content: description },
      { property: 'og:image',                    content: ogImage },
      { property: 'og:image:width',              content: '1200' },
      { property: 'og:image:height',             content: '630' },
      { property: 'og:site_name',                content: SITE_NAME },
      { property: 'og:locale',                   content: 'en_CA' },

      // Twitter / X cards
      { name: 'twitter:card',                    content: 'summary_large_image' },
      { name: 'twitter:url',                     content: url },
      { name: 'twitter:title',                   content: title },
      { name: 'twitter:description',             content: description },
      { name: 'twitter:image',                   content: ogImage },

      // Robots — explicitly permissive on public pages
      { name: 'robots',                          content: 'index, follow, max-image-preview:large, max-snippet:-1' },

      // Theme + mobile
      { name: 'theme-color',                     content: '#0F172A' },
      { name: 'apple-mobile-web-app-capable',    content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    ],
  }
}

// ── JSON-LD schema builders ─────────────────────────────────────────────────

/**
 * Organization schema. Goes on every page (or at least Landing) so Google
 * + AI assistants know who runs the site. Without this, AI answers like
 * "who built GrowthOS?" return nothing useful.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type':    'Organization',
    name:        ORG_NAME,
    url:         SITE_URL,
    logo:        `${SITE_URL}/favicon.svg`,
    email:       CONTACT_EMAIL,
    description: 'AI-powered operating system for home-services and specialty-trade contractors — combining an AI business advisor with tools for cash flow, hiring, marketing, compliance, and operations.',
    sameAs:      [
      // Add LinkedIn / X / YouTube once those exist
    ],
  }
}

/**
 * SoftwareApplication schema. Used on Landing — tells Google + AI tools
 * what category of software this is so it shows up in "best AI advisor
 * for contractors" type queries.
 */
export function softwareApplicationSchema() {
  return {
    '@context':         'https://schema.org',
    '@type':            'SoftwareApplication',
    name:                SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem:     'Web',
    description:         'AI business advisor and tool suite for home-services businesses, specialty-trade contractors, and field-service companies. Includes CFO dashboard, cash flow forecasting, hiring planner, Google Business Profile audit, AI search visibility, and growth roadmap.',
    url:                 SITE_URL,
    offers: {
      '@type':         'Offer',
      price:           '97',
      priceCurrency:   'CAD',
      priceSpecification: {
        '@type':       'UnitPriceSpecification',
        price:         '97',
        priceCurrency: 'CAD',
        unitText:      'MONTH',
      },
    },
    aggregateRating: undefined, // add once we have real reviews — never fake this
  }
}

/**
 * Product schema for the Pricing page. Helps Google show price snippets
 * directly in search results, and lets AI tools answer "how much does
 * GrowthOS cost?" with the right number.
 */
export function productSchema({ name, description, price, priceCurrency = 'CAD' }) {
  return {
    '@context':    'https://schema.org',
    '@type':       'Product',
    name,
    description,
    brand: {
      '@type': 'Brand',
      name:    SITE_NAME,
    },
    offers: {
      '@type':         'Offer',
      price:           String(price),
      priceCurrency,
      availability:    'https://schema.org/InStock',
      url:             `${SITE_URL}/pricing`,
    },
  }
}

/**
 * FAQPage schema. Wraps a list of {q, a} into the JSON-LD shape Google
 * uses to render FAQ rich snippets (the expandable Q&A in search results).
 * AI assistants also use this to answer specific questions about the product.
 *
 * @param {Array<{q: string, a: string}>} faqs
 */
export function faqPageSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name:    q,
      acceptedAnswer: {
        '@type': 'Answer',
        text:    a,
      },
    })),
  }
}

/**
 * BreadcrumbList schema. Useful when we add deeper indexable pages like
 * /tools/cash-flow (currently auth-gated, but eventually we may want a
 * marketing variant). For now exported but unused.
 */
export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type':    'ListItem',
      position:    i + 1,
      name:        item.name,
      item:       `${SITE_URL}${item.path}`,
    })),
  }
}

/**
 * Convenience: render a JSON-LD object as a string ready to drop into a
 * <script type="application/ld+json"> tag inside <Helmet>.
 */
export function jsonLd(schema) {
  return JSON.stringify(schema)
}
