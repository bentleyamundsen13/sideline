-- Sideline: the commissioner can set any OVR they like (-999 to 9999), for fun.
-- Run once in Supabase: SQL Editor > New query > paste > Run. (Run 014 first.)

alter table public.members drop constraint if exists members_ovr_override_check;
alter table public.members add constraint members_ovr_override_check
  check (ovr_override is null or ovr_override between -999 and 9999);

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
  if p_ovr is not null and (p_ovr < -999 or p_ovr > 9999) then raise exception 'OVR must be between -999 and 9999'; end if;
  update members set ovr_override = p_ovr where id = p_member;
end;
$$;
revoke execute on function public.set_ovr_override(uuid, smallint) from public, anon;
grant execute on function public.set_ovr_override(uuid, smallint) to authenticated;

notify pgrst, 'reload schema';
