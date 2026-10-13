-- Sideline: commissioners can fix stats and set a player's OVR.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- Commissioners can correct anyone's logged stats (deleting was already allowed).
drop policy if exists "commish edits stats" on public.stat_lines;
create policy "commish edits stats" on public.stat_lines for update
  using (public.is_commish(league_id))
  with check (public.is_commish(league_id));

-- A commissioner-set OVR that replaces the one calculated from stats.
-- Players can't write this column (members' column grants don't include it);
-- it only changes through set_ovr_override below.
alter table public.members add column if not exists ovr_override smallint
  check (ovr_override is null or ovr_override between 40 and 99);

create or replace function public.set_ovr_override(p_member uuid, p_ovr smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league uuid;
begin
  select league_id into v_league from members where id = p_member;
  if v_league is null then raise exception 'Player not found'; end if;
  if not public.is_commish(v_league) then raise exception 'Only the commissioner can set OVR'; end if;
  if p_ovr is not null and (p_ovr < 40 or p_ovr > 99) then raise exception 'OVR must be between 40 and 99'; end if;
  update members set ovr_override = p_ovr where id = p_member;
end;
$$;
revoke execute on function public.set_ovr_override(uuid, smallint) from public, anon;
grant execute on function public.set_ovr_override(uuid, smallint) to authenticated;

notify pgrst, 'reload schema';
