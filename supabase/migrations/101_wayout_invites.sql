-- Unstuck Map: invite links and the inviter's dashboard (17 Oct 2026).
--
-- ⭐ Daniel: "a dashboard would be great for everyone who has invited people,
-- it makes it exciting: who's joined, who's earning, who hasn't signed up yet".
--
-- 🔴🔴 JOINING UNSTUCK MAP TELLS PEOPLE YOU ARE STUCK, OFTEN WITH MONEY. So the
-- friend decides, not the inviter (Daniel chose this, 17 Oct). A friend who
-- joins from a link counts only as "someone" until they say yes to being seen,
-- and the default is no.
--
-- ⭐ No friend's email or phone number is ever stored. "Who hasn't signed up
-- yet" works by the inviter making one link per person with a private
-- nickname ("Mom", "Jay from work") that only they ever see.
--
-- ⚠️ Every write goes through a function below. The tables grant SELECT (and
-- DELETE of your own links) and nothing else, so a client cannot bump its own
-- open count, steal a code, or credit itself with somebody else's signup.
-- A row policy says nothing about columns; the grants are what hold.

create table if not exists public.wayout_invites (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  -- Null is their main link (the one the share card uses). Otherwise the
  -- private nickname of the one person this link was made for.
  label          text check (label is null or char_length(label) between 1 and 40),
  code           text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  opened         integer not null default 0,
  last_opened_at timestamptz,
  created_at     timestamptz not null default now()
);
create unique index if not exists wayout_invites_one_main
  on public.wayout_invites (user_id) where label is null;
create index if not exists wayout_invites_user on public.wayout_invites (user_id);

create table if not exists public.wayout_referrals (
  friend_id        uuid primary key references auth.users(id) on delete cascade,
  invite_id        uuid not null references public.wayout_invites(id) on delete cascade,
  show_to_inviter  boolean not null default false,
  -- Whether they have been asked yet. "No" and "not asked" look the same to
  -- the inviter, and must: both mean private.
  answered         boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists wayout_referrals_invite on public.wayout_referrals (invite_id);

alter table public.wayout_invites enable row level security;
alter table public.wayout_referrals enable row level security;

drop policy if exists wayout_invites_own on public.wayout_invites;
create policy wayout_invites_own on public.wayout_invites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists wayout_referrals_own on public.wayout_referrals;
create policy wayout_referrals_own on public.wayout_referrals
  for select using (auth.uid() = friend_id);

revoke all on public.wayout_invites from anon, authenticated;
revoke all on public.wayout_referrals from anon, authenticated;
grant select, delete on public.wayout_invites to authenticated;
grant select on public.wayout_referrals to authenticated;

-- ── The first name a person gave us, or null. Never the whole answer. ──────
create or replace function public.wayout_first_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select nullif(left(split_part(trim(s.answers->>'name'), ' ', 1), 30), '')
  from public.wayout_sessions s
  where s.user_id = p_user and coalesce(trim(s.answers->>'name'), '') <> ''
  order by s.created_at desc limit 1
$$;
revoke all on function public.wayout_first_name(uuid) from public, anon, authenticated;

-- ── Someone opened a link. Public: the friend has no account yet. ──────────
-- Returns the inviter's first name so the page can say who sent them, which
-- the inviter chose to reveal by sending the link. The browser only calls this
-- once per code, so the count is people, roughly, not page loads.
create or replace function public.wayout_invite_open(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  update public.wayout_invites
     set opened = opened + 1, last_opened_at = now()
   where code = left(p_code, 20)
  returning user_id into v_user;
  if v_user is null then return null; end if;
  return public.wayout_first_name(v_user);
end $$;
grant execute on function public.wayout_invite_open(text) to anon, authenticated;

-- ── A new account came from a link. Credit it once, and only if new. ──────
-- ⚠️ An account older than the link was not brought by the link: someone
-- already using Unstuck Map who taps a friend's link later is not their
-- referral. Your own link never credits you (a second account can, which
-- Daniel accepted: "they would just have to pay twice").
create or replace function public.wayout_invite_claim(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_inv public.wayout_invites; v_created timestamptz;
begin
  if auth.uid() is null then return false; end if;
  select * into v_inv from public.wayout_invites where code = left(p_code, 20);
  if v_inv.id is null or v_inv.user_id = auth.uid() then return false; end if;
  select created_at into v_created from auth.users where id = auth.uid();
  if v_created < v_inv.created_at then return false; end if;
  insert into public.wayout_referrals (friend_id, invite_id)
  values (auth.uid(), v_inv.id) on conflict (friend_id) do nothing;
  return found;
end $$;
grant execute on function public.wayout_invite_claim(text) to authenticated;

-- ── The friend's own answer: may the person who sent them see they joined? ─
create or replace function public.wayout_invite_consent(p_show boolean)
returns void language sql security definer set search_path = public as $$
  update public.wayout_referrals set show_to_inviter = p_show, answered = true
   where friend_id = auth.uid()
$$;
grant execute on function public.wayout_invite_consent(boolean) to authenticated;

-- What the friend needs to be asked: who sent them, and whether they answered.
create or replace function public.wayout_my_referral()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'from', public.wayout_first_name(i.user_id),
    'show', r.show_to_inviter,
    'answered', r.answered)
  from public.wayout_referrals r join public.wayout_invites i on i.id = r.invite_id
  where r.friend_id = auth.uid()
$$;
grant execute on function public.wayout_my_referral() to authenticated;

-- ── Making links ────────────────────────────────────────────────────────────
create or replace function public.wayout_invite_main()
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if auth.uid() is null then return null; end if;
  select code into v_code from public.wayout_invites where user_id = auth.uid() and label is null;
  if v_code is null then
    insert into public.wayout_invites (user_id) values (auth.uid())
    on conflict do nothing returning code into v_code;
    if v_code is null then
      select code into v_code from public.wayout_invites where user_id = auth.uid() and label is null;
    end if;
  end if;
  return v_code;
end $$;
grant execute on function public.wayout_invite_main() to authenticated;

create or replace function public.wayout_invite_create(p_label text)
returns text language plpgsql security definer set search_path = public as $$
declare v_label text := nullif(left(trim(coalesce(p_label, '')), 40), ''); v_code text;
begin
  if auth.uid() is null or v_label is null then return null; end if;
  if (select count(*) from public.wayout_invites where user_id = auth.uid()) >= 200 then
    raise exception 'You have made 200 links. Delete one you no longer need first.';
  end if;
  insert into public.wayout_invites (user_id, label) values (auth.uid(), v_label) returning code into v_code;
  return v_code;
end $$;
grant execute on function public.wayout_invite_create(text) to authenticated;

-- ── The dashboard ───────────────────────────────────────────────────────────
-- 🔴 A friend's name appears ONLY when that friend said yes. Otherwise the
-- inviter sees "someone" and how far they have got, which is the exciting
-- part without outing anybody.
-- ⚠️ `paying` is false for everyone until payments are live; when the
-- subscription exists, this is the one place to read it from.
create or replace function public.wayout_my_invites()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.is_main desc, x.created_at desc), '[]'::json)
  from (
    select i.label is null as is_main, i.label, i.code, i.opened, i.created_at,
      coalesce((
        select json_agg(json_build_object(
          'name', case when r.show_to_inviter then public.wayout_first_name(r.friend_id) end,
          -- Said yes but has not typed a name yet: not "kept private".
          'shared', r.show_to_inviter,
          'plan', exists (select 1 from public.wayout_sessions s where s.user_id = r.friend_id and s.map is not null),
          'paying', false,
          'joined', r.created_at) order by r.created_at desc)
        from public.wayout_referrals r where r.invite_id = i.id
      ), '[]'::json) as friends
    from public.wayout_invites i
    where i.user_id = auth.uid()
  ) x
$$;
grant execute on function public.wayout_my_invites() to authenticated;

comment on table public.wayout_invites is
  'Unstuck Map invite links. Label is a private nickname only the owner sees. No friend contact details are stored.';
comment on table public.wayout_referrals is
  'Who joined from which link. The inviter sees a friend''s name only when show_to_inviter is true, set by the friend.';
