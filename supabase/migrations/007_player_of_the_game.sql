-- Sideline: Player of the Game.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- The daily job announces each game's Player of the Game once.
alter table public.games add column if not exists potg_posted_at timestamptz;

notify pgrst, 'reload schema';
