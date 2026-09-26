import "server-only";
import webpush from "web-push";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./supabase/env";

export type PushPayload = { title: string; body?: string; url?: string; tag?: string };

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

export function pushConfigured() {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE && SERVICE_KEY && SUPABASE_URL);
}

/** Server-only client that bypasses row-level security. Never send this to the browser. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

let vapidSet = false;
function ensureVapid(origin: string) {
  if (vapidSet) return;
  // The "subject" tells push services who's sending; the site URL is enough.
  webpush.setVapidDetails(origin, VAPID_PUBLIC!, VAPID_PRIVATE!);
  vapidSet = true;
}

/** Sends one payload per user to every device they've turned notifications on for. */
export async function sendToUsers(admin: SupabaseClient, origin: string, messages: { userId: string; payload: PushPayload }[]) {
  if (!pushConfigured() || messages.length === 0) return 0;
  ensureVapid(origin);

  const userIds = [...new Set(messages.map((m) => m.userId))];
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, user_id, p256dh, auth").in("user_id", userIds);
  if (!subs?.length) return 0;

  const dead: string[] = [];
  let sent = 0;
  await Promise.all(
    messages.flatMap(({ userId, payload }) =>
      subs
        .filter((s) => s.user_id === userId)
        .map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify(payload),
              { TTL: 60 * 60 * 24, urgency: "high" },
            );
            sent++;
          } catch (e) {
            // 404/410: the phone turned notifications off or the app was removed.
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) dead.push(s.endpoint);
          }
        }),
    ),
  );
  if (dead.length) await admin.from("push_subscriptions").delete().in("endpoint", dead);
  return sent;
}

/**
 * Pushes any bell notifications that haven't gone to phones yet. Claiming them
 * with a single UPDATE ... RETURNING means two overlapping calls can't send the
 * same notification twice.
 */
export async function flushNotifications(origin: string) {
  if (!pushConfigured()) return 0;
  const admin = adminClient();
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: claimed } = await admin
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .is("pushed_at", null)
    .gte("created_at", since)
    .select("id, user_id, title, body, link, kind");
  if (!claimed?.length) return 0;

  return sendToUsers(
    admin,
    origin,
    claimed.map((n) => ({
      userId: n.user_id as string,
      payload: { title: n.title as string, body: (n.body as string | null) ?? undefined, url: (n.link as string | null) ?? "/open", tag: n.id as string },
    })),
  );
}
