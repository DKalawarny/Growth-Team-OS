import { describe, it, expect, vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: {} }))
import { websiteIsStale, listingIsStale, listingMatches, summariseListing } from './onlinePresence'

const NOW = new Date('2026-10-11T12:00:00Z').getTime()
const daysAgo = n => new Date(NOW - n * 86_400_000).toISOString()

describe('when to look again', () => {
  it('re-reads a website after two weeks, or when it has never been read', () => {
    expect(websiteIsStale({ website: 'a.com', website_content: 'x', website_fetched_at: daysAgo(3) }, NOW)).toBe(false)
    expect(websiteIsStale({ website: 'a.com', website_content: 'x', website_fetched_at: daysAgo(15) }, NOW)).toBe(true)
    expect(websiteIsStale({ website: 'a.com', website_content: 'x', website_fetched_at: null }, NOW)).toBe(true)   // read at sign-up, before the date existed
    expect(websiteIsStale({ website: 'a.com', website_content: null, website_fetched_at: daysAgo(1) }, NOW)).toBe(true)
    expect(websiteIsStale({ website: '', website_content: null }, NOW)).toBe(false)   // no site, nothing to read
  })
  it('looks the Google listing up at most once a month', () => {
    expect(listingIsStale({ business_name: 'Acme', google_listing_checked_at: daysAgo(10) }, NOW)).toBe(false)
    expect(listingIsStale({ business_name: 'Acme', google_listing_checked_at: daysAgo(31) }, NOW)).toBe(true)
    expect(listingIsStale({ business_name: 'Acme' }, NOW)).toBe(true)
    expect(listingIsStale({ business_name: ' ' }, NOW)).toBe(false)
  })
})

describe('is this listing really theirs', () => {
  it('accepts the same name with or without the legal ending', () => {
    expect(listingMatches({ business_name: 'Hartley Roofing Ltd.' }, { display_name: 'Hartley Roofing' })).toBe(true)
    expect(listingMatches({ business_name: 'Evergreen Grounds' }, { display_name: 'Evergreen Grounds & Landscaping Inc' })).toBe(true)
  })
  it('accepts a different trading name when the website is the same', () => {
    expect(listingMatches({ business_name: 'DK Holdings', website: 'https://www.hartleyroofing.com/' }, { display_name: 'Hartley Roofing', website: 'http://hartleyroofing.com/contact' })).toBe(true)
  })
  it('refuses a stranger: a different company in the same trade', () => {
    expect(listingMatches({ business_name: 'Hartley Roofing' }, { display_name: 'Harper Roofing' })).toBe(false)
    expect(listingMatches({ business_name: 'Smith Plumbing' }, { display_name: 'Smith & Sons Electrical' })).toBe(false)
    expect(listingMatches({ business_name: 'Hartley Roofing', website: 'hartleyroofing.com' }, { display_name: 'Tulsa Roofing Pros', website: 'tulsaroofingpros.com' })).toBe(false)
    expect(listingMatches({ business_name: 'Hartley Roofing' }, null)).toBe(false)
  })
})

describe('what Solomon is given', () => {
  it('is a handful of facts with no review text or reviewer names', () => {
    const s = summariseListing({
      display_name: 'Hartley Roofing', formatted_address: '12 Main St, Tulsa, OK', categories: { primary_display: 'Roofing contractor' },
      reviews: { count: 4, average: 4.5, recent: [{ author: 'Jane Doe', text: 'Great job', published_at: '2025-03-02T10:00:00Z' }, { author: 'Bob', text: 'ok', published_at: '2024-01-01T00:00:00Z' }] },
      photos_available: 2, hours: null, phone: '555', website: null, business_status: 'OPERATIONAL',
    }, '2026-10-11T12:00:00.000Z')
    expect(s).toMatchObject({ found: true, checked_on: '2026-10-11', review_count: 4, rating: 4.5, newest_review: '2025-03-02', photos_at_least: 2, has_hours: false, has_phone: true })
    expect(JSON.stringify(s)).not.toMatch(/Jane|Great job|Bob/)
  })
})
