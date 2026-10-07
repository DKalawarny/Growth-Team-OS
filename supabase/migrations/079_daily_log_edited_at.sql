-- 7 Oct 2026: a foreman can edit their OWN daily log (Daniel: an immutable log
-- plus "ignore what I said" notes clogs Solomon with contradictions; a clean
-- edit keeps his input to the single current truth). The office still cannot
-- edit the crew's words. edited_at marks a revision so the owner can see it was
-- changed; null means written once and never touched.
alter table public.daily_logs
  add column if not exists edited_at timestamptz;
