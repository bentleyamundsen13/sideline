import Link from "next/link";
import { ArrowRight, ArrowLeftRight, Bell, ChevronRight, Plus, Trophy, Users, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TeamBadge, Wordmark } from "@/components/ui";
import { SignOutButton } from "@/components/sign-out-button";
import type { League, Team } from "@/lib/types";

type MyLeagueRow = {
  id: string;
  onboarded: boolean;
  is_commissioner: boolean;
  leagues: Pick<League, "id" | "name" | "sport" | "season"> | null;
  teams: Pick<Team, "name" | "abbr" | "color"> | null;
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <Landing />;

  const { data } = await supabase
    .from("members")
    .select("id, onboarded, is_commissioner, leagues(id, name, sport, season), teams!members_team_id_fkey(name, abbr, color)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });
  const rows = (data ?? []) as unknown as MyLeagueRow[];

  return (
    <main className="mx-auto max-w-xl px-4 pt-6 pb-16">
      <header className="flex items-center justify-between">
        <Wordmark />
        <SignOutButton />
      </header>

      <section className="mt-10 animate-fade-up">
        <h1 className="display text-4xl">Your leagues</h1>
        <p className="text-muted mt-1 text-sm">{user.email}</p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link href="/join" className="card p-4 hover:bg-surface-2 transition-colors">
            <Users className="text-brand" size={22} />
            <div className="display text-xl mt-3">Join League</div>
            <div className="text-xs text-muted mt-1">Got a code from a friend?</div>
          </Link>
          <Link href="/leagues/new" className="card p-4 hover:bg-surface-2 transition-colors">
            <Plus className="text-brand" size={22} />
            <div className="display text-xl mt-3">Create League</div>
            <div className="text-xs text-muted mt-1">Be the commissioner.</div>
          </Link>
        </div>

        <div className="mt-8 space-y-2">
          {rows.length === 0 && (
            <p className="text-sm text-muted text-center py-8">You&apos;re not in any leagues yet. Join one or start your own.</p>
          )}
          {rows.map((row) =>
            row.leagues ? (
              <Link
                key={row.id}
                href={`/l/${row.leagues.id}`}
                className="card flex items-center gap-3 p-3 hover:bg-surface-2 transition-colors"
              >
                <TeamBadge team={row.teams} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{row.leagues.name}</div>
                  <div className="text-xs text-muted truncate">
                    {[row.leagues.sport, row.leagues.season].filter(Boolean).join(" · ")}
                    {" · "}
                    {!row.onboarded ? "Finish your profile" : row.teams ? row.teams.name : "Free Agent"}
                    {row.is_commissioner && " · Commissioner"}
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            ) : null,
          )}
        </div>
      </section>
    </main>
  );
}

function Landing() {
  const features = [
    { icon: Trophy, title: "Standings & schedule", body: "Records, streaks, scores and upcoming games." },
    { icon: Zap, title: "Player ratings", body: "Log your stats after each game and earn your OVR." },
    { icon: ArrowLeftRight, title: "Draft & trade", body: "Captains draft free agents and work out trades." },
    { icon: Bell, title: "Live alerts", body: "Get pinged the second you're drafted or traded." },
  ];
  return (
    <main className="mx-auto max-w-xl px-4 pt-6 pb-16">
      <header className="flex items-center justify-between">
        <Wordmark />
        <Link href="/login" className="btn btn-ghost btn-sm">
          Sign in
        </Link>
      </header>

      <section className="mt-16 animate-fade-up">
        <p className="chip">For backyard leagues</p>
        <h1 className="display text-6xl mt-4 leading-[0.9]">
          Your league.
          <br />
          <span className="text-brand">Run like the pros.</span>
        </h1>
        <p className="text-muted mt-5 max-w-md">
          Set up teams, draft your friends, talk trades, and track every touchdown. Everything your league needs,
          nothing it doesn&apos;t.
        </p>
        <div className="flex gap-3 mt-8">
          <Link href="/signup" className="btn btn-primary">
            Get started <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="btn btn-secondary">
            I have an account
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mt-14">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-4">
            <Icon size={20} className="text-brand" />
            <div className="font-semibold mt-3 text-sm">{title}</div>
            <div className="text-xs text-muted mt-1">{body}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
