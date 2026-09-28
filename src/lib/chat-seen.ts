// When you last looked at each chat, so tabs can show unread counts.
// A chat is identified by its team id, or "league-<league id>" for the league chat.
export const CHAT_SEEN_EVENT = "sideline:chat-seen";

export const chatKey = (leagueId: string, teamId: string | null) => (teamId ? teamId : `league-${leagueId}`);

const storageKey = (key: string) => `sideline-chat-seen-${key}`;

export function getChatSeen(key: string): string {
  try {
    return localStorage.getItem(storageKey(key)) ?? new Date(0).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

export function markChatSeen(key: string) {
  try {
    localStorage.setItem(storageKey(key), new Date().toISOString());
  } catch {
    // private mode: unread badge just resets each visit
  }
  window.dispatchEvent(new Event(CHAT_SEEN_EVENT));
}
