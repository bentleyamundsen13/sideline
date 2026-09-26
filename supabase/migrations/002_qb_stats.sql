-- Sideline: QB passing stats.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

alter table public.stat_lines
  add column if not exists pass_completions int not null default 0 check (pass_completions between 0 and 200),
  add column if not exists pass_attempts    int not null default 0 check (pass_attempts between 0 and 200),
  add column if not exists pass_tds         int not null default 0 check (pass_tds between 0 and 50),
  add column if not exists ints_thrown      int not null default 0 check (ints_thrown between 0 and 50);

alter table public.stat_lines drop constraint if exists stat_lines_completions_le_attempts;
alter table public.stat_lines
  add constraint stat_lines_completions_le_attempts check (pass_completions <= pass_attempts);

-- New columns go at the end so the existing view can be replaced in place.
create or replace view public.member_stats with (security_invoker = true) as
select
  member_id,
  league_id,
  count(*)::int               as games,
  sum(touchdowns)::int        as touchdowns,
  sum(interceptions)::int     as interceptions,
  sum(fumbles)::int           as fumbles,
  sum(receptions)::int        as receptions,
  sum(drops)::int             as drops,
  sum(pass_completions)::int  as pass_completions,
  sum(pass_attempts)::int     as pass_attempts,
  sum(pass_tds)::int          as pass_tds,
  sum(ints_thrown)::int       as ints_thrown
from public.stat_lines
group by member_id, league_id;
