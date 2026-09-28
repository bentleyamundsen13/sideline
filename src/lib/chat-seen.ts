import { createClient } from "./supabase/client";

// When you last looked at each chat, so tabs can show unread counts.
// A chat is identified by its team id, or "league-<league id>" for the league chat.
// Saved to your account (chat_reads) so every device agrees; this device keeps a
// copy too so badges clear instantly.
export const CHAT_SEEN_EVENT = "sideline:chat-seen";

export const chatKey = (leagueId: string, teamId: string | null) => (teamId ? teamId : `league-${leagueId}`);

const storageKey = (key: string) => `sideline-chat-seen-${key}`;
const EPOCH = new Date(0).toISOString();

export function getChatSeen(key: string): string {
  try {
    return localStorage.getItem(storageKey(key)) ?? EPOCH;
  } catch {
    return EPOCH;
  }
}

/** Remembers a seen time on this device, if it's newer than what's there. */
export function rememberChatSeen(key: string, iso: string) {
  if (iso <= getChatSeen(key)) return;
  try {
    localStorage.setItem(storageKey(key), iso);
  } catch {
    // private mode: the account copy still works
  }
}

export function markChatSeen(key: string, memberId: string) {
  rememberChatSeen(key, new Date().toISOString());
  window.dispatchEvent(new Event(CHAT_SEEN_EVENT));
  void createClient()
    .rpc("mark_chat_seen", { p_member: memberId, p_chat: key })
    .then(({ data }) => {
      if (typeof data === "string") rememberChatSeen(key, new Date(data).toISOString());
    });
  closeSystemNotifications((tag) => tag === `chat-${key}`);
}

/** Clears this device's notification banners (in Notification Center) that match. */
export function closeSystemNotifications(match: (tag: string) => boolean) {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistration().then((reg) =>
    reg?.getNotifications().then((list) => list.forEach((n) => match(n.tag) && n.close())),
  );
}
