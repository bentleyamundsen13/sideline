# Sideline

Run your backyard league like the pros. Accounts, leagues with invite codes, player profiles,
teams with colors, captains, a draft, trades with counter offers, live notifications,
self-reported stats with an OVR rating, schedule, standings and a news feed.

Next.js 16 · Tailwind 4 · Supabase (Postgres, Auth, Storage, Realtime) · deploys to Vercel.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is plenty).
2. **Create the database:** Dashboard → SQL Editor → New query → paste all of
   [`supabase/schema.sql`](supabase/schema.sql) → Run.
3. **(Recommended) Turn off email confirmation** so friends can sign up instantly:
   Authentication → Sign In / Providers → Email → disable "Confirm email".
   If you leave it on, set Authentication → URL Configuration → Site URL to your Vercel URL
   and add `https://<your-app>.vercel.app/auth/callback` to Redirect URLs.
4. **Env vars:** copy `.env.example` to `.env.local` and fill in the Project URL and
   publishable (or anon) key from Project Settings → API.
5. `npm install` then `npm run dev` and open http://localhost:3000.

## Deploy to Vercel

Push to GitHub, import the repo in Vercel, add the same two env vars, deploy.

## How it works

| Who | Can do |
| --- | --- |
| Anyone signed in | Create a league, or join one with its 6-character code |
| Every player | Build a profile, log their own game stats, view any team or player |
| Commissioner (league creator) | Create/edit/delete teams, name captains, move players, schedule games and enter scores, post news |
| Captains | Draft free agents, propose trades, accept / decline / counter offers |

- New players land on **Free Agents** until drafted or assigned.
- Permission rules live in the database (row-level security + Postgres functions in
  `schema.sql`), so they hold even if someone pokes the API directly.
- Trades, drafts, captain picks and final scores automatically post to league news and send
  notifications. The bell updates live via Supabase Realtime.

### OVR

Computed in [`src/lib/ovr.ts`](src/lib/ovr.ts) from per-game averages:

```
60 + 8·TD + 12·INT + 4·PBU + 1.5·TKL + 2·REC − 6·FUM − 4·DROPS     (per game)
   + 8·PASS_TD − 8·INT_THROWN + 40·(CMP% − 55%)·volume            (if they threw)
```

`volume` ramps from 0 to 1 as a QB approaches 10 attempts per game.

## Upgrading an existing database

`schema.sql` always has everything. If your Supabase project was set up earlier, run any of
these you haven't yet (each is safe to run twice):

- [`002_qb_stats.sql`](supabase/migrations/002_qb_stats.sql): QB passing stats
- [`003_team_chat.sql`](supabase/migrations/003_team_chat.sql): team group chat
- [`004_rsvp_and_push.sql`](supabase/migrations/004_rsvp_and_push.sql): game RSVPs and push notifications
- [`005_forced_fumbles.sql`](supabase/migrations/005_forced_fumbles.sql): forced fumbles stat
- [`006_tackles.sql`](supabase/migrations/006_tackles.sql): tackles stat
- [`007_player_of_the_game.sql`](supabase/migrations/007_player_of_the_game.sql): Player of the Game announcements
- [`008_pass_breakups.sql`](supabase/migrations/008_pass_breakups.sql): pass breakups (replaces forced fumbles in the app)

## Push notifications

Add these to Vercel (Settings → Environment Variables), then redeploy:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: generate with `npx web-push generate-vapid-keys`
- `CRON_SECRET`: any long random string (protects the daily reminder job in `vercel.json`)
- `SUPABASE_SERVICE_ROLE_KEY`: already there if you used the Vercel Supabase integration

On iPhone, notifications only work in the home-screen app (iOS 16.4+). Players turn them on from the You tab.

Pulled toward 60 until a player has 3 games logged, clamped to 40–99. Tweak the weights there.
