-- ============================================================================
-- The play-by-play — how to actually do the move you are on (migration 048)
--
-- ⭐ THE SECOND PRODUCT. Migration 046 stores the PLAN — what to do and in what
-- order, bought once. This stores the HOW for a single move, which is the part
-- that recurs, because if they knew how they would have done it already.
--
-- One row per (session, move). Move two's play-by-play does not exist until
-- move one is done — not as a paywall trick but because it is genuinely useless
-- before then, and generating it early would mean generating it against a
-- situation that has since changed.
--
-- 🔴 SCOPED TO THE PERSON, NOT A COMPANY, for the same reason as 046: this is
-- built from their custody arrangement, their money and what they told us at
-- the end. Nothing about it belongs to an employer.
-- ============================================================================

create table public.wayout_playbooks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid not null references public.wayout_sessions(id) on delete cascade,

  -- Which move of the three. 1-indexed, matching the map.
  move_order   int  not null check (move_order between 1 and 3),

  -- ⚠️ The move as it was when this was written. The plan can be re-planned,
  -- and a play-by-play for a move that no longer exists is worse than none —
  -- keeping the snapshot is what lets the app notice the mismatch.
  move         jsonb not null,
  play         jsonb,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (session_id, move_order)
);

create index wayout_playbooks_user_idx on public.wayout_playbooks(user_id, created_at desc);

create trigger wayout_playbooks_set_updated_at
  before update on public.wayout_playbooks
  for each row execute function public.set_updated_at();

alter table public.wayout_playbooks enable row level security;

create policy "wayout: own playbooks"
  on public.wayout_playbooks
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 🔴 Same lesson as 046: the content is GENERATED, never submitted. A client
-- that can write `play` can write itself the thing it is meant to be paying
-- for, and no amount of care in the UI closes that.
create or replace function public.wayout_playbook_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    return new;                            -- service role: the generator
  end if;
  if tg_op = 'INSERT' and new.play is not null then
    raise exception 'wayout: the play-by-play is generated, not submitted';
  end if;
  if tg_op = 'UPDATE' and new.play is distinct from old.play then
    raise exception 'wayout: the play-by-play is generated, not submitted';
  end if;
  return new;
end;
$$;

create trigger wayout_playbooks_guard
  before insert or update on public.wayout_playbooks
  for each row execute function public.wayout_playbook_guard();
