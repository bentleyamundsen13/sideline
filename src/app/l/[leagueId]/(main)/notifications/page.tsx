import { getLeagueContext } from "@/lib/league";
import { NotificationsList } from "@/components/notifications-list";
import { EmptyState } from "@/components/ui";
import type { Notification } from "@/lib/types";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage({ params }: PageProps<"/l/[leagueId]/notifications">) {
  const { leagueId } = await params;
  const { supabase } = await getLeagueContext(leagueId);
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false })
    .limit(100);
  const items = (data ?? []) as Notification[];

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="display text-4xl">Notifications</h1>
      {items.length === 0 ? (
        <EmptyState title="Nothing yet" body="Drafts, trades and captain news will show up here." />
      ) : (
        <NotificationsList items={items} />
      )}
    </div>
  );
}
