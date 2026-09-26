/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: string | string[] | undefined | null) {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
