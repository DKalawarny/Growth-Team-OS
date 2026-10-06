-- ⭐ THE SHARED SUMMARY BETWEEN UNSTUCK MAP AND ELIV8 OS (6 Oct 2026).
-- Daniel: "could there be a summary that they can produce to give the other
-- platform to help round it out?" Agreed shape: only a few narrow facts, the
-- person writes or edits every word, nothing is shared automatically.
-- 🔴 PRIVATE TO THE PERSON. Not company scoped: an owner's household numbers
-- must never reach whoever else is on the Eliv8 account (migration 075/076).
create table if not exists public.personal_handoffs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  from_product text not null check (from_product in ('unstuck', 'eliv8')),
  body         text not null check (char_length(body) between 3 and 1200),
  created_at   timestamptz not null default now()
);
alter table public.personal_handoffs enable row level security;
create policy handoffs_own on public.personal_handoffs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists personal_handoffs_user on public.personal_handoffs (user_id, from_product, created_at desc);
