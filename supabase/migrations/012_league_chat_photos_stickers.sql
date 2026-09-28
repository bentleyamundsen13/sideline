-- Sideline: league-wide chat, photos and stickers in chat.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- ---------------------------------------------------------------------
-- League chat lives in the same table: team_id null = the whole league.
-- ---------------------------------------------------------------------
alter table public.team_messages alter column team_id drop not null;

-- Messages can be text, a photo, a sticker, or a photo with a caption.
alter table public.team_messages alter column body drop not null;
alter table public.team_messages drop constraint if exists team_messages_body_check;
alter table public.team_messages add column if not exists image_url text;
alter table public.team_messages add column if not exists sticker_url text;
alter table public.team_messages drop constraint if exists team_messages_has_content;
alter table public.team_messages add constraint team_messages_has_content check (
  (body is not null and char_length(btrim(body)) between 1 and 1000)
  or image_url is not null
  or sticker_url is not null
);
alter table public.team_messages drop constraint if exists team_messages_body_length;
alter table public.team_messages add constraint team_messages_body_length check (body is null or char_length(body) <= 1000);

create index if not exists team_messages_league_chat on public.team_messages (league_id, created_at desc) where team_id is null;

-- Team chat: only current teammates. League chat: everyone in the league.
drop policy if exists "teammates read chat" on public.team_messages;
drop policy if exists "read chat" on public.team_messages;
create policy "read chat" on public.team_messages for select using (
  (team_id is null and public.is_member(league_id))
  or (team_id is not null and public.is_on_team(team_id))
);

drop policy if exists "teammates post chat" on public.team_messages;
drop policy if exists "post chat" on public.team_messages;
create policy "post chat" on public.team_messages for insert with check (
  exists (
    select 1 from public.members m
    where m.id = member_id and m.user_id = auth.uid() and m.league_id = team_messages.league_id
      and (team_messages.team_id is null or m.team_id = team_messages.team_id)
  )
  and (team_id is null or league_id = (select t.league_id from public.teams t where t.id = team_id))
);

-- ---------------------------------------------------------------------
-- Stickers: made from photos, shared with everyone in the league.
-- ---------------------------------------------------------------------
create table if not exists public.stickers (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  member_id  uuid references public.members(id) on delete set null,
  name       text not null check (char_length(btrim(name)) between 1 and 30),
  image_url  text not null,
  created_at timestamptz not null default now()
);
create index if not exists stickers_league on public.stickers (league_id, created_at desc);

alter table public.stickers enable row level security;
revoke update on public.stickers from anon, authenticated;

drop policy if exists "members read stickers" on public.stickers;
create policy "members read stickers" on public.stickers for select using (public.is_member(league_id));
drop policy if exists "members make stickers" on public.stickers;
create policy "members make stickers" on public.stickers for insert with check (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid() and m.league_id = stickers.league_id)
);
drop policy if exists "delete own sticker or commish" on public.stickers;
create policy "delete own sticker or commish" on public.stickers for delete using (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  or public.is_commish(league_id)
);

-- ---------------------------------------------------------------------
-- Storage for chat photos and stickers: <league id>/<file>, members only.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "league members upload chat media" on storage.objects;
create policy "league members upload chat media" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and exists (
      select 1 from public.members m
      where m.user_id = auth.uid() and m.league_id::text = (storage.foldername(name))[1]
    )
  );
drop policy if exists "delete own chat media" on storage.objects;
create policy "delete own chat media" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-media' and owner = auth.uid());

notify pgrst, 'reload schema';
