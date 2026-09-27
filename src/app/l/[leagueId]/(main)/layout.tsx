import Link from "next/link";
import { redirect } from "next/navigation";
import { getLeagueContext } from "@/lib/league";
import { NotificationBell } from "@/components/notification-bell";
import { BottomNav } from "@/components/bottom-nav";
import { Logo } from "@/components/ui";
import { RememberLeague } from "@/components/remember-league";
import { AutoPushPrompt } from "@/components/auto-push-prompt";

export default async function LeagueLayout({ children, params }: LayoutProps<"/l/[leagueId]">) {
  const { leagueId } = await params;
  const ctx = await getLeagueContext(leagueId);
  const { league, me, myTeam, incomingTrades } = ctx;
  if (!me.onboarded) redirect(`/l/${leagueId}/onboarding`);

  return (
    <>
      <RememberLeague leagueId={league.id} />
      <AutoPushPrompt />
      {/* Solid (not frosted) so iOS doesn't show a half-blurred bar under the clock. */}
      <header className="sticky top-0 z-40 bg-bg border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-3xl pl-4 pr-2 h-14 flex items-center gap-1">
          <Link href={`/l/${league.id}`} className="flex-1 min-w-0 flex items-center gap-2.5">
            <Logo size={24} />
            <span className="display text-xl truncate">{league.name}</span>
          </Link>
          <NotificationBell userId={me.user_id} leagueId={league.id} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-5 pb-nav">{children}</main>
      <BottomNav
        base={`/l/${league.id}`}
        me={{ id: me.id, display_name: me.display_name, avatar_url: me.avatar_url }}
        teamId={myTeam?.id ?? null}
        teamColor={myTeam?.color ?? null}
        youBadge={incomingTrades}
      />
    </>
  );
}
