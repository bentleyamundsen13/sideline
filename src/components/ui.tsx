import Link from "next/link";
import type { ReactNode } from "react";
import { initials, textOn } from "@/lib/format";
import { ovrTier } from "@/lib/ovr";
import type { Member, Team } from "@/lib/types";
import { FREE_AGENT_COLOR } from "@/lib/constants";
import { BALL_PATH, BRAND, INK } from "@/lib/logo-svg";

/** The Sideline mark (see src/lib/logo-svg.ts for the shared geometry). */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={BRAND} />
      <g transform="rotate(-35 16 16)">
        <path d={BALL_PATH} fill={INK} />
        <path d="M11 16 H21" stroke={BRAND} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12.8 13.6 V18.4 M16 13.6 V18.4 M19.2 13.6 V18.4" stroke={BRAND} strokeWidth="1.7" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Logo />
      <span className="display text-2xl tracking-wide">Sideline</span>
    </span>
  );
}

const sizes = { xs: 24, sm: 36, md: 44, lg: 64, xl: 112 } as const;

export function Avatar({
  member,
  color,
  size = "md",
  className = "",
}: {
  member: Pick<Member, "display_name" | "avatar_url">;
  color?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const px = sizes[size];
  const ring = color ?? FREE_AGENT_COLOR;
  const style = {
    width: px,
    height: px,
    boxShadow: `0 0 0 ${size === "xl" ? 3 : 2}px ${ring}`,
  };
  if (member.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatar_url}
        alt=""
        style={style}
        className={`shrink-0 rounded-full object-cover bg-surface-2 ${className}`}
      />
    );
  }
  return (
    <span
      style={{ ...style, background: ring, color: textOn(ring), fontSize: px * 0.38 }}
      className={`shrink-0 rounded-full inline-flex items-center justify-center display ${className}`}
    >
      {initials(member.display_name)}
    </span>
  );
}

const tierColor = {
  elite: "linear-gradient(135deg,#fde68a,#f59e0b)",
  great: "linear-gradient(135deg,#d9f99d,#84cc16)",
  good: "linear-gradient(135deg,#bae6fd,#38bdf8)",
  average: "linear-gradient(135deg,#e2e8f0,#94a3b8)",
  unrated: "var(--surface-2)",
};

export function OvrBadge({
  ovr,
  size = "md",
  className = "",
}: {
  ovr: number | null;
  size?: "sm" | "md" | "card" | "lg";
  className?: string;
}) {
  const tier = ovrTier(ovr);
  const dims = {
    sm: "w-9 h-9 text-base",
    md: "w-11 h-11 text-xl",
    card: "w-[3.25rem] h-[3.25rem] text-2xl",
    lg: "w-20 h-20 text-4xl",
  }[size];
  const showLabel = size === "lg" || size === "card";
  return (
    <span
      className={`${dims} shrink-0 rounded-xl inline-flex flex-col items-center justify-center display tabular ${className}`}
      style={{
        background: tierColor[tier],
        color: tier === "unrated" ? "var(--muted)" : "#0a0c10",
        border: tier === "unrated" ? "1px solid var(--line)" : undefined,
      }}
      title={ovr == null ? "Not rated yet. Log a game to get an OVR." : `Overall rating ${ovr}`}
    >
      {ovr ?? "–"}
      {showLabel && <span className="text-[9px] tracking-widest opacity-70 mt-0.5">OVR</span>}
    </span>
  );
}

export function TeamBadge({
  team,
  size = 40,
  className = "",
}: {
  team: Pick<Team, "abbr" | "color"> | null;
  size?: number;
  className?: string;
}) {
  const color = team?.color ?? FREE_AGENT_COLOR;
  return (
    <span
      className={`shrink-0 inline-flex items-center justify-center rounded-[28%] display ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 70%, black))`,
        color: textOn(color),
        fontSize: size * 0.36,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.18)`,
      }}
    >
      {team?.abbr ?? "FA"}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <h2 className="section-title">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card p-6 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="text-sm text-muted mt-1">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</div>
      <div className="display text-2xl mt-1 tabular">{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function PositionLine({ member }: { member: Pick<Member, "offense_position" | "defense_position" | "jersey_number"> }) {
  const parts = [
    member.jersey_number != null ? `#${member.jersey_number}` : null,
    [member.offense_position, member.defense_position].filter(Boolean).join(" / ") || null,
  ].filter(Boolean);
  return <>{parts.join(" · ") || "No positions set"}</>;
}

export function PlayerRow({
  member,
  team,
  ovr,
  href,
  isCaptain,
  right,
}: {
  member: Member;
  team: Team | null;
  ovr: number | null;
  href: string;
  isCaptain?: boolean;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Link href={href} className="flex items-center gap-3 min-w-0 flex-1 group">
        <Avatar member={member} color={team?.color} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold truncate group-hover:underline underline-offset-2">{member.display_name}</span>
            {isCaptain && (
              <span
                className="text-[10px] font-bold rounded px-1 leading-4"
                style={{ background: team?.color ?? "var(--brand)", color: textOn(team?.color ?? "#c8f135") }}
                title="Team captain"
              >
                C
              </span>
            )}
            {member.is_commissioner && (
              <span className="text-[10px] font-bold rounded px-1 leading-4 bg-surface-2 text-muted border border-line" title="Commissioner">
                COMM
              </span>
            )}
          </div>
          <div className="text-xs text-muted truncate">
            <PositionLine member={member} />
          </div>
        </div>
      </Link>
      {right}
      <OvrBadge ovr={ovr} />
    </div>
  );
}
