-- Sideline: "Roll New Teams". The commissioner reviews a generated set of teams
-- in the app, and only when they press Confirm does this replace the old ones.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- p_teams: [{ "name", "abbr", "color", "captain_id", "member_ids": [...] }, ...]
-- Everyone in the league not listed becomes a free agent.
-- Old teams with no games are removed; old teams with games keep their history
-- (they just end up with no players).
create or replace function public.apply_team_roll(p_league uuid, p_teams jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t jsonb;
  v_team uuid;
  v_ids uuid[];
  v_all uuid[] := '{}';
  v_captain uuid;
  v_names text := '';
begin
  if not is_commish(p_league) then raise exception 'Only the commissioner can roll teams'; end if;
  if jsonb_typeof(p_teams) <> 'array' or jsonb_array_length(p_teams) < 2 then
    raise exception 'Roll at least 2 teams';
  end if;

  -- Validate first: real players in this league, each on one team, captain on their own team.
  for t in select * from jsonb_array_elements(p_teams) loop
    v_ids := array(select (jsonb_array_elements_text(t->'member_ids'))::uuid);
    if coalesce(array_length(v_ids, 1), 0) = 0 then raise exception 'Every team needs at least one player'; end if;
    if exists (select 1 from unnest(v_ids) as x(mid) where not exists (select 1 from members m where m.id = x.mid and m.league_id = p_league)) then
      raise exception 'A player on these teams isn''t in this league';
    end if;
    if v_all && v_ids then raise exception 'A player is on two teams'; end if;
    v_all := v_all || v_ids;
    v_captain := nullif(t->>'captain_id', '')::uuid;
    if v_captain is not null and not (v_captain = any(v_ids)) then raise exception 'A captain has to be on their own team'; end if;
    if char_length(btrim(coalesce(t->>'name', ''))) < 2 then raise exception 'Every team needs a name'; end if;
  end loop;

  -- Clear the board: pending trades, captains, rosters, and old teams with no games.
  update trades set status = 'cancelled', resolved_at = now() where league_id = p_league and status = 'pending';
  update teams set captain_id = null where league_id = p_league;
  update members set team_id = null where league_id = p_league;
  delete from teams tm
  where tm.league_id = p_league
    and not exists (select 1 from games g where g.home_team_id = tm.id or g.away_team_id = tm.id);

  for t in select * from jsonb_array_elements(p_teams) loop
    begin
      insert into teams (league_id, name, abbr, color)
      values (p_league, btrim(t->>'name'), upper(btrim(t->>'abbr')), coalesce(t->>'color', '#2563eb'))
      returning id into v_team;
    exception when unique_violation then
      raise exception 'There''s already a team called "%". Pick another name.', btrim(t->>'name');
    end;
    v_ids := array(select (jsonb_array_elements_text(t->'member_ids'))::uuid);
    update members set team_id = v_team where id = any(v_ids);
    update teams set captain_id = nullif(t->>'captain_id', '')::uuid where id = v_team;

    insert into notifications (user_id, league_id, kind, title, body, link)
    select m.user_id, p_league, 'assigned', 'New teams: you''re on ' || btrim(t->>'name'),
      case when m.id = nullif(t->>'captain_id', '')::uuid then 'You''re the captain.' else 'The commissioner rolled new teams.' end,
      '/l/' || p_league || '/teams/' || v_team
    from members m where m.id = any(v_ids);

    v_names := v_names || case when v_names = '' then '' else ', ' end || btrim(t->>'name');
  end loop;

  insert into news (league_id, kind, title, body)
  values (p_league, 'transaction', 'New teams are set', 'Say hello to ' || v_names || '.');
end;
$$;
revoke execute on function public.apply_team_roll(uuid, jsonb) from public, anon;
grant execute on function public.apply_team_roll(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
