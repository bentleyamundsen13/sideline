"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { Avatar, OvrBadge, TeamBadge } from "./ui";
import { FormError } from "./form-error";

export type BuilderPlayer = { id: string; name: string; avatar_url: string | null; positions: string; ovr: number | null };
type MiniTeam = { id: string; name: string; abbr: string; color: string };

export function TradeBuilder({
  leagueId,
  myTeam,
  theirTeam,
  myPlayers,
  theirPlayers,
  initialSend,
  initialReceive,
  counterOf,
}: {
  leagueId: string;
  myTeam: MiniTeam;
  theirTeam: MiniTeam;
  myPlayers: BuilderPlayer[];
  theirPlayers: BuilderPlayer[];
  initialSend: string[];
  initialReceive: string[];
  counterOf: string | null;
}) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const [send, setSend] = useState(new Set(initialSend));
  const [receive, setReceive] = useState(new Set(initialReceive));
  const [message, setMessage] = useState("");

  const toggle = (set: Set<string>, update: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  };

  const ovrSum = (players: BuilderPlayer[], ids: Set<string>) =>
    players.filter((p) => ids.has(p.id)).reduce((a, p) => a + (p.ovr ?? 60), 0);

  async function submit() {
    const tradeId = await run(
      () =>
        must(
          createClient().rpc("propose_trade", {
            p_to_team: theirTeam.id,
            p_send: [...send],
            p_receive: [...receive],
            p_message: message,
            p_counter_of: counterOf,
          }),
        ) as Promise<string>,
      { refresh: false },
    );
    if (tradeId) {
      router.push(`/l/${leagueId}/trades/${tradeId}`);
      router.refresh();
    }
  }

  const ready = send.size > 0 && receive.size > 0;

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <Side
          title="You send"
          team={myTeam}
          players={myPlayers}
          selected={send}
          onToggle={(id) => toggle(send, setSend, id)}
          empty="No tradeable players on your roster."
        />
        <Side
          title="You get"
          team={theirTeam}
          players={theirPlayers}
          selected={receive}
          onToggle={(id) => toggle(receive, setReceive, id)}
          empty="They have no tradeable players."
        />
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Sending <span className="text-text font-semibold">{send.size}</span> · Getting{" "}
            <span className="text-text font-semibold">{receive.size}</span>
          </span>
          {ready && (
            <span className="text-xs text-muted tabular">
              OVR {ovrSum(myPlayers, send)} → {ovrSum(theirPlayers, receive)}
            </span>
          )}
        </div>
        <textarea
          className="input min-h-16"
          maxLength={280}
          placeholder={`Message to the ${theirTeam.name} captain (optional)`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <FormError error={error} />
        <button className="btn btn-accent w-full" disabled={!ready || pending} onClick={submit}>
          {pending ? "Sending…" : ready ? (counterOf ? "Send Counter Offer" : "Send Trade Offer") : "Pick players on both sides"}
        </button>
      </div>
    </div>
  );
}

function Side({
  title,
  team,
  players,
  selected,
  onToggle,
  empty,
}: {
  title: string;
  team: MiniTeam;
  players: BuilderPlayer[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  empty: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-1">
        <TeamBadge team={team} size={22} />
        <h2 className="section-title">
          {title} · {team.name}
        </h2>
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        {players.length === 0 && <p className="text-sm text-muted p-4">{empty}</p>}
        {players.map((p) => {
          const on = selected.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              aria-pressed={on}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
              style={on ? { background: `color-mix(in srgb, ${team.color} 16%, transparent)` } : undefined}
            >
              <span
                className="w-5 h-5 rounded-md border inline-flex items-center justify-center shrink-0"
                style={on ? { background: team.color, borderColor: team.color } : { borderColor: "var(--line)" }}
              >
                {on && <Check size={13} strokeWidth={3} color="#fff" />}
              </span>
              <Avatar member={{ display_name: p.name, avatar_url: p.avatar_url }} color={team.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{p.name}</div>
                <div className="text-xs text-muted truncate">{p.positions || "—"}</div>
              </div>
              <OvrBadge ovr={p.ovr} size="sm" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
