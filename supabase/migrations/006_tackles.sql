-- Sideline: tackles stat (flag pulls count).
-- Run once in Supabase: SQL Editor > New query > paste > Run.

alter table public.stat_lines
  add column if not exists tackles int not null default 0 check (tackles between 0 and 100);

-- New column goes at the end so the view can be replaced in place.
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
  sum(ints_thrown)::int       as ints_thrown,
  sum(forced_fumbles)::int    as forced_fumbles,
  sum(tackles)::int           as tackles
from public.stat_lines
group by member_id, league_id;

notify pgrst, 'reload schema';
