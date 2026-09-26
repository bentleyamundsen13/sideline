import Link from "next/link";
import { Crown } from "lucide-react";
import { FREE_AGENT_COLOR, FREE_AGENTS_ID } from "@/lib/constants";
import type { Member, Team } from "@/lib/types";
import { Avatar, OvrBadge, TeamBadge } from "./ui";

/**
 * Player card header. The OVR sits on the photo's corner like a trading card,
 * leaving the top-right corner for the big faded jersey number.
 */
export function PlayerHero({
  player,
  team,
  ovr,
  isCaptain,
  base,
}: {
  player: Member;
  team: Team | null;
  ovr: number | null;
  isCaptain: boolean;
  base: string;
}) {
  const color = team?.color ?? FREE_AGENT_COLOR;
  return (
    <section className="card overflow-hidden relative">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 50%, transparent), transparent 70%)` }}
      />
      {player.jersey_number != null && (
        <div
          className="absolute right-4 -top-3 display text-[8.5rem] sm:text-[10rem] leading-none opacity-10 select-none pointer-events-none tabular"
          aria-hidden="true"
        >
          {player.jersey_number}
        </div>
      )}
      {/* Phone: photo on top, name full-width below. Wider: side by side. */}
      <div className="relative p-5 pb-4 flex flex-col sm:flex-row sm:items-end gap-5">
        <div className="relative w-fit shrink-0 sm:mr-4">
          <Avatar member={player} color={color} size="xl" />
          <OvrBadge ovr={ovr} size="card" className="absolute -bottom-1 -right-6 ring-4 ring-[var(--surface)] shadow-lg" />
        </div>
        <div className="min-w-0 flex-1 pb-1">
          {player.nickname && <div className="text-sm text-text/70 italic">&ldquo;{player.nickname}&rdquo;</div>}
          <h1 className="display text-4xl leading-[0.95] text-balance break-words">{player.display_name}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {player.jersey_number != null && <span className="chip !text-text">#{player.jersey_number}</span>}
            {player.offense_position && <span className="chip">OFF · {player.offense_position}</span>}
            {player.defense_position && <span className="chip">DEF · {player.defense_position}</span>}
            {isCaptain && (
              <span className="chip" style={{ color: "var(--text)", borderColor: color }}>
                <Crown size={11} /> Captain
              </span>
            )}
            {player.is_commissioner && <span className="chip">Commissioner</span>}
          </div>
        </div>
      </div>
      <Link
        href={team ? `${base}/teams/${team.id}` : `${base}/teams/${FREE_AGENTS_ID}`}
        className="relative flex items-center gap-2.5 px-5 py-3 border-t border-white/10 bg-black/20 hover:bg-black/30 transition-colors"
      >
        <TeamBadge team={team} size={24} />
        <span className="text-sm font-semibold truncate">{team?.name ?? "Free Agent"}</span>
      </Link>
    </section>
  );
}
