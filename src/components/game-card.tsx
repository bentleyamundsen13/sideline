import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { formatGameDate, formatGameTime } from "@/lib/format";
import type { Game, Team } from "@/lib/types";
import type { RsvpInfo } from "@/lib/league";
import { TeamBadge } from "./ui";
import { RsvpBar } from "./rsvp-bar";

/** A game at a glance. Tapping it opens the game page (box score, who's playing). */
export function GameCard({
  game,
  home,
  away,
  leagueId,
  highlightTeamId,
  rsvp,
}: {
  game: Game;
  home: Team | undefined;
  away: Team | undefined;
  leagueId: string;
  highlightTeamId?: string | null;
  rsvp?: RsvpInfo;
}) {
  const final = game.status === "final";
  const homeWon = final && game.home_score! > game.away_score!;
  const awayWon = final && game.away_score! > game.home_score!;
  const mine = highlightTeamId && (game.home_team_id === highlightTeamId || game.away_team_id === highlightTeamId);

  const row = (team: Team | undefined, score: number | null, won: boolean, lost: boolean) => (
    <div className="flex items-center gap-3">
      <TeamBadge team={team ?? null} size={30} />
      <span className={`flex-1 min-w-0 truncate ${!team || lost ? "text-muted" : "font-semibold"}`}>{team?.name ?? "TBD"}</span>
      {final && <span className={`display text-2xl tabular ${lost ? "text-muted" : ""}`}>{score}</span>}
      {won && <span className="w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-text -mr-1" aria-label="Winner" />}
    </div>
  );

  return (
    <div className={`card relative p-3 hover:bg-surface-2 active:bg-surface-2 transition-colors ${mine ? "ring-1 ring-accent/50" : ""}`}>
      {/* Whole card opens the game; interactive bits below sit above this link. */}
      <Link
        href={`/l/${leagueId}/games/${game.id}`}
        className="absolute inset-0 rounded-[inherit]"
        aria-label={`${away?.name ?? "TBD"} at ${home?.name ?? "TBD"}, ${final ? "final" : formatGameDate(game.scheduled_at)}`}
      />
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted mb-2.5">
        <span>
          {game.week ? `Week ${game.week} · ` : ""}
          {formatGameDate(game.scheduled_at)}
        </span>
        <span className={`inline-flex items-center gap-0.5 ${final ? "text-text" : ""}`}>
          {final ? "Final" : formatGameTime(game.scheduled_at)}
          <ChevronRight size={13} className="text-muted -mr-1" />
        </span>
      </div>
      <div className="space-y-2">
        {row(away, game.away_score, awayWon, homeWon)}
        {row(home, game.home_score, homeWon, awayWon)}
      </div>
      {game.location && !final && (
        <div className="flex items-center gap-1 text-xs text-muted mt-2.5">
          <MapPin size={12} /> {game.location}
        </div>
      )}
      {rsvp && !final && (
        <div className="relative z-10">
          <RsvpBar info={rsvp} />
        </div>
      )}
    </div>
  );
}
