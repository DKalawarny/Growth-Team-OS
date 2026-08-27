-- ============================================================================
-- Eliv8 OS — staff token revocation (migration 019)
--
-- Adds the support columns the staff magic-link token system needs:
--
--   tokens_valid_after   timestamptz — any token issued before this time is
--                        rejected. Lets the owner globally rotate a single
--                        staff member's links without deleting the row.
--                        NULL = no rotation, all signed tokens are valid.
--
--   last_seen_at         timestamptz — updated server-side every time the
--                        staff portal loads. Owners can see "Jane was last
--                        active 2 hours ago" to know if a phone is still
--                        being used or if a link is stale / abandoned.
--
-- Both default NULL so the column add is backward-compatible — existing
-- staff_members rows continue to work without modification.
--
-- Why not store the token in the row?
--   We don't. Tokens are stateless (HMAC over { sid, cid, iat }) so we
--   don't have to manage row writes on every sign. The signing secret
--   lives in STAFF_LINK_SECRET. Revocation = bump tokens_valid_after.
-- ============================================================================

alter table public.staff_members
  add column if not exists tokens_valid_after timestamptz,
  add column if not exists last_seen_at       timestamptz;

-- Used by the staff portal endpoint to update last_seen_at without a heavy
-- table scan. Already-indexed primary key handles the lookup; this is just
-- for "list of staff sorted by recent activity" in a future owner view.
create index if not exists staff_members_last_seen_at_idx
  on public.staff_members (company_id, last_seen_at desc nulls last);
