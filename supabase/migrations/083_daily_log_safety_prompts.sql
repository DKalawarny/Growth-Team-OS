-- 7 Oct 2026: light safety prompts on the daily log (Daniel, kept deliberately
-- lean, "not too much that isn't on brand"). These are HEADS-UP signals for the
-- office, NOT the audit-grade record: the real WorkSafe report and the full
-- FLHA document live in the Safety & Compliance module, signed and retained.
alter table public.daily_logs
  add column if not exists injury_detail text,            -- what happened, when injury is flagged
  add column if not exists incident_report_filed boolean, -- was the official report filled out
  add column if not exists flha_done boolean;             -- was a field level hazard assessment done
