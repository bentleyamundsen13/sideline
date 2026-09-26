// When you last looked at your team chat, per team, so the tab can show unread.
const key = (teamId: string) => `sideline-chat-seen-${teamId}`;
export const CHAT_SEEN_EVENT = "sideline:chat-seen";

export function getChatSeen(teamId: string): string {
  try {
    return localStorage.getItem(key(teamId)) ?? new Date(0).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

export function markChatSeen(teamId: string) {
  try {
    localStorage.setItem(key(teamId), new Date().toISOString());
  } catch {
    // private mode: unread badge just resets each visit
  }
  window.dispatchEvent(new Event(CHAT_SEEN_EVENT));
}
