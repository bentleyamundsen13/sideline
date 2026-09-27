-- Sideline: league time zone, so game times read the same for everyone.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

alter table public.leagues add column if not exists timezone text;

-- The commissioner can set it (the app fills it in automatically from their phone).
grant update (timezone) on public.leagues to authenticated;

notify pgrst, 'reload schema';
