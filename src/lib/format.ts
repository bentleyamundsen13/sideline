export function formatHeight(inches: number | null | undefined) {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function abbrFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return name.trim().slice(0, 3).toUpperCase();
}

/** Black or white, whichever reads better on the given hex color. */
export function textOn(hex: string) {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.35 ? "#0b0d12" : "#ffffff";
}

/** A calendar day like "2026-09-27" → "Sun, Sep 27", the same everywhere (no time zone involved). */
export function formatDay(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function recordString(r: { wins: number; losses: number; ties: number }) {
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;
}

export function errorMessage(e: unknown) {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  // Chrome / Safari / Firefox wording for "no connection".
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(msg)) {
    return "Couldn't connect. Check your signal and try again.";
  }
  return msg || "Something went wrong";
}
