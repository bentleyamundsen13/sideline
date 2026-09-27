-- Sideline: likes and comments on league news.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

create table if not exists public.news_likes (
  news_id    uuid not null references public.news(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  league_id  uuid not null references public.leagues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (news_id, member_id)
);

create table if not exists public.news_comments (
  id         uuid primary key default gen_random_uuid(),
  news_id    uuid not null references public.news(id) on delete cascade,
  member_id  uuid references public.members(id) on delete cascade,
  league_id  uuid not null references public.leagues(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists news_comments_news on public.news_comments (news_id, created_at);

alter table public.news_likes enable row level security;
alter table public.news_comments enable row level security;
revoke update on public.news_likes, public.news_comments from anon, authenticated;

-- Only yourself, only on posts in your league.
drop policy if exists "members read likes" on public.news_likes;
create policy "members read likes" on public.news_likes for select using (public.is_member(league_id));
drop policy if exists "like as yourself" on public.news_likes;
create policy "like as yourself" on public.news_likes for insert with check (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid() and m.league_id = news_likes.league_id)
  and exists (select 1 from public.news n where n.id = news_id and n.league_id = news_likes.league_id)
);
drop policy if exists "unlike your own" on public.news_likes;
create policy "unlike your own" on public.news_likes for delete using (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
);

drop policy if exists "members read comments" on public.news_comments;
create policy "members read comments" on public.news_comments for select using (public.is_member(league_id));
drop policy if exists "comment as yourself" on public.news_comments;
create policy "comment as yourself" on public.news_comments for insert with check (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid() and m.league_id = news_comments.league_id)
  and exists (select 1 from public.news n where n.id = news_id and n.league_id = news_comments.league_id)
);
drop policy if exists "delete own comment or commish" on public.news_comments;
create policy "delete own comment or commish" on public.news_comments for delete using (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  or public.is_commish(league_id)
);

-- Tell a post's author when someone else comments on it.
create or replace function public.on_news_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_title text;
  v_commenter text;
begin
  select n.author_id, n.title into v_author, v_title from news n where n.id = new.news_id;
  if v_author is null or v_author = new.member_id then return new; end if;
  select display_name into v_commenter from members where id = new.member_id;
  perform notify_member(v_author, 'news_comment', coalesce(v_commenter, 'Someone') || ' commented on your post',
    case when char_length(new.body) > 120 then left(new.body, 117) || '…' else new.body end,
    '/l/' || new.league_id);
  return new;
end $$;

drop trigger if exists news_comment_posted on public.news_comments;
create trigger news_comment_posted after insert on public.news_comments
for each row execute function public.on_news_comment();

notify pgrst, 'reload schema';
