-- Sideline: game RSVPs + push notifications.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- ---------------------------------------------------------------------
-- "I'm in / I'm out" for games
-- ---------------------------------------------------------------------

create table if not exists public.game_rsvps (
  game_id    uuid not null references public.games(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  league_id  uuid not null references public.leagues(id) on delete cascade,
  status     text not null check (status in ('in', 'out')),
  updated_at timestamptz not null default now(),
  primary key (game_id, member_id)
);
create index if not exists game_rsvps_league on public.game_rsvps (league_id);

alter table public.game_rsvps enable row level security;

drop policy if exists "members read rsvps" on public.game_rsvps;
create policy "members read rsvps" on public.game_rsvps for select
  using (public.is_member(league_id));

-- You can only answer for yourself, for a game in your league.
drop policy if exists "players rsvp for themselves" on public.game_rsvps;
create policy "players rsvp for themselves" on public.game_rsvps for insert
  with check (
    exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid() and m.league_id = game_rsvps.league_id)
    and exists (select 1 from public.games g where g.id = game_id and g.league_id = game_rsvps.league_id)
  );

drop policy if exists "players change own rsvp" on public.game_rsvps;
create policy "players change own rsvp" on public.game_rsvps for update
  using (exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid() and m.league_id = game_rsvps.league_id));

drop policy if exists "players clear own rsvp" on public.game_rsvps;
create policy "players clear own rsvp" on public.game_rsvps for delete
  using (exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Push notifications
-- ---------------------------------------------------------------------

-- One row per device that turned notifications on.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke insert, update on public.push_subscriptions from anon, authenticated;

drop policy if exists "read own devices" on public.push_subscriptions;
create policy "read own devices" on public.push_subscriptions for select using (user_id = auth.uid());
drop policy if exists "remove own devices" on public.push_subscriptions;
create policy "remove own devices" on public.push_subscriptions for delete using (user_id = auth.uid());

-- Save this device for the signed-in user (a shared phone moves to whoever signed in last).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'You need to be signed in'; end if;
  insert into push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

-- Which notifications have already been pushed to phones.
alter table public.notifications add column if not exists pushed_at timestamptz;

-- Daily reminders are sent once per game.
alter table public.games add column if not exists stats_reminded_at timestamptz;
alter table public.games add column if not exists rsvp_reminded_at timestamptz;

notify pgrst, 'reload schema';
