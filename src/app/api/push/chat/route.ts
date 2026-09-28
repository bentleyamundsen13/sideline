import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { adminClient, pushConfigured, sendToUsers } from "@/lib/push-server";

// Pushes a chat message to everyone who can see it: teammates for a team chat,
// the whole league for the league chat. Only the person who wrote the message
// can trigger it, and they don't get pinged themselves.
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ sent: 0 });
  const user = await getAuthUser(await createClient());
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { messageId } = (await req.json().catch(() => ({}))) as { messageId?: string };
  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

  const admin = adminClient();
  const { data: msg } = await admin
    .from("team_messages")
    .select("id, body, image_url, sticker_url, team_id, league_id, author:members!team_messages_member_id_fkey(user_id, display_name)")
    .eq("id", messageId)
    .maybeSingle();
  const author = (msg?.author ?? null) as { user_id: string; display_name: string } | null;
  if (!msg || !author || author.user_id !== user.id) return NextResponse.json({ error: "Not your message" }, { status: 403 });

  const isTeam = msg.team_id !== null;
  const [{ data: place }, { data: recipients }] = await Promise.all([
    isTeam
      ? admin.from("teams").select("name").eq("id", msg.team_id).maybeSingle()
      : admin.from("leagues").select("name").eq("id", msg.league_id).maybeSingle(),
    (isTeam ? admin.from("members").select("user_id").eq("team_id", msg.team_id) : admin.from("members").select("user_id").eq("league_id", msg.league_id)).neq(
      "user_id",
      user.id,
    ),
  ]);

  const first = author.display_name.split(" ")[0];
  const text = msg.body ? (msg.body.length > 140 ? `${msg.body.slice(0, 137)}…` : msg.body) : null;
  const preview = msg.sticker_url ? "sent a sticker" : msg.image_url ? (text ? `📷 ${text}` : "📷 Photo") : text ?? "";
  const title = isTeam ? (place?.name ?? "Team chat") : `${place?.name ?? "League"} · League chat`;

  const sent = await sendToUsers(
    admin,
    req.nextUrl.origin,
    (recipients ?? []).map((r) => ({
      userId: r.user_id as string,
      payload: {
        title,
        body: msg.sticker_url ? `${first} ${preview}` : `${first}: ${preview}`,
        url: `/l/${msg.league_id}/chat?c=${isTeam ? "team" : "league"}`,
        tag: `chat-${msg.team_id ?? `league-${msg.league_id}`}`,
      },
    })),
  );
  return NextResponse.json({ sent });
}
