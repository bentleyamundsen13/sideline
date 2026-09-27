/**
 * Game times are shown in the league's time zone for everyone, like a real
 * schedule: a 4:00 PM game reads 4:00 PM whether you're home or traveling.
 * (Chat and "5m ago" stay in your own local time; those are moments, not a schedule.)
 */

/** Used until a league's time zone is set (set automatically from the commissioner's phone). */
export const DEFAULT_TZ = "America/Chicago";

export const US_TIME_ZONES = [
  { tz: "America/New_York", label: "Eastern" },
  { tz: "America/Chicago", label: "Central" },
  { tz: "America/Denver", label: "Mountain" },
  { tz: "America/Phoenix", label: "Arizona" },
  { tz: "America/Los_Angeles", label: "Pacific" },
  { tz: "America/Anchorage", label: "Alaska" },
  { tz: "Pacific/Honolulu", label: "Hawaii" },
];

export function leagueTz(league: { timezone?: string | null }) {
  return league.timezone || DEFAULT_TZ;
}

/** "Sun, Sep 27" in the league's time zone. */
export function formatGameDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
}

/** "4:00 PM" in the league's time zone. */
export function formatGameTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
}

/** "CDT", "EST", ... for a moment in a time zone. */
export function tzAbbreviation(tz: string, iso = new Date().toISOString()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(iso)).find((p) => p.type === "timeZoneName")?.value ?? tz;
}

/** A friendly name like "Central", or the raw zone for anything outside the US list. */
export function tzName(tz: string) {
  return US_TIME_ZONES.find((z) => z.tz === tz)?.label ?? tz.replace(/^.*\//, "").replace(/_/g, " ");
}

function wallClock(date: Date, tz: string) {
  const out: Record<string, number> = {};
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  for (const p of fmt.formatToParts(date)) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** How far a time zone is ahead of UTC at a given moment, in ms (DST-aware). */
function offsetMs(date: Date, tz: string) {
  const w = wallClock(date, tz);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(date.getTime() / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-09-27" + "16:00" as wall-clock time in `tz` → the real moment, as ISO. */
export function zonedToIso(date: string, time: string, tz: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Apply the zone's offset, then once more in case that crossed a DST change.
  let ts = asUtc - offsetMs(new Date(asUtc), tz);
  ts = asUtc - offsetMs(new Date(ts), tz);
  return new Date(ts).toISOString();
}

/** A moment → the date and time it reads on the clock in `tz` ("2026-09-27", "16:00"). */
export function isoToZoned(iso: string, tz: string) {
  const w = wallClock(new Date(iso), tz);
  return { date: `${w.year}-${pad(w.month)}-${pad(w.day)}`, time: `${pad(w.hour)}:${pad(w.minute)}` };
}
