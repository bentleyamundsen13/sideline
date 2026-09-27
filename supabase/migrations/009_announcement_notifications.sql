-- Sideline: commissioner announcements notify the whole league.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

create or replace function public.on_announcement_posted() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  if new.kind <> 'announcement' then return new; end if;
  select user_id into v_author from members where id = new.author_id;

  insert into notifications (user_id, league_id, kind, title, body, link)
  select m.user_id, new.league_id, 'announcement', '📣 ' || new.title,
         case when char_length(coalesce(new.body, '')) > 140 then left(new.body, 137) || '…' else new.body end,
         '/l/' || new.league_id
  from members m
  where m.league_id = new.league_id
    and m.user_id is distinct from v_author;
  return new;
end $$;

drop trigger if exists announcement_posted on public.news;
create trigger announcement_posted after insert on public.news
for each row execute function public.on_announcement_posted();
