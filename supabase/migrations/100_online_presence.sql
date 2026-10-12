-- 100: what Solomon can see of how a customer finds the business.
--
-- 11 Oct 2026, Daniel: "is solomon able to analyse the online presence and give
-- a suggestion on whats missing." The website was read once at sign-up and
-- never again, and the Google listing was not visible to him at all.
--
--   website_fetched_at         when website_content was last read
--   google_listing             a small summary of the Google listing found for
--                              this business, or {"found": false}
--   google_listing_checked_at  when that lookup last ran (it costs money per
--                              call, so it is rationed by this date)
alter table public.business_profiles
  add column if not exists website_fetched_at        timestamptz,
  add column if not exists google_listing            jsonb,
  add column if not exists google_listing_checked_at timestamptz;
