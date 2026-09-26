import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { adminClient, pushConfigured, sendToUsers } from "@/lib/push-server";

// Pushes a team chat message to the sender's teammates. Only the person who
// wrote the message can trigger it.
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ sent: 0 });
  const user = await getAuthUser(await createClient());
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { messageId } = (await req.json().catch(() => ({}))) as { messageId?: string };
  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

  const admin = adminClient();
  const { data: msg } = await admin
    .from("team_messages")
    .select("id, body, team_id, league_id, author:members!team_messages_member_id_fkey(user_id, display_name)")
    .eq("id", messageId)
    .maybeSingle();
  const author = (msg?.author ?? null) as { user_id: string; display_name: string } | null;
  if (!msg || author?.user_id !== user.id) return NextResponse.json({ error: "Not your message" }, { status: 403 });

  const [{ data: team }, { data: teammates }] = await Promise.all([
    admin.from("teams").select("name").eq("id", msg.team_id).maybeSingle(),
    admin.from("members").select("user_id").eq("team_id", msg.team_id).neq("user_id", user.id),
  ]);

  const body = msg.body.length > 140 ? `${msg.body.slice(0, 137)}…` : msg.body;
  const sent = await sendToUsers(
    admin,
    req.nextUrl.origin,
    (teammates ?? []).map((t) => ({
      userId: t.user_id as string,
      payload: {
        title: team?.name ?? "Team chat",
        body: `${author.display_name.split(" ")[0]}: ${body}`,
        url: `/l/${msg.league_id}/chat`,
        tag: `chat-${msg.team_id}`,
      },
    })),
  );
  return NextResponse.json({ sent });
}
