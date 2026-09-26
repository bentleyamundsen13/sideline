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
60 + 8·TD + 12·INT + 2·REC − 6·FUM − 4·DROPS   (per game)
```

Pulled toward 60 until a player has 3 games logged, clamped to 40–99. Tweak the weights there.
