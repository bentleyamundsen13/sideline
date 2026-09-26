-- Sideline: pass breakups (replaces forced fumbles in the app).
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- forced_fumbles stays in the table so nothing already logged is lost; the app
-- just no longer shows it or counts it toward OVR.

alter table public.stat_lines
  add column if not exists pass_breakups int not null default 0 check (pass_breakups between 0 and 50);

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
  sum(tackles)::int           as tackles,
  sum(pass_breakups)::int     as pass_breakups
from public.stat_lines
group by member_id, league_id;

notify pgrst, 'reload schema';
