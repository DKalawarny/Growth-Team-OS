-- 🔴🔴 STORED PLAYBOOKS NEVER IMPROVE, AND NOTHING KNEW THEY WERE OLD.
--
-- Daniel, on a move-3 walkthrough hours after the rule that was meant to fix it
-- went live: "still no apps updated here." The move names kinwove, Eliv8 OS and
-- Unstuck Map; the walkthrough covered one of them. The prompt rule requiring a
-- walkthrough to cover the WHOLE move had been deployed at 14:15 UTC — and the
-- play he was reading was generated at 14:04, eleven minutes before it.
--
-- ⚠️ `playbookIsStale` compared only the move's TITLE, so a better PROMPT could
-- never make a stored play stale. Every improvement applied to new readers and
-- to nobody who already had one.
--
-- 🔴 AND `updated_at` COULD NOT BE USED TO SPOT IT, which is the subtler half:
-- `saveThread` writes to this same row, so asking a question bumps `updated_at`
-- without regenerating anything. The row said 16:11 while the writing in it was
-- from 14:04. A row-touch timestamp is not a generation timestamp.
--
-- ⭐⭐ SO THE PLAY CARRIES THE VERSION OF THE RULES IT WAS WRITTEN UNDER. When
-- the playbook prompt changes materially, the constant in session.js is bumped
-- and every stored play below it regenerates on next open — once, on demand, for
-- the person actually reading it.
--
-- ⚠️ DEFAULT 0 IS LOAD-BEARING: every play written before today is version 0 and
-- therefore below the current rules, so the whole existing set refreshes itself
-- the first time somebody opens it.
alter table public.wayout_playbooks
  add column if not exists rules_version integer not null default 0;

comment on column public.wayout_playbooks.rules_version is
  'Which generation of the playbook prompt wrote this. Below WAYOUT_PLAYBOOK_RULES in session.js = stale, regenerate on open. Never infer freshness from updated_at: saveThread touches this row.';
