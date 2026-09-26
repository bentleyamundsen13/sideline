-- =====================================================================
-- Sideline: database schema
-- Run this once in a fresh Supabase project: Dashboard > SQL Editor >
-- New query > paste this whole file > Run.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.leagues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 60),
  sport       text not null default 'Flag Football',
  season      text,
  location    text,
  description text,
  code        text not null unique,
  creator_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 40),
  abbr       text not null check (char_length(abbr) between 2 and 4),
  color      text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  captain_id uuid,
  created_at timestamptz not null default now(),
  unique (league_id, name)
);

-- A person's profile inside one league (one row per user per league).
create table public.members (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid not null references public.leagues(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  team_id          uuid references public.teams(id) on delete set null, -- null = Free Agent
  is_commissioner  boolean not null default false,
  onboarded        boolean not null default false,
  display_name     text not null default 'New Player' check (char_length(display_name) between 1 and 40),
  nickname         text check (char_length(nickname) <= 30),
  avatar_url       text,
  jersey_number    int check (jersey_number between 0 and 99),
  offense_position text,
  defense_position text,
  age              int check (age between 5 and 99),
  height_in        int check (height_in between 36 and 96),
  weight_lb        int check (weight_lb between 40 and 400),
  dominant_hand    text check (dominant_hand in ('Right', 'Left', 'Both')),
  hometown         text check (char_length(hometown) <= 40),
  bio              text check (char_length(bio) <= 280),
  joined_at        timestamptz not null default now(),
  unique (league_id, user_id)
);

alter table public.teams
  add constraint teams_captain_id_fkey foreign key (captain_id)
  references public.members(id) on delete set null;

create table public.games (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues(id) on delete cascade,
  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,
  scheduled_at timestamptz not null,
  location     text,
  week         int check (week between 1 and 99),
  status       text not null default 'scheduled' check (status in ('scheduled', 'final')),
  home_score   int check (home_score >= 0),
  away_score   int check (away_score >= 0),
  created_at   timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

-- Self-reported stats, one row per game played.
create table public.stat_lines (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references public.leagues(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete cascade,
  game_id       uuid references public.games(id) on delete set null,
  played_on     date not null default current_date,
  touchdowns    int not null default 0 check (touchdowns between 0 and 50),
  interceptions int not null default 0 check (interceptions between 0 and 50),
  fumbles       int not null default 0 check (fumbles between 0 and 50),
  receptions    int not null default 0 check (receptions between 0 and 100),
  drops         int not null default 0 check (drops between 0 and 100),
  pass_completions int not null default 0 check (pass_completions between 0 and 200),
  pass_attempts    int not null default 0 check (pass_attempts between 0 and 200),
  pass_tds         int not null default 0 check (pass_tds between 0 and 50),
  ints_thrown      int not null default 0 check (ints_thrown between 0 and 50),
  forced_fumbles   int not null default 0 check (forced_fumbles between 0 and 50),
  created_at    timestamptz not null default now(),
  constraint stat_lines_completions_le_attempts check (pass_completions <= pass_attempts)
);
create unique index stat_lines_one_per_game on public.stat_lines (member_id, game_id) where game_id is not null;

create table public.news (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  author_id  uuid references public.members(id) on delete set null,
  kind       text not null default 'announcement' check (kind in ('announcement', 'transaction', 'result', 'system')),
  title      text not null check (char_length(title) between 1 and 120),
  body       text check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create table public.trades (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid not null references public.leagues(id) on delete cascade,
  proposer_team_id uuid not null references public.teams(id) on delete cascade,
  receiver_team_id uuid not null references public.teams(id) on delete cascade,
  proposer_id      uuid references public.members(id) on delete set null,
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'countered', 'cancelled')),
  message          text check (char_length(message) <= 280),
  parent_id        uuid references public.trades(id) on delete set null,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create table public.trade_players (
  trade_id     uuid not null references public.trades(id) on delete cascade,
  member_id    uuid not null references public.members(id) on delete cascade,
  from_team_id uuid not null references public.teams(id) on delete cascade,
  primary key (trade_id, member_id)
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  league_id  uuid not null references public.leagues(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index on public.members (league_id);
create index on public.teams (league_id);
create index on public.games (league_id, scheduled_at);
create index on public.stat_lines (member_id);
create index on public.news (league_id, created_at desc);
create index on public.trades (league_id, status);
create index on public.trade_players (member_id);
create index on public.notifications (user_id, created_at desc);

-- Season totals per player (RLS of the caller applies).
create view public.member_stats with (security_invoker = true) as
select
  member_id,
  league_id,
  count(*)::int            as games,
  sum(touchdowns)::int     as touchdowns,
  sum(interceptions)::int  as interceptions,
  sum(fumbles)::int        as fumbles,
  sum(receptions)::int     as receptions,
  sum(drops)::int          as drops,
  sum(pass_completions)::int as pass_completions,
  sum(pass_attempts)::int  as pass_attempts,
  sum(pass_tds)::int       as pass_tds,
  sum(ints_thrown)::int    as ints_thrown,
  sum(forced_fumbles)::int as forced_fumbles
from public.stat_lines
group by member_id, league_id;

-- ---------------------------------------------------------------------
-- Helper functions (used by row-level security)
-- ---------------------------------------------------------------------

create or replace function public.is_member(p_league uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where league_id = p_league and user_id = auth.uid());
$$;

create or replace function public.is_commish(p_league uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where league_id = p_league and user_id = auth.uid() and is_commissioner);
$$;

create or replace function public.is_captain_of(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from teams t join members m on m.id = t.captain_id
    where t.id = p_team and m.user_id = auth.uid()
  );
$$;

-- Internal helpers: not callable from the API.
create or replace function public.gen_league_code() returns text
language plpgsql set search_path = public as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from leagues where code = result);
  end loop;
  return result;
end $$;

create or replace function public.notify_member(p_member uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, league_id, kind, title, body, link)
  select user_id, league_id, p_kind, p_title, p_body, p_link from members where id = p_member;
$$;

create or replace function public.cancel_trades_for(p_members uuid[]) returns void
language sql security definer set search_path = public as $$
  update trades set status = 'cancelled', resolved_at = now()
  where status = 'pending'
    and id in (select trade_id from trade_players where member_id = any(p_members));
$$;

revoke execute on function public.gen_league_code() from public, anon, authenticated;
revoke execute on function public.notify_member(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.cancel_trades_for(uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- League actions (called from the app via supabase.rpc)
-- ---------------------------------------------------------------------

create or replace function public.create_league(
  p_name text, p_sport text, p_season text default null,
  p_location text default null, p_description text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_league uuid;
begin
  if auth.uid() is null then raise exception 'You need to be signed in'; end if;
  if char_length(coalesce(trim(p_name), '')) < 2 then raise exception 'League name is too short'; end if;

  insert into leagues (name, sport, season, location, description, code, creator_id)
  values (
    trim(p_name),
    coalesce(nullif(trim(p_sport), ''), 'Flag Football'),
    nullif(trim(p_season), ''),
    nullif(trim(p_location), ''),
    nullif(trim(p_description), ''),
    gen_league_code(),
    auth.uid()
  )
  returning id into v_league;

  insert into members (league_id, user_id, is_commissioner) values (v_league, auth.uid(), true);
  insert into news (league_id, kind, title, body)
  values (v_league, 'system', 'League founded', trim(p_name) || ' is officially open for business.');

  return v_league;
end $$;

create or replace function public.join_league(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_league uuid;
begin
  if auth.uid() is null then raise exception 'You need to be signed in'; end if;
  select id into v_league from leagues where code = upper(trim(p_code));
  if v_league is null then raise exception 'No league found with that code'; end if;
  insert into members (league_id, user_id) values (v_league, auth.uid())
  on conflict (league_id, user_id) do nothing;
  return v_league;
end $$;

-- Commissioner: move a player to a team (or null = Free Agents).
create or replace function public.assign_player(p_member uuid, p_team uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m members;
  v_old teams;
  v_new teams;
begin
  select * into m from members where id = p_member for update;
  if m.id is null then raise exception 'Player not found'; end if;
  if not is_commish(m.league_id) then raise exception 'Only the commissioner can assign players'; end if;
  if p_team is not null then
    select * into v_new from teams where id = p_team and league_id = m.league_id;
    if v_new.id is null then raise exception 'Team not found'; end if;
  end if;
  if m.team_id is not distinct from p_team then return; end if;

  select * into v_old from teams where id = m.team_id;
  update teams set captain_id = null where captain_id = m.id;
  update members set team_id = p_team where id = m.id;
  perform cancel_trades_for(array[m.id]);

  if p_team is null then
    perform notify_member(m.id, 'released', 'You are now a free agent',
      'You were moved from ' || coalesce(v_old.name, 'your team') || ' to Free Agents.',
      '/l/' || m.league_id || '/teams/free-agents');
    insert into news (league_id, kind, title, body)
    values (m.league_id, 'transaction', m.display_name || ' released to free agency',
      coalesce(v_old.name || ' part ways with ' || m.display_name || '.', null));
  else
    perform notify_member(m.id, 'assigned', 'You have been assigned to ' || v_new.name,
      'The commissioner placed you on ' || v_new.name || '.',
      '/l/' || m.league_id || '/teams/' || v_new.id);
    insert into news (league_id, kind, title, body)
    values (m.league_id, 'transaction', m.display_name || ' joins ' || v_new.name,
      case when v_old.id is null then 'Signed out of free agency.' else 'Moves over from ' || v_old.name || '.' end);
  end if;
end $$;

-- Commissioner: set (or clear) a team's captain. The captain joins that team.
create or replace function public.set_captain(p_team uuid, p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  t teams;
  m members;
begin
  select * into t from teams where id = p_team for update;
  if t.id is null then raise exception 'Team not found'; end if;
  if not is_commish(t.league_id) then raise exception 'Only the commissioner can pick captains'; end if;

  if p_member is null then
    update teams set captain_id = null where id = t.id;
    return;
  end if;

  select * into m from members where id = p_member and league_id = t.league_id for update;
  if m.id is null then raise exception 'Player not found'; end if;
  if t.captain_id = m.id then return; end if;

  update teams set captain_id = null where captain_id = m.id;
  if m.team_id is distinct from t.id then
    update members set team_id = t.id where id = m.id;
    perform cancel_trades_for(array[m.id]);
  end if;
  update teams set captain_id = m.id where id = t.id;

  perform notify_member(m.id, 'captain', 'You have been named captain of ' || t.name,
    'Draft free agents and make trades to build your roster.',
    '/l/' || t.league_id || '/teams/' || t.id);
  insert into news (league_id, kind, title, body)
  values (t.league_id, 'transaction', m.display_name || ' named captain of ' || t.name,
    'The ' || t.name || ' have their leader.');
end $$;

-- Captain: draft a free agent onto your team.
create or replace function public.draft_player(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m members;
  me members;
  t teams;
begin
  select * into m from members where id = p_member for update;
  if m.id is null then raise exception 'Player not found'; end if;
  select * into me from members where league_id = m.league_id and user_id = auth.uid();
  select * into t from teams where captain_id = me.id;
  if t.id is null then raise exception 'Only team captains can draft players'; end if;
  if m.team_id is not null then raise exception 'That player is already on a team'; end if;
  if not m.onboarded then raise exception 'That player hasn''t finished their profile yet'; end if;

  update members set team_id = t.id where id = m.id;

  perform notify_member(m.id, 'drafted', 'You have been drafted to ' || t.name,
    'Welcome to the squad. Your captain is ' || me.display_name || '.',
    '/l/' || t.league_id || '/teams/' || t.id);
  insert into news (league_id, author_id, kind, title, body)
  values (t.league_id, me.id, 'transaction', t.name || ' draft ' || m.display_name,
    coalesce(nullif(concat_ws(' / ', m.offense_position, m.defense_position), ''), 'Free agent') || ' comes off the board.');
end $$;

-- Captain: propose a trade (or counter an incoming one via p_counter_of).
create or replace function public.propose_trade(
  p_to_team uuid, p_send uuid[], p_receive uuid[],
  p_message text default null, p_counter_of uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me members;
  mine teams;
  theirs teams;
  parent trades;
  v_trade uuid;
  v_count int;
  v_send_names text;
  v_recv_names text;
begin
  p_send := array(select distinct x from unnest(coalesce(p_send, '{}')) x);
  p_receive := array(select distinct x from unnest(coalesce(p_receive, '{}')) x);

  select * into theirs from teams where id = p_to_team;
  if theirs.id is null then raise exception 'Team not found'; end if;
  select * into me from members where league_id = theirs.league_id and user_id = auth.uid();
  select * into mine from teams where captain_id = me.id;
  if mine.id is null then raise exception 'Only team captains can propose trades'; end if;
  if mine.id = theirs.id then raise exception 'You can''t trade with your own team'; end if;
  if cardinality(p_send) = 0 or cardinality(p_receive) = 0 then
    raise exception 'Pick at least one player on each side of the trade';
  end if;

  select count(*) into v_count from members
  where id = any(p_send) and team_id = mine.id and id <> mine.captain_id;
  if v_count <> cardinality(p_send) then
    raise exception 'Some players you''re sending aren''t on your roster (captains can''t be traded)';
  end if;

  select count(*) into v_count from members
  where id = any(p_receive) and team_id = theirs.id and id is distinct from theirs.captain_id;
  if v_count <> cardinality(p_receive) then
    raise exception 'Some players you asked for aren''t on their roster (captains can''t be traded)';
  end if;

  if p_counter_of is not null then
    select * into parent from trades where id = p_counter_of for update;
    if parent.id is null or parent.status <> 'pending'
       or parent.receiver_team_id <> mine.id or parent.proposer_team_id <> theirs.id then
      raise exception 'That trade can no longer be countered';
    end if;
    update trades set status = 'countered', resolved_at = now() where id = parent.id;
  end if;

  insert into trades (league_id, proposer_team_id, receiver_team_id, proposer_id, message, parent_id)
  values (theirs.league_id, mine.id, theirs.id, me.id, nullif(trim(p_message), ''), p_counter_of)
  returning id into v_trade;

  insert into trade_players (trade_id, member_id, from_team_id)
  select v_trade, x, mine.id from unnest(p_send) x;
  insert into trade_players (trade_id, member_id, from_team_id)
  select v_trade, x, theirs.id from unnest(p_receive) x;

  select string_agg(display_name, ', ') into v_send_names from members where id = any(p_send);
  select string_agg(display_name, ', ') into v_recv_names from members where id = any(p_receive);

  if theirs.captain_id is not null then
    perform notify_member(theirs.captain_id, 'trade_request',
      case when p_counter_of is null then mine.name || ' has requested a trade!'
           else mine.name || ' sent a counter offer!' end,
      v_send_names || ' for ' || v_recv_names,
      '/l/' || theirs.league_id || '/trades/' || v_trade);
  end if;

  return v_trade;
end $$;

-- Receiving captain: accept or decline. Returns 'accepted' | 'declined' | 'invalid'.
create or replace function public.respond_trade(p_trade uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare
  t trades;
  me members;
  recv teams;
  prop teams;
  r record;
  v_bad int;
  v_link text;
  v_prop_names text;
  v_recv_names text;
begin
  select * into t from trades where id = p_trade for update;
  if t.id is null then raise exception 'Trade not found'; end if;
  select * into recv from teams where id = t.receiver_team_id;
  select * into prop from teams where id = t.proposer_team_id;
  select * into me from members where league_id = t.league_id and user_id = auth.uid();
  if me.id is null or recv.captain_id is distinct from me.id then
    raise exception 'Only the % captain can respond to this trade', recv.name;
  end if;
  if t.status <> 'pending' then raise exception 'This trade is no longer pending'; end if;

  v_link := '/l/' || t.league_id || '/trades/' || t.id;

  if not p_accept then
    update trades set status = 'declined', resolved_at = now() where id = t.id;
    if prop.captain_id is not null then
      perform notify_member(prop.captain_id, 'trade_declined', recv.name || ' declined your trade', null, v_link);
    end if;
    return 'declined';
  end if;

  -- Every player must still be where they were when the trade was proposed.
  select count(*) into v_bad
  from trade_players tp join members m on m.id = tp.member_id
  where tp.trade_id = t.id
    and (m.team_id is distinct from tp.from_team_id
         or exists (select 1 from teams x where x.captain_id = m.id));
  if v_bad > 0 then
    update trades set status = 'cancelled', resolved_at = now() where id = t.id;
    return 'invalid';
  end if;

  update members m
  set team_id = case when tp.from_team_id = prop.id then recv.id else prop.id end
  from trade_players tp
  where tp.trade_id = t.id and tp.member_id = m.id;

  update trades set status = 'accepted', resolved_at = now() where id = t.id;

  for r in
    select m.id, tp.from_team_id from trade_players tp join members m on m.id = tp.member_id
    where tp.trade_id = t.id
  loop
    if r.from_team_id = prop.id then
      perform notify_member(r.id, 'traded', 'You have been traded from ' || prop.name || ' to ' || recv.name,
        'Report to your new captain.', '/l/' || t.league_id || '/teams/' || recv.id);
    else
      perform notify_member(r.id, 'traded', 'You have been traded from ' || recv.name || ' to ' || prop.name,
        'Report to your new captain.', '/l/' || t.league_id || '/teams/' || prop.id);
    end if;
  end loop;

  if prop.captain_id is not null then
    perform notify_member(prop.captain_id, 'trade_accepted', recv.name || ' accepted your trade!', null, v_link);
  end if;

  select string_agg(m.display_name, ', ') into v_prop_names
  from trade_players tp join members m on m.id = tp.member_id
  where tp.trade_id = t.id and tp.from_team_id = prop.id;
  select string_agg(m.display_name, ', ') into v_recv_names
  from trade_players tp join members m on m.id = tp.member_id
  where tp.trade_id = t.id and tp.from_team_id = recv.id;

  insert into news (league_id, kind, title, body)
  values (t.league_id, 'transaction', 'TRADE: ' || prop.name || ' and ' || recv.name || ' make a deal',
    prop.name || ' send ' || v_prop_names || ' to ' || recv.name || ' in exchange for ' || v_recv_names || '.');

  perform cancel_trades_for(array(select member_id from trade_players where trade_id = t.id));
  return 'accepted';
end $$;

-- Proposing captain: withdraw a pending trade.
create or replace function public.cancel_trade(p_trade uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  t trades;
begin
  select * into t from trades where id = p_trade for update;
  if t.id is null then raise exception 'Trade not found'; end if;
  if not is_captain_of(t.proposer_team_id) then raise exception 'Only the proposing captain can withdraw this trade'; end if;
  if t.status <> 'pending' then raise exception 'This trade is no longer pending'; end if;
  update trades set status = 'cancelled', resolved_at = now() where id = t.id;
end $$;

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

-- Announce new players once they finish their profile.
create or replace function public.on_member_onboarded() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_commish uuid;
begin
  if new.onboarded and not old.onboarded then
    insert into news (league_id, author_id, kind, title, body)
    values (new.league_id, new.id, 'transaction', new.display_name || ' joins the league',
      'Signs as a free agent' || coalesce(' · ' || nullif(concat_ws(' / ', new.offense_position, new.defense_position), ''), '') || '.');
    if not new.is_commissioner then
      for v_commish in select id from members where league_id = new.league_id and is_commissioner loop
        perform notify_member(v_commish, 'member_joined', new.display_name || ' joined the league',
          'A new free agent is available.', '/l/' || new.league_id || '/players/' || new.id);
      end loop;
    end if;
  end if;
  return new;
end $$;

create trigger member_onboarded after update on public.members
for each row execute function public.on_member_onboarded();

-- Pending trades die with the players in them.
create or replace function public.on_member_deleted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform cancel_trades_for(array[old.id]);
  return old;
end $$;

create trigger member_deleted before delete on public.members
for each row execute function public.on_member_deleted();

-- Post a result to the news feed when a game goes final.
create or replace function public.on_game_final() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  h teams;
  a teams;
begin
  if new.status = 'final' and new.home_score is not null and new.away_score is not null
     and (tg_op = 'INSERT' or old.status <> 'final') then
    select * into h from teams where id = new.home_team_id;
    select * into a from teams where id = new.away_team_id;
    insert into news (league_id, kind, title, body)
    values (new.league_id, 'result',
      case
        when new.home_score > new.away_score then h.name || ' beat ' || a.name
        when new.away_score > new.home_score then a.name || ' beat ' || h.name
        else h.name || ' and ' || a.name || ' battle to a tie'
      end,
      'Final: ' || h.name || ' ' || new.home_score || ', ' || a.name || ' ' || new.away_score || '.');
  end if;
  return new;
end $$;

create trigger game_final after insert or update on public.games
for each row execute function public.on_game_final();

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------

alter table public.leagues       enable row level security;
alter table public.teams         enable row level security;
alter table public.members       enable row level security;
alter table public.games         enable row level security;
alter table public.stat_lines    enable row level security;
alter table public.news          enable row level security;
alter table public.trades        enable row level security;
alter table public.trade_players enable row level security;
alter table public.notifications enable row level security;

-- Column-level limits: sensitive columns only change through the functions above.
revoke insert, update on public.leagues from anon, authenticated;
grant update (name, sport, season, location, description) on public.leagues to authenticated;

revoke insert, update on public.teams from anon, authenticated;
grant insert (league_id, name, abbr, color) on public.teams to authenticated;
grant update (name, abbr, color) on public.teams to authenticated;

revoke insert, update on public.members from anon, authenticated;
grant update (onboarded, display_name, nickname, avatar_url, jersey_number, offense_position,
  defense_position, age, height_in, weight_lb, dominant_hand, hometown, bio) on public.members to authenticated;

revoke insert, update, delete on public.trades, public.trade_players from anon, authenticated;

-- leagues
create policy "members read league" on public.leagues for select using (public.is_member(id));
create policy "commish edits league" on public.leagues for update using (public.is_commish(id));
create policy "creator deletes league" on public.leagues for delete using (creator_id = auth.uid());

-- teams
create policy "members read teams" on public.teams for select using (public.is_member(league_id));
create policy "commish creates teams" on public.teams for insert with check (public.is_commish(league_id));
create policy "commish edits teams" on public.teams for update using (public.is_commish(league_id));
create policy "commish deletes teams" on public.teams for delete using (public.is_commish(league_id));

-- members
create policy "members read members" on public.members for select using (public.is_member(league_id));
create policy "players edit own profile" on public.members for update using (user_id = auth.uid());
create policy "leave or remove" on public.members for delete using (
  (user_id = auth.uid() and not is_commissioner)
  or (public.is_commish(league_id) and user_id <> auth.uid())
);

-- games
create policy "members read games" on public.games for select using (public.is_member(league_id));
create policy "commish creates games" on public.games for insert with check (public.is_commish(league_id));
create policy "commish edits games" on public.games for update using (public.is_commish(league_id));
create policy "commish deletes games" on public.games for delete using (public.is_commish(league_id));

-- stat lines
create policy "members read stats" on public.stat_lines for select using (public.is_member(league_id));
create policy "players log own stats" on public.stat_lines for insert with check (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid() and m.league_id = stat_lines.league_id)
);
create policy "players edit own stats" on public.stat_lines for update using (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
);
create policy "players or commish delete stats" on public.stat_lines for delete using (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  or public.is_commish(league_id)
);

-- news
create policy "members read news" on public.news for select using (public.is_member(league_id));
create policy "commish posts news" on public.news for insert with check (public.is_commish(league_id) and kind = 'announcement');
create policy "commish deletes news" on public.news for delete using (public.is_commish(league_id));

-- trades: completed trades are public to the league; pending ones only to the two captains + commish
create policy "read trades" on public.trades for select using (
  public.is_member(league_id) and (
    status = 'accepted'
    or public.is_commish(league_id)
    or public.is_captain_of(proposer_team_id)
    or public.is_captain_of(receiver_team_id)
  )
);
create policy "read trade players" on public.trade_players for select using (
  exists (select 1 from public.trades t where t.id = trade_id)
);

-- notifications
create policy "read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "update own notifications" on public.notifications for update using (user_id = auth.uid());
create policy "delete own notifications" on public.notifications for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Realtime (live notification bell)
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------
-- Storage: profile pictures
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Team chat
-- ---------------------------------------------------------------------

create table if not exists public.team_messages (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  team_id    uuid not null references public.teams(id) on delete cascade,
  member_id  uuid references public.members(id) on delete set null,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists team_messages_team_created on public.team_messages (team_id, created_at desc);

-- Are you currently on this team? (Traded players lose access to the old chat.)
create or replace function public.is_on_team(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where team_id = p_team and user_id = auth.uid());
$$;

alter table public.team_messages enable row level security;
revoke update on public.team_messages from anon, authenticated;

drop policy if exists "teammates read chat" on public.team_messages;
create policy "teammates read chat" on public.team_messages for select
  using (public.is_on_team(team_id));

drop policy if exists "teammates post chat" on public.team_messages;
create policy "teammates post chat" on public.team_messages for insert
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_id and m.user_id = auth.uid() and m.team_id = team_messages.team_id
    )
    and league_id = (select t.league_id from public.teams t where t.id = team_id)
  );

drop policy if exists "delete own message" on public.team_messages;
create policy "delete own message" on public.team_messages for delete
  using (exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));

-- Live updates.
do $$
begin
  alter publication supabase_realtime add table public.team_messages;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';


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
