import Link from "next/link";
import { redirect } from "next/navigation";
import { getLeagueContext } from "@/lib/league";
import { MenuDrawer } from "@/components/menu-drawer";
import { NotificationBell } from "@/components/notification-bell";
import { TeamBar } from "@/components/team-bar";
import { Logo } from "@/components/ui";

export default async function LeagueLayout({ children, params }: LayoutProps<"/l/[leagueId]">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { league, me, teams, members, captainTeam, myTeam, supabase } = ctx;
  if (!me.onboarded) redirect(`/l/${leagueId}/onboarding`);

  let pendingTrades = 0;
  if (captainTeam) {
    const { count } = await supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("receiver_team_id", captainTeam.id)
      .eq("status", "pending");
    pendingTrades = count ?? 0;
  }

  const freeAgentCount = members.filter((m) => m.onboarded && !m.team_id).length;

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-3xl px-2 h-14 flex items-center gap-1">
          <MenuDrawer
            leagueId={league.id}
            leagueName={league.name}
            leagueCode={league.code}
            me={{ id: me.id, display_name: me.display_name, avatar_url: me.avatar_url }}
            teamName={myTeam?.name ?? null}
            teamColor={myTeam?.color ?? null}
            ovr={ctx.ovrByMember.get(me.id) ?? null}
            isCommish={me.is_commissioner}
            captainOf={captainTeam?.name ?? null}
            pendingTrades={pendingTrades}
          />
          <Link href={`/l/${league.id}`} className="flex-1 min-w-0 flex items-center gap-2 px-1">
            <Logo size={22} />
            <span className="display text-xl truncate">{league.name}</span>
          </Link>
          <NotificationBell userId={me.user_id} leagueId={league.id} />
        </div>
        <TeamBar
          leagueId={league.id}
          teams={teams.map((t) => ({ id: t.id, name: t.name, abbr: t.abbr, color: t.color }))}
          freeAgentCount={freeAgentCount}
        />
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-5 pb-24">{children}</main>
    </>
  );
}
