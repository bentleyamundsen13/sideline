import Link from "next/link";
import { ArrowLeftRight, BarChart3, Bell, ChevronRight, LayoutGrid, Pencil, Settings, Shield, User } from "lucide-react";
import { getLeagueContext } from "@/lib/league";
import { TeamTheme } from "@/components/team-theme";
import { Avatar, OvrBadge, PositionLine } from "@/components/ui";
import { LeagueCodeCard } from "@/components/league-code-card";
import { InstallMenuButton } from "@/components/install-menu-button";
import { PushToggle } from "@/components/push-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { FREE_AGENT_COLOR } from "@/lib/constants";

export const metadata = { title: "You" };

export default async function YouPage({ params }: PageProps<"/l/[leagueId]/me">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { me, myTeam, captainTeam, league, ovrByMember, statsByMember, supabase, incomingTrades: pendingTrades } = ctx;
  const base = `/l/${leagueId}`;
  const color = myTeam?.color ?? FREE_AGENT_COLOR;
  const games = statsByMember.get(me.id)?.games ?? 0;

  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("league_id", leagueId)
    .is("read_at", null);

  const rows = [
    { href: `${base}/players/${me.id}`, icon: User, label: "My profile", sub: "Stats, game log, bio" },
    ...(myTeam ? [{ href: `${base}/teams/${myTeam.id}`, icon: Shield, label: myTeam.name, sub: captainTeam ? "Your team · Captain" : "Your team" }] : []),
    { href: `${base}/trades`, icon: ArrowLeftRight, label: "Trades", sub: captainTeam ? "Offers, counters and history" : "Completed trades", badge: pendingTrades ?? 0 },
    { href: `${base}/notifications`, icon: Bell, label: "Notifications", badge: unreadNotifications ?? 0 },
    ...(me.is_commissioner ? [{ href: `${base}/manage`, icon: Settings, label: "Manage League", sub: "Teams, captains, schedule, news" }] : []),
    { href: "/", icon: LayoutGrid, label: "Switch league" },
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      <TeamTheme color={myTeam?.color ?? null} />

      <Link
        href={`${base}/players/${me.id}`}
        className="card relative overflow-hidden flex items-center gap-4 p-4"
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${color} 35%, transparent), transparent 70%)` }} />
        <Avatar member={me} color={color} size="lg" className="relative" />
        <div className="relative flex-1 min-w-0">
          <div className="display text-2xl leading-tight truncate">{me.display_name}</div>
          <div className="text-xs text-muted truncate mt-0.5">
            {myTeam?.name ?? "Free Agent"}
            {captainTeam && " · Captain"}
            {me.is_commissioner && " · Commissioner"}
          </div>
          <div className="text-xs text-muted truncate">
            <PositionLine member={me} />
          </div>
        </div>
        <OvrBadge ovr={ovrByMember.get(me.id) ?? null} className="relative" />
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`${base}/me/stats`} className="btn btn-accent !py-3.5">
          <BarChart3 size={17} /> Log a Game
        </Link>
        <Link href={`${base}/me/edit`} className="btn btn-secondary !py-3.5">
          <Pencil size={16} /> Edit Profile
        </Link>
      </div>
      {games === 0 && <p className="text-xs text-muted text-center -mt-2">Log a game to get your OVR.</p>}

      <InstallMenuButton />
      <PushToggle />

      <div className="card divide-y divide-line overflow-hidden">
        {rows.map(({ href, icon: Icon, label, sub, badge }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors">
            <Icon size={19} className="text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{label}</div>
              {sub && <div className="text-xs text-muted truncate">{sub}</div>}
            </div>
            {!!badge && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-danger text-white text-[11px] font-bold inline-flex items-center justify-center">
                {badge}
              </span>
            )}
            <ChevronRight size={18} className="text-muted shrink-0" />
          </Link>
        ))}
      </div>

      <LeagueCodeCard code={league.code} leagueName={league.name} />

      <SignOutButton className="btn btn-ghost w-full" />
    </div>
  );
}
