-- Sideline: team group chat.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

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
