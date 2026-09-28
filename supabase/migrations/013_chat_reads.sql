-- Sideline: chat "seen" state saved to your account, so reading a chat on one
-- device clears its unread badge on all of them.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- One row per person per chat: when they last had it open.
-- chat = the team id for a team chat, or 'league-<league id>' for the league chat.
create table if not exists public.chat_reads (
  member_id uuid not null references public.members(id) on delete cascade,
  chat      text not null,
  seen_at   timestamptz not null default now(),
  primary key (member_id, chat)
);

alter table public.chat_reads enable row level security;

drop policy if exists "read own chat reads" on public.chat_reads;
create policy "read own chat reads" on public.chat_reads for select
  using (exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
drop policy if exists "write own chat reads" on public.chat_reads;
create policy "write own chat reads" on public.chat_reads for insert
  with check (exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
drop policy if exists "update own chat reads" on public.chat_reads;
create policy "update own chat reads" on public.chat_reads for update
  using (exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));

-- Marks a chat read as of now (the server's clock, so every device agrees).
-- Runs as the caller, so the policies above still apply.
create or replace function public.mark_chat_seen(p_member uuid, p_chat text)
returns timestamptz
language sql
security invoker
set search_path = public
as $$
  insert into public.chat_reads (member_id, chat, seen_at)
  values (p_member, p_chat, now())
  on conflict (member_id, chat) do update set seen_at = greatest(chat_reads.seen_at, excluded.seen_at)
  returning seen_at;
$$;
grant execute on function public.mark_chat_seen(uuid, text) to authenticated;

-- Live updates: reading on your phone clears the badge on your computer right away.
do $$
begin
  alter publication supabase_realtime add table public.chat_reads;
exception when duplicate_object then null;
end $$;

-- Bell notifications: tell your other devices when something is marked read.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
